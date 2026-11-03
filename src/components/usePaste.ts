"use client";

import { usePathname, useRouter } from "next/navigation";
import { decidePaste, readClipboard } from "@/lib/paste";

/**
 * What the Paste buttons do, once: read the clipboard, then open the transaction or address, or hand the
 * screen to `onEmpty` (typing) or `onInvalid` (not recognised). Without handlers it goes to the paste screen
 * in that state (`/?type`, `/?invalid`). Opening the page already shown refreshes it instead.
 */
export function usePaste({ onEmpty, onInvalid }: { onEmpty?: () => void; onInvalid?: () => void } = {}) {
  const router = useRouter();
  const pathname = usePathname();

  /** For typed or pasted text, and for the clipboard's. */
  function check(text: string) {
    const outcome = decidePaste(text);
    if (outcome.kind === "open") {
      if (outcome.href === pathname) router.refresh();
      else router.push(outcome.href);
    } else if (outcome.kind === "empty") {
      (onEmpty ?? (() => router.push("/?type")))();
    } else {
      (onInvalid ?? (() => router.push("/?invalid")))();
    }
  }

  /** Must be called directly from the click handler. */
  async function pasteFromClipboard() {
    check(await readClipboard());
  }

  return { check, pasteFromClipboard };
}
