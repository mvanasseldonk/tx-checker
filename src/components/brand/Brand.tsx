import Link from "next/link";
import { DEFAULT_MARK, MARK_PREVIEW, MARKS, type MarkKind } from "./config";
import { Lockup } from "./Lockup";
import { Mark } from "./Mark";

/**
 * Renders `render(kind)` for the logo direction in use. On production that is the default only. On a
 * preview it is all three, and the `.mark-variant` rules in globals.css show the one that `?mark=`
 * (or the pill) put on <html>, so there is no flash and no hydration mismatch.
 */
function Variants({ render }: { render: (kind: MarkKind) => React.ReactNode }) {
  if (!MARK_PREVIEW) return render(DEFAULT_MARK);
  return MARKS.map((kind) => (
    <span
      key={kind}
      className="mark-variant"
      data-mark-variant={kind}
      data-default={kind === DEFAULT_MARK ? "" : undefined}
    >
      {render(kind)}
    </span>
  ));
}

const LINK =
  "text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** The wordmark, quiet, for the Paste screen. Taps go home. */
export function HomeWordmark() {
  return (
    <Link href="/" aria-label="Ancoro, home" className={`flex h-11 items-center ${LINK}`}>
      <Variants render={(kind) => <Lockup kind={kind} size={19} />} />
    </Link>
  );
}

/** The small mark, quiet, for the screens that show a status. Taps go home. */
export function HomeMark() {
  return (
    <Link href="/" aria-label="Ancoro, home" className={`flex size-11 items-center justify-center rounded-full ${LINK}`}>
      <Variants render={(kind) => <Mark kind={kind} size={22} />} />
    </Link>
  );
}
