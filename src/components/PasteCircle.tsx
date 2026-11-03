"use client";

import { CircleTransition } from "./CircleTransition";
import { ClipboardIcon } from "./icons";

/**
 * The big Paste button. It morphs into the status circle of the next page (`morph`), and shakes "no" through
 * `buttonRef` when what was pasted is not recognised; `invalid` rings it in red.
 * While `pulse` is on it invites: a soft halo breathes out from behind it (3.6 s a cycle, transform and opacity only,
 * on a span inside the button, never on the element that morphs). The halo is gone while the button is pressed
 * and while it shakes, and it does not run at all under reduced motion.
 */
export function PasteCircle({
  onClick,
  invalid,
  describedBy,
  morph = true,
  pulse = false,
  buttonRef,
}: {
  onClick: () => void;
  invalid: boolean;
  describedBy?: string;
  morph?: boolean;
  pulse?: boolean;
  buttonRef?: React.Ref<HTMLButtonElement>;
}) {
  const button = (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-describedby={describedBy}
      className={`group relative isolate flex size-52 flex-col items-center justify-center gap-3 rounded-full bg-ink text-white transition-[transform,box-shadow] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-ink motion-reduce:transition-none ${
        invalid
          ? "shadow-[0_0_0_8px_rgba(163,35,27,0.16),0_24px_48px_-20px_rgba(16,19,24,0.45)]"
          : "shadow-[0_24px_48px_-20px_rgba(16,19,24,0.45)]"
      }`}
    >
      {pulse && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 rounded-full transition-opacity duration-(--duration-fast) group-active:opacity-0 group-data-shaking:opacity-0"
        >
          <span className="block size-full rounded-full bg-ink opacity-0 motion-safe:animate-breathe" />
        </span>
      )}
      <ClipboardIcon size={32} strokeWidth={1.6} />
      <span className="display text-[26px]">Paste</span>
    </button>
  );
  return morph ? <CircleTransition>{button}</CircleTransition> : button;
}
