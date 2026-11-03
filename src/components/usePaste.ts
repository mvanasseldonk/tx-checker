"use client";

import { usePathname, useRouter } from "next/navigation";
import { decideClipboard, decidePaste, readClipboard, type PasteOutcome } from "@/lib/paste";

/**
 * What the Paste buttons do, once: read the clipboard, then open the transaction or address, or hand the
 * screen to `onEmpty` (typing), `onInvalid` (not recognised) or `onUnreadable` (the read failed, so try again).
 * Without handlers it goes to the paste screen in that state (`/?type`, `/?invalid`, `/?unreadable`). Opening
 * the page already shown refreshes it instead.
 */
export function usePaste({
  onEmpty,
  onInvalid,
  onUnreadable,
}: { onEmpty?: () => void; onInvalid?: () => void; onUnreadable?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();

  function act(outcome: PasteOutcome) {
    if (outcome.kind === "open") {
      if (outcome.href === pathname) router.refresh();
      else router.push(outcome.href);
    } else if (outcome.kind === "empty") {
      (onEmpty ?? (() => router.push("/?type")))();
    } else if (outcome.kind === "unreadable") {
      (onUnreadable ?? (() => router.push("/?unreadable")))();
    } else {
      (onInvalid ?? (() => router.push("/?invalid")))();
    }
  }

  /** For typed or pasted text. */
  function check(text: string) {
    act(decidePaste(text));
  }

  /** Must be called directly from the click handler. */
  async function pasteFromClipboard() {
    act(decideClipboard(await readClipboard()));
  }

  return { check, pasteFromClipboard };
}
