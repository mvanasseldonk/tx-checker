"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Heading } from "./Heading";
import { Disc, Ring } from "./StatusCircle";

type Kind = "final" | "included" | "pending" | "failed";

/**
 * The status circle and its word, looked up again every block for as long as the status can
 * still change. The moving ring is the sign that the page is watching; Final and Failed stand still.
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
  const following = kind === "included" || kind === "pending";

  useEffect(() => {
    if (!following) return;
    const timer = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(timer);
  }, [following, router, seconds]);

  return (
    <>
      {following ? (
        <Ring color={color} track={track} progress={progress} following pulse={kind === "included"}>
          {children}
        </Ring>
      ) : (
        <Disc color={color} shadow={shadow}>
          {children}
        </Disc>
      )}
      <Heading word={word} color={wordClass}>
        {line}
      </Heading>
    </>
  );
}
