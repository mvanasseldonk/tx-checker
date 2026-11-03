import { hedged } from "./address/hedge";
import { eurPrice } from "./prices";
import { detailAmount, type TxDetails, type TxStatus, type TxValue } from "./status";

const API = "https://mempool.space/api";
// Blockstream runs the same API (it is what mempool.space is built on).
export const BACKUP_API = "https://blockstream.info/api";
const SATS_PER_BTC = 1e8;
const FINAL_CONFIRMATIONS = 6;
const BLOCK_SECONDS = 600;
// mempool.space projects at most this many blocks; the last one holds everything beyond them.
const PROJECTED_BLOCKS = 8;
const TIMEOUT_MS = 2500;
const RETRY_MS = 400;
const SLOW_MS = 2000;
// Slower than this and Blockstream is asked as well: the first answer wins.
const HEDGE_MS = 1200;

type Output = { scriptpubkey_address?: string; value: number };

type BtcTransaction = {
  fee: number;
  weight: number;
  vin: { prevout: { scriptpubkey_address?: string } | null }[];
  vout: Output[];
  status: { confirmed: boolean; block_height?: number; block_time?: number };
};

/** A projected block: the lowest and highest fee rate (sat/vB) in it sit at both ends of `feeRange`. */
export type ProjectedBlock = { feeRange: number[] };

// A 404 (unknown transaction) is null; any other failure throws, so it is never taken for "not found".
async function get(path: string, timeout = TIMEOUT_MS, api = API, retry = true): Promise<Response | null> {
  const started = Date.now();
  const response = await fetch(`${api}${path}`, { signal: AbortSignal.timeout(timeout) }).catch((error: unknown) => {
    console.info(`${api}${path} gave no response after ${Date.now() - started} ms: ${String(error)}`);
    throw error;
  });
  // Slow answers are what turns a lookup into "too busy": leave a trace of them.
  if (Date.now() - started > SLOW_MS) console.info(`${api}${path} ${response.status} after ${Date.now() - started} ms`);
  // Rate limits and node hiccups pass quickly; one failed refresh shouldn't end the countdown.
  if ((response.status === 429 || response.status >= 500) && retry) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    return get(path, timeout, api, false);
  }
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`${api}${path} returned ${response.status}`);
  return response;
}

export async function getJson<T>(path: string, timeout?: number, api?: string): Promise<T | null> {
  return (await get(path, timeout, api))?.json() ?? null;
}

/**
 * A call both mempool.space and Blockstream can answer, as the first answer of the two. Blockstream
 * is only asked when mempool.space is slow or fails. Not for `/v1/...`: Blockstream does not have those.
 */
function getEither(path: string): Promise<Response | null> {
  return hedged(
    () => get(path),
    () => get(path, TIMEOUT_MS, BACKUP_API),
    HEDGE_MS,
  );
}

/** Looks up a Bitcoin mainnet transaction and what to tell the user about it. */
export async function lookupBtc(txid: string): Promise<TxStatus> {
  const tx: BtcTransaction | null = await (await getEither(`/tx/${txid}`))?.json() ?? null;
  if (!tx) return replacedOrNotFound(txid);

  const { block_height: height, block_time: time } = tx.status;
  const [price, confirmations] = await Promise.all([
    eurPrice("bitcoin", time ?? null),
    tx.status.confirmed && height !== undefined ? confirmationsOf(height) : 0,
  ]);
  const { value, details } = describe(tx, price);

  if (confirmations >= FINAL_CONFIRMATIONS) return { kind: "final", value, details };
  if (confirmations > 0) {
    return {
      kind: "included",
      value,
      details,
      progress: confirmations / FINAL_CONFIRMATIONS,
      secondsToFinal: (FINAL_CONFIRMATIONS - confirmations) * BLOCK_SECONDS,
    };
  }

  // The projection is a nicety: without it the transaction is still pending.
  const blocks = await getJson<ProjectedBlock[]>("/v1/fees/mempool-blocks").catch(() => null);
  const place = blocks ? placeInLine(tx.fee / (tx.weight / 4), blocks) : undefined;
  if (place === null) return { kind: "pending", value, details, cause: "fee" };
  return { kind: "pending", value, details, cause: null, blocksAway: place };
}

// A dropped transaction is just gone, but one replaced through RBF is remembered by what replaced it.
async function replacedOrNotFound(txid: string): Promise<TxStatus> {
  // Only mempool.space knows about replacements. Without them it is "not found", as before RBF was looked at.
  const rbf = await getJson<{ replacements: { tx: { txid: string } } | null }>(`/v1/tx/${txid}/rbf`).catch(() => null);
  // The tree's root is the newest version; for a transaction that replaced others, that is itself.
  const by = rbf?.replacements?.tx.txid;
  return by && by !== txid ? { kind: "replaced", by } : { kind: "notFound" };
}

async function confirmationsOf(blockHeight: number): Promise<number> {
  const tip = Number(await (await getEither("/blocks/tip/height"))?.text());
  // The tip can lag a block behind a transaction that was just mined.
  return Math.max(1, tip - blockHeight + 1);
}

/**
 * The projected block a fee rate (sat/vB) lands in, 1 being the next block. Null when it is too
 * low to be in any of them: the last block of a full projection holds all the rest, so it
 * says nothing about when.
 */
export function placeInLine(feeRate: number, blocks: ProjectedBlock[]): number | null {
  if (blocks.length === 0) return 1;
  const index = blocks.findIndex((block) => feeRate >= block.feeRange[0]);
  if (index === -1 || (blocks.length >= PROJECTED_BLOCKS && index === blocks.length - 1)) return null;
  return index + 1;
}

/**
 * What was sent and to whom. Change, outputs back to an input address, doesn't count, nor do
 * outputs without an address (OP_RETURN). If nothing is left, everything went back to the sender
 * and all outputs count. Which output is change is never guessed beyond this.
 */
export function sentOutputs(tx: Pick<BtcTransaction, "vin" | "vout">): {
  sats: number;
  addresses: string[];
} {
  const senders = new Set(tx.vin.map((input) => input.prevout?.scriptpubkey_address));
  const sent = tx.vout.filter(
    (output) => output.scriptpubkey_address && !senders.has(output.scriptpubkey_address),
  );
  const counted = sent.length > 0 ? sent : tx.vout;
  const addresses = counted.flatMap((output) => output.scriptpubkey_address ?? []);
  return {
    sats: counted.reduce((sum, output) => sum + output.value, 0),
    addresses: [...new Set(addresses)],
  };
}

function describe(tx: BtcTransaction, btcEur: number | null): { value: TxValue; details: TxDetails } {
  const { sats, addresses } = sentOutputs(tx);
  const amount = sats / SATS_PER_BTC;
  const fee = tx.fee / SATS_PER_BTC;
  const eur = (btc: number) => (btcEur === null ? null : btc * btcEur);
  const value = {
    kind: "amount" as const,
    amount,
    symbol: "BTC",
    eur: eur(amount),
    ...(addresses.length > 1 && { recipients: addresses.length }),
  };
  return {
    value,
    details: {
      from: tx.vin[0]?.prevout?.scriptpubkey_address ?? null,
      to: addresses.length === 1 ? { address: addresses[0], name: null, method: null } : null,
      amount: detailAmount(value, "BTC", btcEur),
      fee: { amount: fee, symbol: "BTC", eur: eur(fee) },
      time: tx.status.block_time ?? null,
    },
  };
}
