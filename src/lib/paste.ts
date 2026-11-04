import { detectPaste } from "./detect";

/** What to do with what the Paste button got from the clipboard (or what was typed). */
export type PasteOutcome =
  | { kind: "open"; href: string }
  | { kind: "empty" }
  | { kind: "invalid" }
  | { kind: "unreadable" };

/** A transaction, address or ENS name opens its page, nothing at all means typing, anything else is not recognised. */
export function decidePaste(text: string | null | undefined): PasteOutcome {
  if (!text?.trim()) return { kind: "empty" };
  const pasted = detectPaste(text);
  if (!pasted.ok) return { kind: "invalid" };
  // A name can hold emoji and the like: the page decodes what is encoded here.
  return { kind: "open", href: `/${pasted.kind === "tx" ? "tx" : "address"}/${encodeURIComponent(pasted.id)}` };
}

/** What reading the clipboard gave: its text (possibly ""), or that the browser refused or failed to read it. */
export type ClipboardRead = { ok: true; text: string } | { ok: false };

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
  } catch {
    return { ok: false };
  }
}
