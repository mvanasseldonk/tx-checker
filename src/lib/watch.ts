import type { Candidate } from "./address/types";
import type { Chain } from "./detect";

/** How long an address is watched for a new transaction before the page stops and waits for a tap. */
export const WATCH_MINUTES = 30;

/** Seconds between lookups of an address: one block on ETH, SOL spared Helius credits, BTC blocks take ~10 min. */
export const WATCH_SECONDS: Record<Chain, number> = { eth: 12, sol: 5, btc: 30 };

// A newest transaction older than this is not what somebody who just paid is waiting for.
const RECENT_SECONDS = 60 * 60;

/** The query parameter that carries the transactions seen when the address was first opened. */
export const SEEN_PARAM = "seen";

/** Pending, or younger than an hour. Pending has no time yet: it is happening now. */
export function isRecent(candidate: Candidate, now: number): boolean {
  return candidate.time === null || now - candidate.time < RECENT_SECONDS;
}

/**
 * The transaction an address page shows: the newest one, when it is new (not among the `seen`
 * ones, however old it says it is) or recent. Otherwise null: nothing new yet.
 */
export function shownCandidate(
  candidates: Candidate[],
  seen: string[],
  now = Date.now() / 1000,
): Candidate | null {
  const [newest] = candidates;
  if (!newest) return null;
  return !seen.includes(newest.id) || isRecent(newest, now) ? newest : null;
}

/** The ids in the `seen` parameter, or null when the address is opened for the first time. */
export function parseSeen(param: string | string[] | undefined): string[] | null {
  if (typeof param !== "string") return null;
  // An empty parameter is a baseline too: an address without transactions.
  return param.split(",").filter(Boolean);
}

export function seenParam(ids: string[]): string {
  return ids.join(",");
}

/** When watching stops on its own (ms), given when it started. */
export function watchDeadline(startedAt: number): number {
  return startedAt + WATCH_MINUTES * 60_000;
}

/** Should the page still look at the address again at `now`? */
export function isWatching(startedAt: number, now: number): boolean {
  return now < watchDeadline(startedAt);
}

/** After this many looks in a row that failed, the page says it cannot reach the network. */
export const FAILURES_BEFORE_NOTICE = 3;

/** How many looks in a row have failed, once the next one has come back. */
export function countFailures(failures: number, failed: boolean): number {
  return failed ? failures + 1 : 0;
}

export function isStruggling(failures: number): boolean {
  return failures >= FAILURES_BEFORE_NOTICE;
}

/**
 * What an address page shows after a look: the new screen, unless the look failed and there is a
 * good screen to keep. Only the first look of a page may fail into "Try again".
 */
export function screenAfterLook<T>(failed: boolean, fresh: T, kept: T | null): T {
  return failed && kept !== null ? kept : fresh;
}
