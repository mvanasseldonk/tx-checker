import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  RETRY_WINDOW_MS,
  cancelClipboardRetry,
  clearRetryHandoff,
  decideClipboard,
  markRetryHandoff,
  retryClipboard,
  retryHandoffLeft,
  type ClipboardRead,
} from "./paste";

const BTC_TX = "448f3b960c99ae65462d9440479fadd52ce817971f754fc9ed2030f3d56f1b36";

/** A page that is (or is not) focused and visible, with real event targets for focus and visibilitychange. */
function stubPage({ focused, visible = true }: { focused: boolean; visible?: boolean }) {
  const page = { focused, visible };
  const win = new EventTarget();
  const doc = new EventTarget();
  Object.defineProperties(doc, {
    hasFocus: { value: () => page.focused },
    visibilityState: { get: () => (page.visible ? "visible" : "hidden") },
  });
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", doc);
  return {
    focus() {
      page.focused = true;
      win.dispatchEvent(new Event("focus"));
    },
    show() {
      page.visible = true;
      doc.dispatchEvent(new Event("visibilitychange"));
    },
    listeners: () => ({ win, doc }),
  };
}

function stubReadText(...results: (string | Error)[]) {
  const readText = vi.fn(async () => {
    const next = results.shift();
    if (next instanceof Error) throw next;
    return next ?? "";
  });
  vi.stubGlobal("navigator", { clipboard: { readText } });
  return readText;
}

const denied = () => Object.assign(new Error("denied"), { name: "NotAllowedError" });

