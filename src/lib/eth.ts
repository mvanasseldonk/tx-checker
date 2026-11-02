import {
  createPublicClient,
  decodeFunctionData,
  erc20Abi,
  formatEther,
  formatUnits,
  http,
  TransactionNotFoundError,
  TransactionReceiptNotFoundError,
  type Hash,
  type Hex,
  type PublicClient,
  type Transaction,
  type TransactionReceipt,
} from "viem";
import { mainnet } from "viem/chains";
import { contractName } from "./names";
import { eurPrice } from "./prices";
import { describeRevert } from "./revert";

/** What the transaction moves, as shown in the circle. */
export type EthValue =
  | { kind: "amount"; amount: number; symbol: string; eur: number | null }
  | { kind: "call"; name: string | null; address: string; ethSent: number };

export type EthStatus =
  | { kind: "final"; value: EthValue }
  | { kind: "included"; value: EthValue; progress: number; minutesToFinal: number }
  | { kind: "pending"; value: EthValue; cause: "fee" | "nonce" | null }
  | { kind: "failed"; value: EthValue; reason: string | null; feeEur: number | null }
  | { kind: "notFound" };

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
export async function lookupEth(hash: Hash): Promise<EthStatus> {
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

  if (receipt.status === "reverted") {
    const [value, reason, ethEur] = await Promise.all([
      describeValue(client, tx, at),
      revertReason(client, tx, receipt),
      eurPrice("ethereum", at),
    ]);
    const fee = Number(formatEther(receipt.gasUsed * receipt.effectiveGasPrice));
    return { kind: "failed", value, reason, feeEur: ethEur === null ? null : fee * ethEur };
  }

  const value = await describeValue(client, tx, at);
  if (receipt.blockNumber <= finalized.number) return { kind: "final", value };
  const finalAt = finalizedAt(at);
  const now = Date.now() / 1000;
  return {
    kind: "included",
    value,
    progress: Math.min(1, Math.max(0, (now - at) / (finalAt - at))),
    minutesToFinal: Math.max(1, Math.ceil((finalAt - now) / 60)),
  };
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

async function pending(client: PublicClient, tx: Transaction): Promise<EthStatus> {
  const [latest, confirmedNonce, value] = await Promise.all([
    client.getBlock({ blockTag: "latest" }),
    client.getTransactionCount({ address: tx.from, blockTag: "latest" }),
    describeValue(client, tx, null),
  ]);
  const maxFee = tx.maxFeePerGas ?? tx.gasPrice ?? 0n;
  const cause =
    confirmedNonce < tx.nonce
      ? "nonce"
      : latest.baseFeePerGas != null && maxFee < latest.baseFeePerGas
        ? "fee"
        : null;
  return { kind: "pending", value, cause };
}

/** An ETH or ERC-20 transfer as an amount, anything else as a contract call. */
async function describeValue(
  client: PublicClient,
  tx: Transaction,
  at: number | null,
): Promise<EthValue> {
  if (tx.input === "0x" || !tx.to) {
    const amount = Number(formatEther(tx.value));
    const price = await eurPrice("ethereum", at);
    return { kind: "amount", amount, symbol: "ETH", eur: price === null ? null : amount * price };
  }
  const token = await tokenTransfer(client, tx);
  if (token) {
    const price = await eurPrice(tx.to, at);
    return { ...token, kind: "amount", eur: price === null ? null : token.amount * price };
  }
  return {
    kind: "call",
    name: await contractName(tx.to),
    address: tx.to,
    ethSent: Number(formatEther(tx.value)),
  };
}

async function tokenTransfer(
  client: PublicClient,
  tx: Transaction,
): Promise<{ amount: number; symbol: string } | null> {
  if (!tx.to) return null;
  let raw: bigint;
  try {
    const call = decodeFunctionData({ abi: erc20Abi, data: tx.input });
    if (call.functionName === "transfer") raw = call.args[1];
    else if (call.functionName === "transferFrom") raw = call.args[2];
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
    return { amount: Number(formatUnits(raw, decimals)), symbol };
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
