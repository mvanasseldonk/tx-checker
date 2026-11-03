import type { Chain } from "../detect";
import type { Price } from "../prices";
import type { AddressActivity, Candidate } from "./types";

/** How many transactions "Not this one?" lists. */
export const RECENT = 5;

// Incoming transfers worth less than this are noise: dust, spam, address poisoning.
const SPAM_EUR = 0.01;
/** Incoming SOL below this, with no token alongside it, is dust. */
export const SOL_DUST = 0.001;

// The 5th newest transaction being younger than this means the address is too busy to guess
// which transaction the user means. A starting point, to be tuned.
const BUSY_SECONDS: Record<Chain, number> = { eth: 10 * 60, sol: 10 * 60, btc: 60 * 60 };

// Tokens everybody knows: never taken for spam because the price service has nothing on them.
// ETH by contract (lowercase), SOL by mint.
const WELL_KNOWN: Record<Exclude<Chain, "btc">, Set<string>> = {
  eth: new Set([
    "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", // USDC
    "0xdac17f958d2ee523a2206206994597c13d831ec7", // USDT
    "0x6b175474e89094c44da98b954eedeac495271d0f", // DAI
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // WETH
    "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", // WBTC
  ]),
  sol: new Set([
    "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
  ]),
};

export function isWellKnownToken(chain: Exclude<Chain, "btc">, token: string): boolean {
  return WELL_KNOWN[chain].has(token);
}

/**
 * Should an incoming transfer be shown? `real` is true for a chain's own coin or a well-known
 * token. With a price, only its value counts. Without one, a real coin or token is kept, and so
 * is anything when the price service could not be asked: an outage must not hide a real
 * receive. Only a token that the price service has never heard of is spam.
 */
export function worthShowing(amount: number, price: Price, real: boolean): boolean {
  if (amount <= 0) return false;
  if (typeof price === "number") return amount * price >= SPAM_EUR;
  return price === "unavailable" || real;
}

/** Too busy to tell which transaction is meant: the 5th newest is still very recent. */
export function isBusy(chain: Chain, candidates: Candidate[], now: number): boolean {
  const fifth = candidates[RECENT - 1];
  if (!fifth) return false;
  // Pending has no time yet: it is happening now.
  return fifth.time === null || now - fifth.time < BUSY_SECONDS[chain];
}

/**
 * What to tell about an address, given its recent transactions (newest first, spam removed).
 * `seenSince` is how far back the provider's list reached when it was full, null when it went
 * all the way back: a full list that reaches back only minutes has a flood in it, so many that
 * five real ones may not have fit.
 */
export function summarize(
  chain: Chain,
  recent: Candidate[],
  now: number,
  seenSince: number | null = null,
): AddressActivity {
  const flooded = recent.length < RECENT && seenSince !== null && now - seenSince < BUSY_SECONDS[chain];
  if (flooded || isBusy(chain, recent, now)) return { kind: "busy" };
  if (recent.length === 0) return { kind: "empty" };
  return { kind: "found", candidates: recent };
}

/**
 * What `pick` makes of the first items (newest first) it does not turn down with null, up to
 * `want` of them. Items are checked in batches, in parallel, and checking stops once there are enough.
 */
export async function takeRecent<T, R>(
  items: T[],
  pick: (item: T) => Promise<R | null>,
  want = RECENT,
  batch = RECENT,
): Promise<R[]> {
  const picked: R[] = [];
  for (let start = 0; start < items.length && picked.length < want; start += batch) {
    const results = await Promise.all(items.slice(start, start + batch).map(pick));
    picked.push(...results.filter((result) => result !== null));
  }
  return picked.slice(0, want);
}

/**
 * Runs `load` the first time it is asked for, and hands every later caller the same answer. For a
 * price that only some transactions need: an address that is watched is looked up again every few
 * seconds, and must not ask the price service for what it does not use.
 */
export function once<T>(load: () => Promise<T>): () => Promise<T> {
  let answer: Promise<T> | undefined;
  return () => (answer ??= load());
}

/** A lookup that ran into the provider's time limit: the address has too much going on. */
export function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}
