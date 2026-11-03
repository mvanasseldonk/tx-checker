"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";
import {
  cancelClipboardRetry,
  clearRetryHandoff,
  decideClipboard,
  decidePaste,
  isPageActive,
  markRetryHandoff,
  readClipboard,
  retryClipboard,
  retryHandoffLeft,
  type ClipboardRead,
  type PasteOutcome,
} from "@/lib/paste";
import { pasteDebug, sinceLabel } from "@/lib/pasteDebug";

/**
 * What the Paste buttons do, once: read the clipboard, then open the transaction or address, or hand the
 * screen to `onEmpty` (typing), `onInvalid` (not recognised) or `onUnreadable` (the read failed, so try again).
 * Without handlers it goes to the paste screen in that state (`/?type`, `/?invalid`, `/?unreadable`). Opening
 * the page already shown refreshes it instead.
 *
 * EXPERIMENT #33: a failed read is retried once by itself when the page is active again (see `retryClipboard`),
 * because iOS's own paste question swallows the tap on "Allow". With `onUnreadable` (the paste screen) the retry
 * runs here; without it (the top-right button) the failure goes to `/?unreadable` at once and the paste screen
 * does the retry, as this hook would unmount on the way.
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

  // The retry runs later, so it acts with the latest render's handlers and path.
  const actRef = useRef(act);
  useEffect(() => {
    actRef.current = act;
  });
  // Leaving the screen drops a retry that is still waiting.
  useEffect(() => cancelClipboardRetry, []);

  /** Retries the read once when the page is active again, and acts on what it gives. */
  const startRetry = useCallback((windowMs?: number) => {
    retryClipboard({
      windowMs,
      onTrigger: (trigger, waitedMs) =>
        pasteDebug.retried(
          trigger === "now" ? "now" : `on ${trigger === "focus" ? "focus" : "visible"} after ${sinceLabel(waitedMs)}`,
        ),
      onRead: (read: ClipboardRead) => {
        clearRetryHandoff();
        const outcome = decideClipboard(read);
        if (outcome.kind === "unreadable") {
          pasteDebug.retryResult(read.ok ? "error" : (read.error ?? "error"));
          return; // failed again: the unreadable line stays
        }
        pasteDebug.retryResult(
          `ok → ${outcome.kind === "open" ? outcome.href.replace(/^(.{28}).+$/, "$1…") : outcome.kind}`,
        );
        actRef.current(outcome);
      },
      onGiveUp: () => {
        clearRetryHandoff();
        pasteDebug.retried(`gave up after ${sinceLabel(windowMs ?? 30_000)}`);
      },
    });
  }, []);

  /** For the paste screen's `/?unreadable`: takes over the retry that the top-right button handed over. */
  const resumeRetry = useCallback(() => {
    const left = retryHandoffLeft();
    if (left !== null) startRetry(left);
  }, [startRetry]);

  /** For typed or pasted text. */
  function check(text: string) {
    act(decidePaste(text));
  }

  /** Must be called directly from the click handler. */
  async function pasteFromClipboard() {
    cancelClipboardRetry(); // a new tap replaces the pending retry
    clearRetryHandoff();
    pasteDebug.start();
    const read = await readClipboard();
    pasteDebug.read(read.ok ? "ok" : (read.error ?? "error"));
    if (!read.ok) {
      pasteDebug.failed(isPageActive());
      if (!onUnreadable) markRetryHandoff();
    }
    act(decideClipboard(read));
    if (!read.ok && onUnreadable) startRetry();
  }

  return { check, pasteFromClipboard, resumeRetry };
}
