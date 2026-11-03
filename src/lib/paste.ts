import { detectPaste } from "./detect";

/** What to do with what the Paste button got from the clipboard (or what was typed). */
export type PasteOutcome =
  | { kind: "open"; href: string }
  | { kind: "empty" }
  | { kind: "invalid" };

/** A transaction or address opens its page, nothing at all means typing, anything else is not recognised. */
export function decidePaste(text: string | null | undefined): PasteOutcome {
  if (!text?.trim()) return { kind: "empty" };
  const pasted = detectPaste(text);
  if (!pasted.ok) return { kind: "invalid" };
  return { kind: "open", href: `/${pasted.kind === "tx" ? "tx" : "address"}/${pasted.id}` };
}

/** The paste screen's states that another screen can ask for with `/?type` or `/?invalid`. */
export const PASTE_STATES = ["type", "invalid"] as const;
export type PasteState = (typeof PASTE_STATES)[number];

/** The clipboard's text, or "" when it is empty, denied or unsupported. Call it straight from a click (iOS needs the gesture). */
export async function readClipboard(): Promise<string> {
  try {
    return (await navigator.clipboard?.readText()) ?? "";
  } catch {
    return "";
  }
}
