"use client";

import { useId, useImperativeHandle, useRef, useState } from "react";
import { CloseIcon } from "./icons";

const CLOSE_MS = 250;
// Dragged this far down, or flicked this fast, the sheet closes.
const CLOSE_DISTANCE = 100;
const CLOSE_VELOCITY = 0.6;

export type SheetHandle = { show: () => void };

/**
 * A bottom sheet, opened through the `ref` with `show()`. It slides up with a light overshoot and closes by the X,
 * by dragging down, by tapping beside it and with Escape. The content only exists while open, so times in it render
 * in the viewer's time zone, never the server's. `scrolls` is for content that can outgrow the sheet: a drag on it
 * always scrolls, and only the top bar drags the sheet closed.
 */
export function Sheet({
  ref,
  title,
  children,
  footer,
  scrolls = false,
  onOpenChange,
}: {
  ref: React.Ref<SheetHandle>;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrolls?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; time: number; dragging: boolean } | null>(null);
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  function show() {
    dialog.current?.showModal();
    // Lay the sheet out below the screen first, so that sliding up is animated.
    dialog.current?.getBoundingClientRect();
    setOpen(true);
    setShown(true);
    onOpenChange?.(true);
  }

  function close() {
    const element = dialog.current;
    if (!element) return;
    element.style.translate = "";
    element.style.transition = "";
    setShown(false);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setTimeout(() => element.close(), still ? 0 : CLOSE_MS);
  }

  function release(element: HTMLElement) {
    element.style.translate = "";
    element.style.transition = "";
    drag.current = null;
  }

  function onPointerMove(event: React.PointerEvent<HTMLDialogElement>) {
    const start = drag.current;
    const element = event.currentTarget;
    if (!start) return;
    const distance = event.clientY - start.y;
    if (!start.dragging) {
      if (distance < 8) return;
      start.dragging = true;
      element.setPointerCapture(event.pointerId);
      element.style.transition = "none";
    }
    element.style.translate = `0 ${Math.max(0, distance)}px`;
  }

  function onPointerUp(event: React.PointerEvent<HTMLDialogElement>) {
    const start = drag.current;
    if (!start?.dragging) return void (drag.current = null);
    const distance = event.clientY - start.y;
    const velocity = distance / Math.max(1, event.timeStamp - start.time);
    drag.current = null;
    if (distance > CLOSE_DISTANCE || (distance > 30 && velocity > CLOSE_VELOCITY)) close();
    else release(event.currentTarget);
  }

  useImperativeHandle(ref, () => ({ show }));

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        setOpen(false);
        setShown(false);
        onOpenChange?.(false);
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      onPointerDown={(event) => {
        if (scrolls && body.current?.contains(event.target as Node)) return;
        drag.current = { y: event.clientY, time: event.timeStamp, dragging: false };
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={(event) => {
        drag.current = null;
        release(event.currentTarget);
      }}
      className={`fixed inset-x-0 top-auto -bottom-4 m-0 mx-auto w-full max-w-md overflow-hidden rounded-t-3xl bg-white p-0 text-ink backdrop:bg-ink/40 transition-transform motion-reduce:transition-none ${
        // Opening settles with a light overshoot (the extra 1rem below the screen is what shows then); closing is quick.
        shown ? "translate-y-0 duration-(--duration-base) ease-settle" : "translate-y-full duration-[250ms] ease-out"
      }`}
    >
      {open && (
        <div className="flex max-h-[90dvh] flex-col pb-[calc(max(1.5rem,env(safe-area-inset-bottom))+1rem)]">
          <div className="touch-none px-6">
            <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-hint/50" />
            <div className="flex h-14 items-center justify-between">
              <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em]">
                {title}
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="-mr-3 flex size-11 items-center justify-center rounded-full text-muted active:bg-ground focus-visible:outline-2 focus-visible:outline-ink"
              >
                <CloseIcon size={20} />
              </button>
            </div>
          </div>
          <div
            ref={body}
            className={`overflow-y-auto px-6 ${scrolls ? "touch-pan-y" : "touch-pan-y [@media(min-height:520px)]:touch-none"}`}
          >
            {children}
          </div>
          {footer}
        </div>
      )}
    </dialog>
  );
}
