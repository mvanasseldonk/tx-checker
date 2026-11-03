"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_MARK, MARKS } from "./config";

/**
 * A pill for choosing between the logo directions, on previews only (the layout leaves it out on
 * production). It sets data-mark on <html>, which the `.mark-variant` rules in globals.css turn into the
 * logo, and remembers the choice in localStorage. `?mark=a|b|c` in the URL picks one too, which makes it
 * linkable; PICK_MARK (config.ts) reads both in the head, before the first paint.
 */
const EVENT = "markchange";

function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  return () => window.removeEventListener(EVENT, notify);
}

export function MarkSwitch() {
  const current = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.mark ?? DEFAULT_MARK,
    () => DEFAULT_MARK,
  );

  function pick(key: string) {
    document.documentElement.setAttribute("data-mark", key);
    try {
      localStorage.setItem("mark", key);
    } catch {
      // Private mode: the choice then lasts until the page is closed.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <div
      role="group"
      aria-label="Logo direction"
      className="fixed bottom-3 left-1/2 z-50 flex h-11 -translate-x-1/2 items-center rounded-full bg-white/90 px-1 text-[15px] shadow-[0_6px_20px_-10px_rgba(16,19,24,0.35)] backdrop-blur"
    >
      {MARKS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => pick(key)}
          aria-pressed={current === key}
          aria-label={`Logo direction ${key.toUpperCase()}`}
          className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 font-medium uppercase transition-colors focus-visible:outline-2 focus-visible:outline-ink ${
            current === key ? "bg-ink text-white" : "text-muted"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
