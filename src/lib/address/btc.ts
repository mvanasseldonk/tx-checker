import { BACKUP_API, getJson, sentOutputs } from "../btc";
import { eurPriceNow } from "../prices";
import { hedged } from "./hedge";
import { briefly } from "./memo";
import { isTimeout, once, summarize, takeRecent, worthShowing } from "./rules";
import type { AddressActivity, Candidate, Direction } from "./types";

const SATS_PER_BTC = 1e8;
// mempool.space can take several seconds on an address it has not looked up before.
const TIMEOUT_MS = 8000;
const CACHE_MS = 5000;
// Slower than this and Blockstream is asked as well: the first answer wins.
const HEDGE_MS = 2500;

export type AddressTx = {
  txid: string;
  vin: { prevout: { scriptpubkey_address?: string } | null }[];
  vout: { scriptpubkey_address?: string; value: number }[];
  status: { confirmed: boolean; block_time?: number };
};

type Activity = Omit<Candidate, "amount"> & { sats: number };

/** The recent transactions of a Bitcoin address, newest first, minus incoming dust. */
export async function lookupBtcAddress(address: string): Promise<AddressActivity> {
  try {
    const activity = await recentTransactions(address);
    const price = once(() => eurPriceNow("bitcoin"));
    const shown = await takeRecent(activity, async ({ sats, ...tx }) => {
      const amount = sats / SATS_PER_BTC;
      if (tx.direction === "received" && !worthShowing(amount, await price(), true)) return null;
      return { ...tx, amount: { amount, symbol: "BTC" } };
    });
    return summarize("btc", shown, Date.now() / 1000);
  } catch (error) {
    // mempool.space gave up on an address with too much on it.
    if (isTimeout(error)) return { kind: "busy" };
    throw error;
  }
}

// mempool.space rate-limits per IP, so a burst of visits to one address asks it once. Kept short,
// so a new transaction shows up on the next visit. Not `'use cache'`: that would hide what an
// error was (a timeout means "too busy") and could keep a failure.
function recentTransactions(address: string): Promise<Activity[]> {
  return briefly(address, CACHE_MS, async () => {
    const path = `/address/${address}/txs`;
    // Blockstream does not list its pending transactions in a known order: with several pending
    // the newest may not come first. Only an answer that mempool.space is too slow for.
    const txs = await hedged(
      () => getJson<AddressTx[]>(path, TIMEOUT_MS),
      () => getJson<AddressTx[]>(path, TIMEOUT_MS, BACKUP_API),
      HEDGE_MS,
    );
    return newestFirst(txs ?? []).map((tx) => toActivity(tx, address));
  });
}

/**
 * mempool.space lists the unconfirmed transactions first, but oldest first, and then the
 * confirmed ones, newest first. The newest pending one is the last of the first group.
 */
export function newestFirst(txs: AddressTx[]): AddressTx[] {
  const pending = txs.filter((tx) => !tx.status.confirmed).reverse();
  return [...pending, ...txs.filter((tx) => tx.status.confirmed)];
}

/**
 * Sent when one of the inputs was this address. Not by the net amount: a transaction that sends
 * coins also pays the change back to the address.
 */
export function directionOf(tx: AddressTx, address: string): Direction {
  return tx.vin.some((input) => input.prevout?.scriptpubkey_address === address) ? "sent" : "received";
}

export function toActivity(tx: AddressTx, address: string): Activity {
  const direction = directionOf(tx, address);
  const sats =
    direction === "sent"
      ? sentOutputs(tx).sats
      : tx.vout
          .filter((output) => output.scriptpubkey_address === address)
          .reduce((sum, output) => sum + output.value, 0);
  return {
    id: tx.txid,
    direction,
    time: tx.status.confirmed ? (tx.status.block_time ?? null) : null,
    pending: !tx.status.confirmed,
    sats,
  };
}
