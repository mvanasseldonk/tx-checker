"use client";

import { useSyncExternalStore } from "react";

/**
 * A switch between the two logo looks, for previews only (the layout leaves it out on production, which
 * then has the mono look). It sets data-logo on <html>, which the rules at the end of globals.css turn
 * into the colours, and remembers the choice in localStorage. `?logo=mono|brand` in the URL picks one
 * too, which makes it linkable. The PO picks one, then this file, PICK_LOGO, the layout lines that use
 * them and, if mono wins, the data-logo rules in globals.css go.
 */
const LOOKS = [
  { key: "mono", name: "Logos in ink" },
  { key: "brand", name: "Logos in brand colours" },
] as const;

const EVENT = "logochange";

/** Runs in the head, before the first paint. */
export const PICK_LOGO = `try{var p=new URLSearchParams(location.search).get("logo");if(p==="mono"||p==="brand")localStorage.setItem("logo",p);var l=localStorage.getItem("logo");if(l==="mono"||l==="brand")document.documentElement.dataset.logo=l}catch(e){}`;

function subscribe(notify: () => void) {
  window.addEventListener(EVENT, notify);
  return () => window.removeEventListener(EVENT, notify);
}

export function LogoSwitch() {
  const current = useSyncExternalStore(
    subscribe,
    () => document.documentElement.dataset.logo ?? "mono",
    () => "mono",
  );

  function pick(key: string) {
    document.documentElement.setAttribute("data-logo", key);
    try {
      localStorage.setItem("logo", key);
    } catch {
      // Private mode: the choice then lasts until the page is closed.
    }
    window.dispatchEvent(new Event(EVENT));
  }

  return (
    <div
      role="group"
      aria-label="Logo style"
      className="fixed top-5 left-1/2 z-50 flex h-11 -translate-x-1/2 items-center rounded-full bg-white/90 px-1 text-[15px] shadow-[0_6px_20px_-10px_rgba(16,19,24,0.35)] backdrop-blur"
    >
      {LOOKS.map(({ key, name }) => (
        <button
          key={key}
          type="button"
          onClick={() => pick(key)}
          aria-pressed={current === key}
          aria-label={name}
          title={name}
          className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 font-medium capitalize transition-colors focus-visible:outline-2 focus-visible:outline-ink ${
            current === key ? "bg-ink text-white" : "text-muted"
          }`}
        >
          {key}
        </button>
      ))}
    </div>
  );
}
