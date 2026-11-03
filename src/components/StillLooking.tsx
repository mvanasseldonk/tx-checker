"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heading } from "./Heading";
import { Ring } from "./StatusCircle";
import { useWatch } from "./Watch";

type Verdict = { word: string; line: string };

/** A grey ring counting down while it checks again every block, then the verdict once it stops. */
export function StillLooking({
  seconds,
  refreshSeconds,
  looking,
  stopped,
}: {
  seconds: number;
  refreshSeconds: number;
  looking: Verdict;
  stopped: Verdict;
}) {
  const router = useRouter();
  // On an address page the watch looks again already.
  const watched = useWatch() !== null;
  const [secondsLeft, setSecondsLeft] = useState(seconds);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      const next = secondsLeft - 1;
      setSecondsLeft(next);
      if (!watched && next > 0 && (seconds - next) % refreshSeconds === 0) router.refresh();
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, seconds, refreshSeconds, router, watched]);

  const minutes = Math.floor(secondsLeft / 60);
  const rest = String(secondsLeft % 60).padStart(2, "0");
  const verdict = secondsLeft > 0 ? looking : stopped;
  return (
    <>
      <Ring color="#5B6472" track="rgba(91,100,114,0.15)" progress={secondsLeft / seconds}>
        <span className="display text-[length:calc(32px*var(--display-scale))] tabular-nums">
          {minutes}:{rest}
        </span>
        <span className="text-[15px] text-muted">{secondsLeft > 0 ? "still looking" : "stopped looking"}</span>
      </Ring>
      <Heading word={verdict.word} color="text-gone">
        {verdict.line}
      </Heading>
    </>
  );
}
