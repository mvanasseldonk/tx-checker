import type { Chain } from "../detect";
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

/**
 * Should an incoming transfer be shown? `price` is the euro price of one unit, null when unknown.
 * A coin without a known price may still be real (the price service can be down), but a token
 * nobody prices is spam.
 */
export function worthShowing(amount: number, price: number | null, isToken: boolean): boolean {
  if (amount <= 0) return false;
  if (price === null) return !isToken;
  return amount * price >= SPAM_EUR;
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

/** A lookup that ran into the provider's time limit: the address has too much going on. */
export function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}
