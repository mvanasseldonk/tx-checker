import Link from "next/link";
import { Lockup } from "./Lockup";
import { Mark } from "./Mark";

const LINK =
  "text-muted transition-colors hover:text-ink focus-visible:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** The wordmark, quiet, for the Paste screen. Taps go home. */
export function HomeWordmark() {
  return (
    <Link href="/" aria-label="Ancoro, home" className={`flex h-11 items-center ${LINK}`}>
      <Lockup size={19} />
    </Link>
  );
}

/** The small mark, quiet, for the screens that show a status. Taps go home. */
export function HomeMark() {
  return (
    <Link href="/" aria-label="Ancoro, home" className={`flex size-11 items-center justify-center rounded-full ${LINK}`}>
      <Mark size={22} />
    </Link>
  );
}
