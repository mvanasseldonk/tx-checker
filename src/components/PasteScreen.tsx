"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { cancelClipboardRetry, type PasteState } from "@/lib/paste";
import { HomeWordmark } from "./brand/Brand";
import { CircleTransition } from "./CircleTransition";
import { ArrowRightIcon, ClipboardIcon, CloseIcon } from "./icons";
import { PasteDebug } from "./PasteDebug";
import { usePaste } from "./usePaste";

const INVALID_MESSAGE = "Not an ETH, SOL or BTC transaction or address";
const UNREADABLE_MESSAGE = "Couldn't read the clipboard. Tap Paste to try again.";

type Mode = "paste" | "type";

/**
 * Reads `/?type`, `/?invalid` or `/?unreadable`, which the Paste button on the other screens sends when the
 * clipboard was empty, not a hash or address, or could not be read, and takes the param off the URL again so that a refresh starts afresh. It renders
 * nothing, and sits in its own Suspense boundary so that the rest of the page stays prerendered.
 */
function AskedState({ onState }: { onState: (state: PasteState) => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const asked: PasteState | null = params.has("invalid")
    ? "invalid"
    : params.has("unreadable")
      ? "unreadable"
      : params.has("type")
        ? "type"
        : null;
  useEffect(() => {
    if (!asked) return;
    onState(asked);
    router.replace("/");
  }, [asked, onState, router]);
  return null;
}

export function PasteScreen({ initialInvalid = false }: { initialInvalid?: boolean }) {
  const [mode, setMode] = useState<Mode>("paste");
  const [invalid, setInvalid] = useState(initialInvalid);
  const [unreadable, setUnreadable] = useState(false);
  const [value, setValue] = useState("");

  const { check, pasteFromClipboard, resumeRetry } = usePaste({
    onEmpty: () => {
      setInvalid(false);
      setUnreadable(false);
      setMode("type");
    },
    onInvalid: () => {
      setUnreadable(false);
      setInvalid(true);
    },
    onUnreadable: () => setUnreadable(true),
  });
  const askFor = useCallback(
    (state: PasteState) => {
      setInvalid(state === "invalid");
      setUnreadable(state === "unreadable");
      setMode(state === "type" ? "type" : "paste");
      if (state === "unreadable") resumeRetry(); // EXPERIMENT #33: the retry of a failed top-right Paste
    },
    [resumeRetry],
  );

  /** Clears the line first, so that it is announced again when the next read fails too. */
  function paste() {
    setUnreadable(false);
    return pasteFromClipboard();
  }

  if (mode === "type") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-5 pb-8">
        <Suspense fallback={null}>
          <AskedState onState={askFor} />
        </Suspense>
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
            if (value.trim()) check(value);
            else setInvalid(true);
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
        <div className="mt-auto">
          <PasteDebug />
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-9 px-8 pb-20">
      <Suspense fallback={null}>
        <AskedState onState={askFor} />
      </Suspense>
      <header className="absolute inset-x-0 top-5 mx-auto flex h-11 w-full max-w-md items-center px-6">
        <HomeWordmark />
      </header>
      <CircleTransition>
        <button
          type="button"
          onClick={paste}
          aria-describedby={invalid ? "invalid" : unreadable ? "unreadable" : undefined}
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
        {unreadable && (
          <p id="unreadable" role="status" className="text-center text-[15px] text-balance text-muted">
            {UNREADABLE_MESSAGE}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            cancelClipboardRetry(); // typing instead: a late retry must not take the screen away
            setInvalid(false);
            setUnreadable(false);
            setMode("type");
          }}
          className="flex h-11 items-center px-3 text-[15px] text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
        >
          or type a hash or address
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-2">
        <PasteDebug />
      </div>
    </main>
  );
}
