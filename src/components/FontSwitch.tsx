"use client";

import { useSyncExternalStore } from "react";

/**
 * A switch between the typeface pairings, for previews only (the layout leaves it out on
 * production). It sets data-font on <html>, which globals.css turns into the pairing, and
 * remembers the choice in localStorage. `?font=a|b|c` in the URL picks one too, which makes it
 * linkable. The PO picks one, then this file, PICK_FONT, the data-font rules in globals.css and
 * the losing fonts in fonts.ts go.
 */
const PAIRINGS = [
  { key: "a", name: "Fraunces and Instrument Sans" },
  { key: "b", name: "Instrument Serif and Instrument Sans" },
  { key: "c", name: "Bricolage Grotesque" },
] as const;

const EVENT = "fontchange";

/** Runs in the head, before the first paint. */
export const PICK_FONT = `try{var p=new URLSearchParams(location.search).get("font");if(/^[abc]$/.test(p))localStorage.setItem("font",p);var f=localStorage.getItem("font");if(/^[abc]$/.test(f))document.documentElement.dataset.font=f}catch(e){}`;

function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  return () => window.removeEventListener(EVENT, notify);
}

export function FontSwitch() {
  const current = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.font ?? "a",
    () => "a",
  );

  function pick(key: string) {
    document.documentElement.setAttribute("data-font", key);
    try {
      localStorage.setItem("font", key);
    } catch {
      // Private mode: the choice then lasts until the page is closed.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <div
      role="group"
      aria-label="Typeface"
      className="fixed top-5 left-1/2 z-50 flex h-11 -translate-x-1/2 items-center rounded-full bg-white/90 px-1 text-[15px] shadow-[0_6px_20px_-10px_rgba(16,19,24,0.35)] backdrop-blur"
    >
      {PAIRINGS.map(({ key, name }) => (
        <button
          key={key}
          type="button"
          onClick={() => pick(key)}
          aria-pressed={current === key}
          aria-label={name}
          title={name}
          className={`flex size-11 items-center justify-center rounded-full font-medium uppercase transition-colors focus-visible:outline-2 focus-visible:outline-ink ${
            current === key ? "bg-ink text-white" : "text-muted"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
