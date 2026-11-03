"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { shake } from "@/lib/motion";
import type { PasteState } from "@/lib/paste";
import { HomeWordmark } from "./brand/Brand";
import { CloseIcon } from "./icons";
import { PasteCircle } from "./PasteCircle";
import { TypeField } from "./TypeField";
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
  // Counts the times something was not recognised, so that it shakes "no" each time, also when the message stays.
  const [rejections, setRejections] = useState(initialInvalid ? 1 : 0);
  const [unreadable, setUnreadable] = useState(false);
  const [value, setValue] = useState("");
  // What shakes: the Paste circle, or the field of the type mode.
  const circle = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLDivElement>(null);

  const reject = useCallback(() => {
    setInvalid(true);
    setRejections((count) => count + 1);
  }, []);
  useEffect(() => {
    if (rejections > 0) shake(circle.current ?? field.current);
  }, [rejections]);

  const askFor = useCallback(
    (state: PasteState) => {
      if (state === "invalid") reject();
      else setInvalid(false);
      setUnreadable(state === "unreadable");
      setMode(state === "type" ? "type" : "paste");
    },
    [reject],
  );
  const { check, pasteFromClipboard } = usePaste({
    onEmpty: () => {
      setInvalid(false);
      setMode("type");
    },
    onInvalid: reject,
    onUnreadable: () => setUnreadable(true),
  });

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
            else reject();
          }}
        >
          <TypeField
            value={value}
            invalid={invalid}
            boxRef={field}
            onChange={(text) => {
              setValue(text);
              setInvalid(false);
            }}
            onPasteText={(text) => {
              setValue(text);
              check(text);
            }}
          />
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
      <Suspense fallback={null}>
        <AskedState onState={askFor} />
      </Suspense>
      <header className="absolute inset-x-0 top-5 mx-auto flex h-11 w-full max-w-md items-center px-6">
        <HomeWordmark />
      </header>
      <PasteCircle
        onClick={paste}
        invalid={invalid}
        describedBy={invalid ? "invalid" : unreadable ? "unreadable" : undefined}
        buttonRef={circle}
      />
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
            setInvalid(false);
            setUnreadable(false);
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
