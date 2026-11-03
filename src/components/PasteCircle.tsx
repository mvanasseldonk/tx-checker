"use client";

import { CircleTransition } from "./CircleTransition";
import { ClipboardIcon } from "./icons";

/**
 * The big Paste button. It morphs into the status circle of the next page (`morph`), and shakes "no" through
 * `buttonRef` when what was pasted is not recognised; `invalid` rings it in red.
 */
export function PasteCircle({
  onClick,
  invalid,
  describedBy,
  morph = true,
  buttonRef,
}: {
  onClick: () => void;
  invalid: boolean;
  describedBy?: string;
  morph?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const button = (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-describedby={describedBy}
      className={`flex size-52 flex-col items-center justify-center gap-3 rounded-full bg-ink text-white transition-[transform,box-shadow] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-ink motion-reduce:transition-none ${
        invalid
          ? "shadow-[0_0_0_8px_rgba(163,35,27,0.16),0_24px_48px_-20px_rgba(16,19,24,0.45)]"
          : "shadow-[0_24px_48px_-20px_rgba(16,19,24,0.45)]"
      }`}
    >
      <ClipboardIcon size={32} strokeWidth={1.6} />
      <span className="display text-[26px]">Paste</span>
    </button>
  );
  return morph ? <CircleTransition>{button}</CircleTransition> : button;
}
