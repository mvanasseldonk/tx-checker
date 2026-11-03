"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { circleChange, followDeadline, isFollowing, isSettled } from "@/lib/follow";
import { Heading } from "./Heading";
import { Ring } from "./StatusCircle";

type Kind = "final" | "included" | "pending" | "failed";

/**
 * The status circle and its word, looked up again every block for as long as the status can
 * still change. The moving ring is the sign that the page is watching; Final and Failed stand still.
 * A change of status while the page is open animates: the ring completes and fills in as a disc.
 * A transaction that stays Pending is given up on after a while; a tap on the circle or its line
 * looks again, and starts following afresh.
 */
export function Following({
  kind,
  seconds,
  color,
  track,
  shadow,
  progress,
  word,
  wordClass,
  line,
  children,
}: {
  kind: Kind;
  seconds: number;
  color: string;
  track: string;
  shadow: string;
  progress: number;
  word: string;
  wordClass: string;
  line: React.ReactNode;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const settled = isSettled(kind);
  const [stopped, setStopped] = useState(false);
  const following = !settled && !stopped;
  const [, startTransition] = useTransition();

  // What the last change of status was, once one happens while the user watches.
  const [shown, setShown] = useState(kind);
  const [change, setChange] = useState<ReturnType<typeof circleChange>>(null);
  if (shown !== kind) {
    setShown(kind);
    setChange(circleChange(shown, kind));
  }

  useEffect(() => {
    if (!following) return;
    const startedAt = Date.now();
    const keepGoing = () => {
      if (isFollowing(kind, startedAt, Date.now())) return true;
      setStopped(true);
      return false;
    };
    const refresh = setInterval(() => keepGoing() && router.refresh(), seconds * 1000);
    // The refresh checks too, but a timer that waits out the rest stops the arc on time.
    const deadline = followDeadline(kind, startedAt);
    const giveUp = deadline === null ? undefined : setTimeout(keepGoing, deadline - startedAt);
    return () => {
      clearInterval(refresh);
      clearTimeout(giveUp);
    };
  }, [following, kind, router, seconds]);

  function checkAgain() {
    setStopped(false);
    startTransition(() => router.refresh());
  }

  // The disc fades in over the ring once that is complete; the text turns white along with it.
  const timing = "motion-safe:duration-[600ms] motion-safe:ease-out";
  const cover = (
    <div
      aria-hidden="true"
      className={`absolute inset-0 rounded-full motion-safe:transition-[opacity,scale] ${timing} ${
        settled ? "opacity-100 motion-safe:delay-500" : "scale-90 opacity-0"
      }`}
      style={{ background: color, boxShadow: `0 24px 48px -20px ${shadow}` }}
    />
  );
  const circle = (
    <Ring
      color={color}
      track={track}
      progress={progress}
      following={!settled}
      pulse={kind === "included"}
      still={stopped}
      drawIn={change === "draw"}
      cover={cover}
      contentClassName={`motion-safe:transition-colors ${timing} ${settled ? "text-white motion-safe:delay-500" : ""}`}
      contentStyle={{ "--sub": settled ? "rgb(255 255 255 / 0.85)" : "var(--color-muted)" } as React.CSSProperties}
    >
      {children}
    </Ring>
  );
  return (
    <>
      {/* The button sits over the circle, so the circle itself stays put when it appears. */}
      <div className="relative rounded-full transition-transform has-[button:active]:scale-95">
        {circle}
        {stopped && (
          <button
            type="button"
            onClick={checkAgain}
            aria-label="Check again"
            className="absolute inset-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          />
        )}
      </div>
      <Heading word={word} color={wordClass}>
        {stopped ? (
          <button type="button" onClick={checkAgain} className="py-1 underline decoration-hint underline-offset-4">
            Stopped following · tap to check again
          </button>
        ) : (
          <span className={change === "settle" ? "inline-block motion-safe:animate-settle-line" : ""}>{line}</span>
        )}
      </Heading>
    </>
  );
}
