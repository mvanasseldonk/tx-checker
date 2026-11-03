"use client";

import { useEffect, useState } from "react";

// A little longer than the exit animation, then the old text is gone from the page.
const LEAVE_MS = 400;

type Shown = { id: string; node: React.ReactNode };

/**
 * A word or line that changes while the page watches: the old text slides up and out, the new one
 * comes in from below. `id` is what tells the texts apart (the text itself, mostly): a render with
 * the same `id` changes nothing, so a poll that finds nothing new stays quiet.
 * Both texts sit in the same cell of a grid, so the box keeps its size and nothing around it shifts.
 * The leaving text is hidden from assistive technology, so that only the new one is read. With `live`
 * the new text is announced when it changes. Under reduced motion the old text is not shown at all.
 * `swap` off (a change that has its own choreography) just shows the new text.
 */
export function Swap({
  id,
  swap = true,
  live = false,
  children,
}: {
  id: string;
  swap?: boolean;
  live?: boolean;
  children: React.ReactNode;
}) {
  const [shown, setShown] = useState<Shown>({ id, node: children });
  const [leaving, setLeaving] = useState<Shown | null>(null);
  const [entering, setEntering] = useState(false);
  if (shown.id !== id) {
    setShown({ id, node: children });
    setLeaving(swap ? shown : null);
    setEntering(swap);
  }

  useEffect(() => {
    if (!leaving) return;
    const timer = setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => clearTimeout(timer);
  }, [leaving]);

  return (
    <span className="grid" aria-live={live ? "polite" : undefined} aria-atomic={live ? true : undefined}>
      {leaving && (
        <span
          key={leaving.id}
          aria-hidden="true"
          className="col-start-1 row-start-1 motion-safe:animate-swap-out motion-reduce:hidden"
        >
          {leaving.node}
        </span>
      )}
      <span key={id} className={`col-start-1 row-start-1 ${entering ? "motion-safe:animate-swap-in" : ""}`}>
        {children}
      </span>
    </span>
  );
}
