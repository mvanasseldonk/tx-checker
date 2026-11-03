import { detectPaste } from "./detect";

/** What to do with what the Paste button got from the clipboard (or what was typed). */
export type PasteOutcome =
  | { kind: "open"; href: string }
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "unreadable" };

/** A transaction or address opens its page, nothing at all means typing, anything else is not recognised. */
export function decidePaste(text: string | null | undefined): PasteOutcome {
  if (!text?.trim()) return { kind: "empty" };
  const pasted = detectPaste(text);
  if (!pasted.ok) return { kind: "invalid" };
  return { kind: "open", href: `/${pasted.kind === "tx" ? "tx" : "address"}/${pasted.id}` };
}

/** What reading the clipboard gave: its text (possibly ""), or that the browser refused or failed to read it. */
export type ClipboardRead = { ok: true; text: string } | { ok: false; error?: string };

/** A failed read keeps the paste screen (try again), anything else is decided by its text. */
export function decideClipboard(read: ClipboardRead): PasteOutcome {
  return read.ok ? decidePaste(read.text) : { kind: "unreadable" };
}

/** The paste screen's states that another screen can ask for with `/?type`, `/?invalid` or `/?unreadable`. */
export const PASTE_STATES = ["type", "invalid", "unreadable"] as const;
export type PasteState = (typeof PASTE_STATES)[number];

/**
 * The clipboard's text, `{ ok: false }` when the read fails (denied, dismissed, or interrupted by iOS's own
 * "paste from" question), and an empty text when the clipboard is empty or the API is missing altogether: typing
 * is then the only way, so the caller goes straight to the type field. Call it straight from a click (iOS needs
 * the gesture).
 */
export async function readClipboard(): Promise<ClipboardRead> {
  const clipboard = typeof navigator === "undefined" ? undefined : navigator.clipboard;
  if (typeof clipboard?.readText !== "function") return { ok: true, text: "" };
  try {
    return { ok: true, text: (await clipboard.readText()) ?? "" };
  } catch (error) {
    return { ok: false, error: (error as { name?: string } | null)?.name ?? "error" };
  }
}

/*
 * EXPERIMENT #33 (temporary): retry the read once after a failed one. iOS shows its own "paste from…" question
 * while the page reads the clipboard; the read fails during it and the tap on "Allow" never reaches the page.
 * Whether WebKit lets a retry without a new tap through is what the experiment finds out. Remove (or keep, if it
 * works) together with `pasteDebug.ts` and `PasteDebug.tsx`.
 */

/** How long after a failed read the page may still retry it. */
export const RETRY_WINDOW_MS = 30_000;

/** Whether the page can be pasting into: in front and focused. */
export function isPageActive(): boolean {
  return typeof document !== "undefined" && document.hasFocus() && document.visibilityState === "visible";
}

export type RetryTrigger = "now" | "focus" | "visible";

let cancelPending: (() => void) | null = null;

/** Drops the pending retry, if any. A new tap on Paste, leaving the page and unmounting all call this. */
export function cancelClipboardRetry() {
  cancelPending?.();
}

/**
 * Retries the clipboard read once when the page is active again: after a tick if it already is, otherwise on the
 * next window `focus` or `visibilitychange` to visible, whichever comes first, within `windowMs`. Only one retry
 * is pending at a time (starting one drops the previous), and the returned function cancels it. Not a click
 * handler, so there is no user activation: it may well be refused, in which case `onRead` gets `{ ok: false }`.
 */
export function retryClipboard({
  windowMs = RETRY_WINDOW_MS,
  onTrigger,
  onRead,
  onGiveUp,
}: {
  windowMs?: number;
  /** The page is active and the read is about to start; `waitedMs` is the time since the retry was scheduled. */
  onTrigger?: (trigger: RetryTrigger, waitedMs: number) => void;
  onRead: (read: ClipboardRead) => void;
  /** No focus or visibility came within the window. */
  onGiveUp?: () => void;
}): () => void {
  cancelClipboardRetry();
  const startedAt = Date.now();
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let giveUpTimer: ReturnType<typeof setTimeout> | undefined;

  const teardown = () => {
    clearTimeout(timer);
    clearTimeout(giveUpTimer);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibility);
  };
  const cancel = () => {
    cancelled = true;
    teardown();
    if (cancelPending === cancel) cancelPending = null;
  };

  const fire = (trigger: RetryTrigger) => {
    teardown();
    const waitedMs = Date.now() - startedAt;
    timer = setTimeout(async () => {
      if (cancelled) return;
      onTrigger?.(trigger, waitedMs);
      const read = await readClipboard();
      if (cancelled) return;
      cancel();
      onRead(read);
    }, 0);
  };
  function onFocus() {
    fire("focus");
  }
  function onVisibility() {
    if (document.visibilityState === "visible") fire("visible");
  }

  cancelPending = cancel;
  if (isPageActive()) {
    fire("now");
  } else {
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    giveUpTimer = setTimeout(() => {
      if (cancelled) return;
      cancel();
      onGiveUp?.();
    }, windowMs);
  }
  return cancel;
}

/**
 * The top-right Paste button leaves the page when the read fails (to `/?unreadable`), and with it the hook that
 * would retry. So it leaves a note here, in module state that survives client navigation, and the paste screen
 * picks the retry up when it opens in that state.
 */
let handoffAt: number | null = null;

export function markRetryHandoff() {
  handoffAt = Date.now();
}

/** Time left of the retry window for a handed-over failure, or null if there is none (or it has run out). */
export function retryHandoffLeft(): number | null {
  if (handoffAt === null) return null;
  const left = RETRY_WINDOW_MS - (Date.now() - handoffAt);
  if (left <= 0) handoffAt = null;
  return left > 0 ? left : null;
}

/** The handed-over retry has been done (or was dropped): there is nothing left to pick up. */
export function clearRetryHandoff() {
  handoffAt = null;
}
