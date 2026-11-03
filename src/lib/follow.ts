import type { TxStatus } from "./status";

type Kind = Exclude<TxStatus["kind"], "notFound" | "replaced">;

/** Pending can change at any block, and so can a transaction that is not final yet. */
function canChange(kind: Kind): boolean {
  return kind === "pending" || kind === "included";
}

/** A transaction that is final or failed will not change any more, and shows as a solid disc. */
export function isSettled(kind: Kind): boolean {
  return !canChange(kind);
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