describe("retryClipboard", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cancelClipboardRetry();
    clearRetryHandoff();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("retries right away (after a tick) when the page is focused and visible", async () => {
    stubPage({ focused: true });
    const readText = stubReadText(BTC_TX);
    const onRead = vi.fn();
    const onTrigger = vi.fn();
    retryClipboard({ onRead, onTrigger });
    expect(readText).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    expect(onTrigger).toHaveBeenCalledWith("now", 0);
    expect(readText).toHaveBeenCalledTimes(1);
    expect(onRead).toHaveBeenCalledWith({ ok: true, text: BTC_TX });
  });

  it("waits for focus when the page is not focused, then retries once", async () => {
    const page = stubPage({ focused: false });
    const readText = stubReadText(BTC_TX);
    const onRead = vi.fn();
    const onTrigger = vi.fn();
    retryClipboard({ onRead, onTrigger });
    await vi.advanceTimersByTimeAsync(2300);
    expect(readText).not.toHaveBeenCalled();
    page.focus();
    await vi.advanceTimersByTimeAsync(0);
    expect(onTrigger).toHaveBeenCalledWith("focus", 2300);
    expect(onRead).toHaveBeenCalledWith({ ok: true, text: BTC_TX });
    // Focus again: nothing more happens, and the listeners are gone.
    page.focus();
    await vi.advanceTimersByTimeAsync(0);
    expect(readText).toHaveBeenCalledTimes(1);
  });

  it("also retries when the page becomes visible, whichever comes first", async () => {
    const page = stubPage({ focused: false, visible: false });
    const readText = stubReadText(BTC_TX, BTC_TX);
    const onTrigger = vi.fn();
    retryClipboard({ onRead: vi.fn(), onTrigger });
    await vi.advanceTimersByTimeAsync(1000);
    page.show();
    await vi.advanceTimersByTimeAsync(0);
    expect(onTrigger).toHaveBeenCalledWith("visible", 1000);
    page.focus();
    await vi.advanceTimersByTimeAsync(0);
    expect(readText).toHaveBeenCalledTimes(1);
  });

  it("does not retry on a visibilitychange to hidden", async () => {
    const page = stubPage({ focused: false, visible: false });
    const readText = stubReadText(BTC_TX);
    retryClipboard({ onRead: vi.fn() });
    page.listeners().doc.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);
    expect(readText).not.toHaveBeenCalled();
  });

  it("waits for focus when the page is focused but hidden", async () => {
    stubPage({ focused: true, visible: false });
    const readText = stubReadText(BTC_TX);
    retryClipboard({ onRead: vi.fn() });
    await vi.advanceTimersByTimeAsync(10);
    expect(readText).not.toHaveBeenCalled();
  });

  it("gives up after 30 s and does not retry on a later focus", async () => {
    const page = stubPage({ focused: false });
    const readText = stubReadText(BTC_TX);
    const onRead = vi.fn();
    const onGiveUp = vi.fn();
    retryClipboard({ onRead, onGiveUp });
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    page.focus();
    await vi.advanceTimersByTimeAsync(0);
    expect(readText).not.toHaveBeenCalled();
    expect(onRead).not.toHaveBeenCalled();
  });

  it("hands a successful read to the caller, which decides like a normal paste", async () => {
    stubPage({ focused: true });
    stubReadText(BTC_TX);
    const reads: ClipboardRead[] = [];
    retryClipboard({ onRead: (read) => reads.push(read) });
    await vi.advanceTimersByTimeAsync(0);
    expect(decideClipboard(reads[0])).toEqual({ kind: "open", href: `/tx/${BTC_TX}` });
  });

  it("reports a second failure, with the error name, and does not retry again", async () => {
    stubPage({ focused: true });
    const readText = stubReadText(denied(), denied());
    const onRead = vi.fn();
    retryClipboard({ onRead });
    await vi.advanceTimersByTimeAsync(0);
    expect(onRead).toHaveBeenCalledWith({ ok: false, error: "NotAllowedError" });
    expect(decideClipboard(onRead.mock.calls[0][0])).toEqual({ kind: "unreadable" });
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
    expect(readText).toHaveBeenCalledTimes(1);
  });

  it("is cancelled by cancelClipboardRetry (a new tap, leaving, unmounting) while it waits", async () => {
    const page = stubPage({ focused: false });
    const readText = stubReadText(BTC_TX);
    const onRead = vi.fn();
    retryClipboard({ onRead });
    cancelClipboardRetry();
    page.focus();
    await vi.advanceTimersByTimeAsync(RETRY_WINDOW_MS);
    expect(readText).not.toHaveBeenCalled();
  });

  it("drops a read that finishes after the cancel", async () => {
    stubPage({ focused: true });
    let resolve: (text: string) => void = () => {};
    vi.stubGlobal("navigator", { clipboard: { readText: () => new Promise<string>((r) => (resolve = r)) } });
    const onRead = vi.fn();
    retryClipboard({ onRead });
    await vi.advanceTimersByTimeAsync(0);
    cancelClipboardRetry();
    resolve(BTC_TX);
    await vi.advanceTimersByTimeAsync(0);
    expect(onRead).not.toHaveBeenCalled();
  });

  it("keeps one pending retry: a new one replaces the old", async () => {
    const page = stubPage({ focused: false });
    const readText = stubReadText(BTC_TX, BTC_TX);
    const first = vi.fn();
    const second = vi.fn();
    retryClipboard({ onRead: first });
    retryClipboard({ onRead: second });
    page.focus();
    await vi.advanceTimersByTimeAsync(0);
    expect(readText).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("removes its listeners when it is done or cancelled", async () => {
    const page = stubPage({ focused: false });
    const { win, doc } = page.listeners();
    const addWin = vi.spyOn(win, "addEventListener");
    const removeWin = vi.spyOn(win, "removeEventListener");
    const addDoc = vi.spyOn(doc, "addEventListener");
    const removeDoc = vi.spyOn(doc, "removeEventListener");
    retryClipboard({ onRead: vi.fn() });
    cancelClipboardRetry();
    expect(addWin).toHaveBeenCalledTimes(1);
    expect(removeWin).toHaveBeenCalledWith("focus", addWin.mock.calls[0][1]);
    expect(addDoc).toHaveBeenCalledTimes(1);
    expect(removeDoc).toHaveBeenCalledWith("visibilitychange", addDoc.mock.calls[0][1]);
  });
});

describe("retry handoff", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    clearRetryHandoff();
    vi.useRealTimers();
  });

  it("has nothing to pick up without a failure", () => {
    expect(retryHandoffLeft()).toBeNull();
  });

  it("leaves the rest of the window to the paste screen, until it runs out", () => {
    markRetryHandoff();
    vi.advanceTimersByTime(4000);
    expect(retryHandoffLeft()).toBe(RETRY_WINDOW_MS - 4000);
    vi.advanceTimersByTime(RETRY_WINDOW_MS);
    expect(retryHandoffLeft()).toBeNull();
  });

  it("is gone once cleared", () => {
    markRetryHandoff();
    clearRetryHandoff();
    expect(retryHandoffLeft()).toBeNull();
  });
});
