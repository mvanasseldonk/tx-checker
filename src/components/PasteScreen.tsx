"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { detectPaste } from "@/lib/detect";
import { HomeWordmark } from "./brand/Brand";
import { CircleTransition } from "./CircleTransition";
import { ArrowRightIcon, ClipboardIcon, CloseIcon } from "./icons";

const INVALID_MESSAGE = "Not an ETH, SOL or BTC transaction or address";

type Mode = "paste" | "type";

export function PasteScreen({ initialInvalid = false }: { initialInvalid?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("paste");
  const [invalid, setInvalid] = useState(initialInvalid);
  const [value, setValue] = useState("");

  function check(text: string) {
    const pasted = detectPaste(text);
    if (!pasted.ok) {
      setInvalid(true);
      return;
    }
    router.push(`/${pasted.kind === "tx" ? "tx" : "address"}/${pasted.id}`);
  }

  async function pasteFromClipboard() {
    let text = "";
    try {
      text = (await navigator.clipboard?.readText()) ?? "";
    } catch {
      // Clipboard access denied or unsupported: fall back to typing.
    }
    if (text.trim()) {
      check(text);
    } else {
      setInvalid(false);
      setMode("type");
    }
  }

  if (mode === "type") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-5 pb-8">
        <header className="flex h-11 items-center">
          <button
            type="button"
            aria-label="Back"
            onClick={() => {
              setInvalid(false);
              setMode("paste");
            }}
            className="-ml-2.5 flex size-11 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
          >
            <CloseIcon />
          </button>
        </header>
        <form
          className="mt-[22vh] flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            check(value);
          }}
        >
          <div
            className={`flex h-16 items-center gap-2 rounded-full bg-white pr-2 pl-6 shadow-[0_12px_32px_-16px_rgba(16,19,24,0.25)] ${
              invalid ? "outline-2 outline-danger/40" : ""
            }`}
          >
            <input
              type="text"
              aria-label="Transaction hash, address or explorer link"
              aria-invalid={invalid}
              aria-describedby={invalid ? "invalid" : undefined}
              placeholder="Hash, txid or address"
              autoFocus
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              enterKeyHint="go"
              value={value}
              onChange={(event) => {
                setValue(event.target.value);
                setInvalid(false);
              }}
              onPaste={(event) => {
                const pasted = event.clipboardData.getData("text");
                if (!pasted) return;
                event.preventDefault();
                setValue(pasted);
                check(pasted);
              }}
              className="h-12 min-w-0 flex-1 bg-transparent font-mono text-base text-ink outline-none placeholder:font-sans placeholder:text-hint"
            />
            <button
              type="submit"
              aria-label="Check"
              className="flex size-12 flex-none items-center justify-center rounded-full bg-ink text-white transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <ArrowRightIcon />
            </button>
          </div>
          {invalid && (
            <p id="invalid" role="alert" className="text-center text-base font-medium text-balance text-danger">
              {INVALID_MESSAGE}
            </p>
          )}
        </form>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-9 px-8 pb-20">
      <header className="absolute inset-x-0 top-5 mx-auto flex h-11 w-full max-w-md items-center px-6">
        <HomeWordmark />
      </header>
      <CircleTransition>
        <button
          type="button"
          onClick={pasteFromClipboard}
          aria-describedby={invalid ? "invalid" : undefined}
          className={`flex size-52 flex-col items-center justify-center gap-3 rounded-full bg-ink text-white transition-[transform,box-shadow] duration-200 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-ink motion-reduce:transition-none ${
            invalid
              ? "shadow-[0_0_0_8px_rgba(163,35,27,0.16),0_24px_48px_-20px_rgba(16,19,24,0.45)]"
              : "shadow-[0_24px_48px_-20px_rgba(16,19,24,0.45)]"
          }`}
        >
          <ClipboardIcon size={32} strokeWidth={1.6} />
          <span className="display text-[26px]">Paste</span>
        </button>
      </CircleTransition>
      <div className="flex flex-col items-center gap-1">
        {invalid && (
          <p id="invalid" role="alert" className="text-center text-base font-medium text-balance text-danger">
            {INVALID_MESSAGE}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setInvalid(false);
            setMode("type");
          }}
          className="flex h-11 items-center px-3 text-[15px] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          or type a hash or address
        </button>
      </div>
    </main>
  );
}
