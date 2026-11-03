"use client";

import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, useTransition } from "react";
import {
  countFailures,
  isStruggling,
  isWatching,
  screenAfterLook,
  SEEN_PARAM,
  seenParam,
  watchDeadline,
} from "@/lib/watch";

// `struggling`: the last few looks all failed, and what is shown is from before.
// A screen, with what the watch needs to know about it.
type Good = { screen: React.ReactNode; latest: string | null; hold: boolean };

type Watching = { stopped: boolean; struggling: boolean; restart: () => void };

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
 * A look that failed (`failed`) does not replace a good screen: that stays, and the next look
 * tries again. Only after a few failures in a row does the page say so, in a quiet line.
 */
export function Watch({
  seconds,
  seen,
  latest,
  hold,
  failed = false,
  children,
}: {
  seconds: number;
  seen: string[];
  latest: string | null;
  hold: boolean;
  failed?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [stopped, setStopped] = useState(false);
  const [looking, startTransition] = useTransition();

  // The last good screen.
  const [good, setGood] = useState<Good | null>(failed ? null : { screen: children, latest, hold });
  if (!failed && good?.screen !== children) setGood({ screen: children, latest, hold });
  const shown = screenAfterLook(failed, { screen: children, latest, hold }, good);

  // A look has come back when the transition ends: count it if it failed.
  const [wasLooking, setWasLooking] = useState(false);
  const [failures, setFailures] = useState(0);
  if (looking !== wasLooking) {
    setWasLooking(looking);
    if (wasLooking) setFailures(countFailures(failures, failed));
  }

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
      if (!document.hidden) startTransition(() => router.refresh());
    };
    const poll = setInterval(() => {
      if (shown.hold || isWatching(startedAt, Date.now())) look();
      else setStopped(true);
    }, seconds * 1000);
    // The poll checks too, but a timer that waits out the rest stops it on time.
    const giveUp = shown.hold ? undefined : setTimeout(() => setStopped(true), watchDeadline(startedAt) - startedAt);
    document.addEventListener("visibilitychange", look);
    return () => {
      clearInterval(poll);
      clearTimeout(giveUp);
      document.removeEventListener("visibilitychange", look);
    };
    // The latest transaction is no input of the effect, but a new one starts the 30 minutes afresh.
  }, [stopped, seconds, shown.latest, shown.hold, router]);

  function restart() {
    setStopped(false);
    startTransition(() => router.refresh());
  }

  return (
    <WatchContext value={{ stopped, struggling: isStruggling(failures), restart }}>{shown.screen}</WatchContext>
  );
}

/** What the page says once looking has failed a few times in a row. */
export const STRUGGLING = "Can't reach the network · still trying";

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
  if (!watch || (ringMoves && !watch.stopped && !watch.struggling)) return null;
  return (
    <p className="text-[15px] text-muted">
      {watch.stopped ? <StoppedLine /> : watch.struggling ? STRUGGLING : "Watching · new transactions show here"}
    </p>
  );
}
