/*
 * EXPERIMENT #33 (temporary): what the last paste attempt did, for the PO's phone test with `?debug=paste`.
 * Module-level, so it survives client navigation (the top-right button fails on one page and the paste screen
 * shows the retry). Remove together with the retry in `paste.ts` and `PasteDebug.tsx`.
 */

export type PasteAttempt = {
  /** The first read: "ok" or the error's name. */
  read: string;
  /** Whether the page had focus and was visible when the first read failed; null while unknown or not failed. */
  focus: boolean | null;
  /** When the retry ran ("now", "on focus after 2.3s"), "waiting" while it is pending, or why it did not. */
  retry: string | null;
  /** What the retry's read gave: its error's name, or "ok → <where it went>". */
  result: string | null;
};

let attempt: PasteAttempt | null = null;
const listeners = new Set<() => void>();

function set(next: PasteAttempt | null) {
  attempt = next;
  for (const listener of listeners) listener();
}

function update(change: Partial<PasteAttempt>) {
  if (attempt) set({ ...attempt, ...change });
}

export const pasteDebug = {
  /** A fresh tap on Paste. The first read's outcome follows with `read`. */
  start: () => set(null),
  read: (outcome: string) => set({ read: outcome, focus: null, retry: null, result: null }),
  failed: (focus: boolean) => update({ focus, retry: "waiting" }),
  retried: (when: string) => update({ retry: when }),
  retryResult: (result: string) => update({ result }),
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
  snapshot: (): PasteAttempt | null => attempt,
};

/** `read: NotAllowedError · focus: no · retry: on focus after 2.3s · NotAllowedError` */
export function formatAttempt(a: PasteAttempt): string {
  const parts = [`read: ${a.read}`];
  if (a.focus !== null) parts.push(`focus: ${a.focus ? "yes" : "no"}`);
  if (a.retry) parts.push(`retry: ${a.retry}`);
  if (a.result) parts.push(a.result);
  return parts.join(" · ");
}

export const sinceLabel = (ms: number) => `${(ms / 1000).toFixed(1)}s`;
