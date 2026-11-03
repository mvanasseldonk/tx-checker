import type { TxStatus } from "./status";

type Kind = Exclude<TxStatus["kind"], "notFound" | "replaced">;

/** How long a Pending transaction is followed before the page stops and waits for a tap. */
export const PENDING_FOLLOW_MINUTES = 30;

/** Pending can change at any block, and so can a transaction that is not final yet. */
function canChange(kind: Kind): boolean {
  return kind === "pending" || kind === "included";
}

/** A transaction that is final or failed will not change any more, and shows as a solid disc. */
export function isSettled(kind: Kind): boolean {
  return !canChange(kind);
}

/**
 * When following stops on its own (ms), given when it started, or null when it only stops
 * once the status settles. Only Pending gives up: a transaction in a block will reach Final.
 */
export function followDeadline(kind: Kind, startedAt: number): number | null {
  return kind === "pending" ? startedAt + PENDING_FOLLOW_MINUTES * 60_000 : null;
}

/** Should the page still look the transaction up again at `now`? */
export function isFollowing(kind: Kind, startedAt: number, now: number): boolean {
  if (!canChange(kind)) return false;
  const deadline = followDeadline(kind, startedAt);
  return deadline === null || now < deadline;
}

/**
 * How the circle gets from one status to the next while the user watches:
 * "settle" completes the ring and fills it in as a disc, "draw" draws the ring in anew.
 */
export function circleChange(from: Kind, to: Kind): "settle" | "draw" | null {
  if (from === to) return null;
  if (isSettled(to)) return isSettled(from) ? null : "settle";
  return from === "pending" ? "draw" : null;
}
