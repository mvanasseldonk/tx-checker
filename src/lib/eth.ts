import {
  createPublicClient,
  decodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type Transaction,
  type TransactionReceipt,
} from "viem";
import { mainnet } from "viem/chains";
import { methodName } from "./method";
import { contractName } from "./names";
import { eurPrice } from "./prices";
import { describeRevert } from "./revert";
import {
  detailAmount,
  type TxAmount,
  type TxDetails,
  type TxRecipient,
  type TxStatus,
  type TxValue,
} from "./status";

const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;
const BEACON_GENESIS = 1606824023;

let client: PublicClient | undefined;

function ethClient(): PublicClient {
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ALCHEMY_API_KEY is not set");
  client ??= createPublicClient({
    chain: mainnet,
    transport: http(`https://eth-mainnet.g.alchemy.com/v2/${key}`, { timeout: 2500 }),
  });
  return client;
}

/** Looks up an Ethereum mainnet transaction and what to tell the user about it. */
export async function lookupEth(hash: Hash): Promise<TxStatus> {
  const client = ethClient();
  const [tx, receipt] = await Promise.all([
    client.getTransaction({ hash }).catch(nullIf(TransactionNotFoundError)),
    client.getTransactionReceipt({ hash }).catch(nullIf(TransactionReceiptNotFoundError)),
  ]);
  if (!tx) return { kind: "notFound" };
  if (!receipt) return pending(client, tx);

  const [block, finalized] = await Promise.all([
    client.getBlock({ blockNumber: receipt.blockNumber }),
    client.getBlock({ blockTag: "finalized" }),
  ]);
  const at = Number(block.timestamp);
  const ethEur = eurPrice("ethereum", at);

  if (receipt.status === "reverted") {
    const [described, reason, fee] = await Promise.all([
      describeValue(client, tx, at, ethEur),
      revertReason(client, tx, receipt),
      feePaid(receipt, ethEur),
    ]);
    const details = await detailsOf(tx, described, fee, at, ethEur);
    return { kind: "failed", value: described.value, details, reason, feeEur: fee.eur };
  }

  const [described, fee] = await Promise.all([
    describeValue(client, tx, at, ethEur),
    feePaid(receipt, ethEur),
  ]);
  const { value } = described;
  const details = await detailsOf(tx, described, fee, at, ethEur);
  if (receipt.blockNumber <= finalized.number) return { kind: "final", value, details };
  const finalAt = finalizedAt(at);
  const now = Date.now() / 1000;
  return {
    kind: "included",
    value,
    details,
    progress: Math.min(1, Math.max(0, (now - at) / (finalAt - at))),
    secondsToFinal: Math.max(1, finalAt - now),
  };
}

type Described = { value: TxValue; to: TxRecipient | null };

/** The gas the receipt says was paid, in ETH and euros. */
async function feePaid(receipt: TransactionReceipt, ethEur: Promise<number | null>): Promise<TxAmount> {
  const amount = Number(formatEther(receipt.gasUsed * receipt.effectiveGasPrice));
  const price = await ethEur;
  return { amount, symbol: "ETH", eur: price === null ? null : amount * price };
}

async function detailsOf(
  tx: Transaction,
  { value, to }: Described,
  fee: TxAmount | null,
  time: number | null,
  ethEur: Promise<number | null>,
): Promise<TxDetails> {
  return { from: tx.from, to, amount: detailAmount(value, "ETH", await ethEur), fee, time };
}

/**
 * When a block is expected to be final. The chain finalizes the first slot of the epoch two
 * epochs behind the current one, so a block is final two epochs after the first epoch that
 * starts at or after it.
 */
function finalizedAt(blockTime: number): number {
  const epochSeconds = SLOTS_PER_EPOCH * SECONDS_PER_SLOT;
  const nextEpoch = Math.ceil((blockTime - BEACON_GENESIS) / epochSeconds);
  return BEACON_GENESIS + (nextEpoch + 2) * epochSeconds;
}

