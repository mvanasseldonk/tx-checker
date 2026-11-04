"use client";

import { isCheckable } from "@/lib/motion";
import { ArrowRightIcon } from "./icons";

/**
 * The field of the type mode: the text, and the arrow that goes on with it. The arrow lights up (muted to ink,
 * with a slight scale) once the field holds a hash or address; it can be pressed before that too, to be told so.
 * `boxRef` is the pill, which shakes when the text is not recognised.
 */
export function TypeField({
  value,
  invalid,
  onChange,
  onPasteText,
  boxRef,
}: {
  value: string;
  invalid: boolean;
  onChange: (value: string) => void;
  onPasteText: (text: string) => void;
  boxRef?: React.Ref<HTMLDivElement>;
}) {
  const ready = isCheckable(value);
  return (
    <div
      ref={boxRef}
      className={`flex h-16 items-center gap-2 rounded-full bg-white pr-2 pl-6 shadow-[0_12px_32px_-16px_rgba(16,19,24,0.25)] ${
        invalid ? "outline-2 outline-danger/40" : ""
      }`}
    >
      <input
        type="text"
        aria-label="Transaction hash, address or explorer link"
        aria-invalid={invalid}
        aria-describedby={invalid ? "invalid" : undefined}
        placeholder="Hash, address or ENS name"
        autoFocus
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="go"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onPaste={(event) => {
          const pasted = event.clipboardData.getData("text");
          if (!pasted) return;
          event.preventDefault();
          onPasteText(pasted);
        }}
        className="h-12 min-w-0 flex-1 bg-transparent font-mono text-base text-ink outline-none placeholder:font-sans placeholder:text-hint"
      />
      <button
        type="submit"
        aria-label="Check"
        data-ready={ready}
        className={`flex size-12 flex-none items-center justify-center rounded-full text-white transition-[background-color,scale] duration-(--duration-base) ease-settle focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none ${
          ready ? "bg-ink active:scale-95" : "scale-90 bg-muted active:scale-[0.85]"
        }`}
      >
        <ArrowRightIcon />
      </button>
    </div>
  );
}
