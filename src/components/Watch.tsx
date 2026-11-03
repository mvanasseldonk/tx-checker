"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useTransition } from "react";
import { isWatching, SEEN_PARAM, seenParam, watchDeadline } from "@/lib/watch";

type Watching = { stopped: boolean; restart: () => void };

const WatchContext = createContext<Watching | null>(null);

/** The watch of the address page around it, or null on a page that does not watch. */
export function useWatch(): Watching | null {
  return useContext(WatchContext);
}

/**
 * Looks at the address again every `seconds`, so that what is inside it (the server renders
 * that fresh each time) switches when a new transaction turns up. Gives up after 30 minutes
 * without one: `latest` is the newest transaction of the address, and a different one starts the
 * time afresh. `hold` keeps going regardless, for a transaction that is on its way to Final.
 * `seen` is what was there when the address was opened. It goes into the URL, which is how the
 * server gets it back on every look and after a reload.
 */
export function Watch({
  seconds,
  seen,
  latest,
  hold,
  children,
}: {
  seconds: number;
  seen: string[];
  latest: string | null;
  hold: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [stopped, setStopped] = useState(false);
  const [, startTransition] = useTransition();

  const param = seenParam(seen);
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get(SEEN_PARAM) === param) return;
    url.searchParams.set(SEEN_PARAM, param);
    window.history.replaceState(null, "", url);
  }, [param]);

  useEffect(() => {
    if (stopped) return;
    const startedAt = Date.now();
    // Nobody sees a hidden tab: look again as soon as it is back.
    const look = () => {
      if (!document.hidden) router.refresh();
    };
    const poll = setInterval(() => {
      if (hold || isWatching(startedAt, Date.now())) look();
      else setStopped(true);
    }, seconds * 1000);
    // The poll checks too, but a timer that waits out the rest stops it on time.
    const giveUp = hold ? undefined : setTimeout(() => setStopped(true), watchDeadline(startedAt) - startedAt);
    document.addEventListener("visibilitychange", look);
    return () => {
      clearInterval(poll);
      clearTimeout(giveUp);
      document.removeEventListener("visibilitychange", look);
    };
    // `latest` is no input of the effect, but a new transaction starts the 30 minutes afresh.
  }, [stopped, seconds, latest, hold, router]);

  function restart() {
    setStopped(false);
    startTransition(() => router.refresh());
  }

  return <WatchContext value={{ stopped, restart }}>{children}</WatchContext>;
}

/** The line that says watching stopped, as the button that starts it again. */
export function StoppedLine() {
  const watch = useWatch();
  return (
    <button type="button" onClick={watch?.restart} className="py-1 underline decoration-hint underline-offset-4">
      Stopped watching · tap to check again
    </button>
  );
}

/**
 * Under a transaction that is shown: that new ones will show too, or that watching stopped.
 * A circle whose ring is moving says it is watching by itself (`ringMoves`).
 */
export function WatchNote({ ringMoves }: { ringMoves: boolean }) {
  const watch = useWatch();
  if (!watch || (ringMoves && !watch.stopped)) return null;
  return (
    <p className="text-[15px] text-muted">
      {watch.stopped ? <StoppedLine /> : "Watching · new transactions show here"}
    </p>
  );
}
