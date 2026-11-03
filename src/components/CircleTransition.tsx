import { ViewTransition } from "react";

/**
 * The one circle of a page. The Paste button, the circle that is checking and the circle that
 * shows the result share this name, so that the browser moves and blends one into the next.
 * Without support, or with reduced motion, it just switches (see globals.css).
 */
export function CircleTransition({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition name="status-circle" share="morph" default="none">
      {children}
    </ViewTransition>
  );
}