// No fee to show yet: gas is only charged once the transaction is in a block.
async function pending(client: PublicClient, tx: Transaction): Promise<TxStatus> {
  const ethEur = eurPrice("ethereum", null);
  const [latest, confirmedNonce, described] = await Promise.all([
    client.getBlock({ blockTag: "latest" }),
    client.getTransactionCount({ address: tx.from, blockTag: "latest" }),
    describeValue(client, tx, null, ethEur),
  ]);
  const maxFee = tx.maxFeePerGas ?? tx.gasPrice ?? 0n;
  const cause =
    confirmedNonce < tx.nonce
      ? "nonce"
      : latest.baseFeePerGas != null && maxFee < latest.baseFeePerGas
        ? "fee"
        : null;
  const details = await detailsOf(tx, described, null, null, ethEur);
  return { kind: "pending", value: described.value, details, cause };
}

/**
 * An ETH or ERC-20 transfer as an amount, anything else as a contract call. Also who it goes to:
 * the recipient of a transfer, the contract of a call.
 */
async function describeValue(
  client: PublicClient,
  tx: Transaction,
  at: number | null,
  ethEur: Promise<number | null>,
): Promise<Described> {
  if (tx.input === "0x" || !tx.to) {
    const amount = Number(formatEther(tx.value));
    const price = await ethEur;
    return {
      value: { kind: "amount", amount, symbol: "ETH", eur: price === null ? null : amount * price },
      to: tx.to && { address: tx.to, name: null, method: null },
    };
  }
  const token = await tokenTransfer(client, tx);
  if (token) {
    const price = await eurPrice({ platform: "ethereum", address: tx.to }, at);
    const { to, ...transfer } = token;
    return {
      value: { ...transfer, kind: "amount", eur: price === null ? null : token.amount * price },
      to: { address: to, name: null, method: null },
    };
  }
  const name = await contractName(tx.to);
  return {
    value: { kind: "call", name, address: tx.to, sent: Number(formatEther(tx.value)) },
    to: { address: tx.to, name, method: methodName(tx.input) },
  };
}

async function tokenTransfer(
  client: PublicClient,
  tx: Transaction,
): Promise<{ amount: number; symbol: string; to: Address } | null> {
  if (!tx.to) return null;
  let raw: bigint;
  let to: Address;
  try {
    const call = decodeFunctionData({ abi: erc20Abi, data: tx.input });
    if (call.functionName === "transfer") [to, raw] = call.args;
    else if (call.functionName === "transferFrom") [, to, raw] = call.args;
    else return null;
  } catch {
    return null;
  }
  try {
    const [symbol, decimals] = await client.multicall({
      contracts: [
        { address: tx.to, abi: erc20Abi, functionName: "symbol" },
        { address: tx.to, abi: erc20Abi, functionName: "decimals" },
      ],
      allowFailure: false,
    });
    return { amount: Number(formatUnits(raw, decimals)), symbol, to };
  } catch {
    // Not a standard ERC-20 token after all.
    return null;
  }
}

/**
 * Replays the failed transaction to read its revert reason. The state before its block misses
 * the transactions ahead of it in the block (often the ones that moved a price), so when that
 * replay succeeds, it tries the state at the end of the block too.
 */
async function revertReason(
  client: PublicClient,
  tx: Transaction,
  receipt: TransactionReceipt,
): Promise<string | null> {
  for (const blockNumber of [receipt.blockNumber - 1n, receipt.blockNumber]) {
    const reason = describeRevert(await replay(client, tx, blockNumber));
    if (reason) return reason;
  }
  return receipt.gasUsed * 100n >= tx.gas * 99n ? "Ran out of gas" : null;
}

async function replay(client: PublicClient, tx: Transaction, blockNumber: bigint): Promise<Hex | undefined> {
  try {
    await client.call({
      account: tx.from,
      to: tx.to,
      data: tx.input,
      value: tx.value,
      gas: tx.gas,
      blockNumber,
    });
    return undefined;
  } catch (error) {
    return revertData(error);
  }
}

function revertData(error: unknown): Hex | undefined {
  let current = error as { data?: unknown; cause?: unknown } | undefined;
  while (current) {
    const data =
      typeof current.data === "object" && current.data !== null
        ? (current.data as { data?: unknown }).data
        : current.data;
    if (typeof data === "string" && data.startsWith("0x")) return data as Hex;
    current = current.cause as typeof current;
  }
  return undefined;
}

function nullIf(type: new (...args: never[]) => Error) {
  return (error: unknown) => {
    if (error instanceof type) return null;
    throw error;
  };
}
