"use client";

/*
 * EXPERIMENT #33 (temporary): the diagnostics line for the PO's phone test. Shows nothing unless the URL had
 * `?debug=paste` (remembered in sessionStorage for the tab, because navigating drops the param). Remove together
 * with `pasteDebug.ts` and the retry in `paste.ts`.
 */

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useSyncExternalStore } from "react";
import { formatAttempt, pasteDebug } from "@/lib/pasteDebug";

const KEY = "debug-paste";

function remembered(): boolean {
  try {
    return sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function DebugLine() {
  const params = useSearchParams();
  const asked = params.get("debug") === "paste";
  useEffect(() => {
    if (!asked) return;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
  }, [asked]);
  // The server and the first client render have no flag (so no mismatch); the flag appears right after.
  const enabled = useSyncExternalStore(
    () => () => {},
    () => asked || remembered(),
    () => false,
  );
  const attempt = useSyncExternalStore(pasteDebug.subscribe, pasteDebug.snapshot, () => null);
  if (!enabled) return null;
  return (
    <p
      data-testid="paste-debug"
      className="mx-auto w-full max-w-md px-6 pb-3 text-center font-mono text-[11px] leading-snug break-words text-hint"
    >
      {attempt ? formatAttempt(attempt) : "paste: no attempt yet"}
    </p>
  );
}

/** In its own Suspense boundary, so that reading the search params keeps the page prerendered. */
export function PasteDebug() {
  return (
    <Suspense fallback={null}>
      <DebugLine />
    </Suspense>
  );
}
