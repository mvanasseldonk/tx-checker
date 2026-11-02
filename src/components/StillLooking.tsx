"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Ring } from "./StatusCircle";

const LOOK_SECONDS = 120;
const REFRESH_SECONDS = 12;

/** A grey ring counting down two minutes while it checks again every block. */
export function StillLooking() {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(LOOK_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => {
      const next = secondsLeft - 1;
      setSecondsLeft(next);
      if (next > 0 && (LOOK_SECONDS - next) % REFRESH_SECONDS === 0) router.refresh();
    }, 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft, router]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = String(secondsLeft % 60).padStart(2, "0");
  return (
    <Ring color="#5B6472" track="rgba(91,100,114,0.15)" progress={secondsLeft / LOOK_SECONDS}>
      <span className="text-[32px] font-medium tracking-[-0.02em] tabular-nums">
        {minutes}:{seconds}
      </span>
      <span className="text-[15px] text-muted">{secondsLeft > 0 ? "still looking" : "stopped looking"}</span>
    </Ring>
  );
}
