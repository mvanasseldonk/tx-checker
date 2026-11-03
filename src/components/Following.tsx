"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { circleChange, isSettled } from "@/lib/follow";
import { Heading } from "./Heading";
import { Ring } from "./StatusCircle";

type Kind = "final" | "included" | "pending" | "failed";

/**
 * The status circle and its word, looked up again every block for as long as the status can
 * still change. The moving ring is the sign that the page is watching; Final and Failed stand still.
 * A change of status while the page is open animates: the ring completes and fills in as a disc.
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
  const following = !settled;

  // What the last change of status was, once one happens while the user watches.
  const [shown, setShown] = useState(kind);
  const [change, setChange] = useState<ReturnType<typeof circleChange>>(null);
  if (shown !== kind) {
    setShown(kind);
    setChange(circleChange(shown, kind));
  }

  useEffect(() => {
    if (!following) return;
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [following, router, seconds]);

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
  return (
    <>
      <Ring
        color={color}
        track={track}
        progress={progress}
        following={following}
        pulse={kind === "included"}
        drawIn={change === "draw"}
        cover={cover}
        contentClassName={`motion-safe:transition-colors ${timing} ${settled ? "text-white motion-safe:delay-500" : ""}`}
        contentStyle={{ "--sub": settled ? "rgb(255 255 255 / 0.85)" : "var(--color-muted)" } as React.CSSProperties}
      >
        {children}
      </Ring>
      <Heading word={word} color={wordClass}>
        <span className={change === "settle" ? "inline-block motion-safe:animate-settle-line" : ""}>{line}</span>
      </Heading>
    </>
  );
}
