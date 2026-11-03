"use client";

import { ClipboardIcon } from "./icons";
import { usePaste } from "./usePaste";

/** The paste button on the screens that show a result: one tap reads the clipboard and opens what is on it. */
export function PasteAgainButton() {
  const { pasteFromClipboard } = usePaste();
  return (
    <button
      type="button"
      onClick={pasteFromClipboard}
      aria-label="Paste another transaction or address"
      className="flex size-11 items-center justify-center rounded-full bg-ink text-white transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      <ClipboardIcon size={18} strokeWidth={1.8} />
    </button>
  );
}
