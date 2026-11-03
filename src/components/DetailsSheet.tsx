"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Chain } from "@/lib/detect";
import { explorerFor } from "@/lib/explorer";
import { formatAmount, formatEur, formatTime, shortAddress } from "@/lib/format";
import type { TxAmount, TxDetails } from "@/lib/status";
import { shareLink, txLink, type ShareOutcome } from "@/lib/share";
import { CheckIcon, CloseIcon, CopyIcon, ShareIcon } from "./icons";

const CLOSE_MS = 250;
// Dragged this far down, or flicked this fast, the sheet closes.
const CLOSE_DISTANCE = 100;
const CLOSE_VELOCITY = 0.6;

/** A "Details" button and the bottom sheet it opens over the result. */
export function DetailsSheet({
  chain,
  id,
  details,
  notSent,
}: {
  chain: Chain;
  id: string;
  details: TxDetails;
  notSent: boolean;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const drag = useRef<{ y: number; time: number; dragging: boolean } | null>(null);
  // The content only exists while open, so times render in the viewer's time zone, never the server's.
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);

  function show() {
    dialog.current?.showModal();
    // Lay the sheet out below the screen first, so that sliding up is animated.
    dialog.current?.getBoundingClientRect();
    setOpen(true);
    setShown(true);
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

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="min-h-11 rounded-full px-5 text-[15px] font-medium text-ink underline decoration-ink/30 underline-offset-4 active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Details
      </button>
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
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        onPointerDown={(event) => {
          drag.current = { y: event.clientY, time: event.timeStamp, dragging: false };
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={(event) => {
          drag.current = null;
          release(event.currentTarget);
        }}
        className={`fixed inset-x-0 top-auto bottom-0 m-0 mx-auto w-full max-w-md overflow-hidden rounded-t-3xl bg-white p-0 text-ink backdrop:bg-ink/40 transition-transform duration-[250ms] ease-out motion-reduce:transition-none ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {open && (
          <div className="flex max-h-[90dvh] flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            <div className="touch-none px-6">
              <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-hint/50" />
              <div className="flex h-14 items-center justify-between">
                <h2 id={titleId} className="text-lg font-semibold tracking-[-0.01em]">
                  Details
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
            <dl className="touch-pan-y overflow-y-auto px-6 [@media(min-height:520px)]:touch-none">
              <Fields details={details} notSent={notSent} />
            </dl>
            <Actions chain={chain} id={id} />
          </div>
        )}
      </dialog>
    </>
  );
}

const NOTICE_MS = 2000;

/** Share the link to this transaction, or go on to the explorer: two equal buttons side by side. */
function Actions({ chain, id }: { chain: Chain; id: string }) {
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [link, setLink] = useState("");

  useEffect(() => () => clearTimeout(timer.current), []);

  async function share() {
    // Always the clean link to this transaction: on an address page the current URL carries `?seen=`.
    const url = txLink(location.origin, id);
    const result = await shareLink(url, {
      share: navigator.share?.bind(navigator),
      canShare: navigator.canShare?.bind(navigator),
      writeText: navigator.clipboard?.writeText?.bind(navigator.clipboard),
    });
    clearTimeout(timer.current);
    setLink(url);
    setOutcome(result === "shared" || result === "cancelled" ? null : result);
    // A failed copy stays on screen: the link below it is the only way left to get the link.
    if (result === "copied") timer.current = setTimeout(() => setOutcome(null), NOTICE_MS);
  }

  const copied = outcome === "copied";
  return (
    <div className="px-6 pt-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={share}
          className="flex min-h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-ink px-3 text-[15px] font-medium text-white transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-reduce:transition-none"
        >
          {copied ? <CheckIcon size={18} /> : <ShareIcon size={18} />}
          {copied ? "Link copied" : "Share"}
        </button>
        <ExplorerLink chain={chain} id={id} />
      </div>
      <p role="status" className={outcome === "failed" ? "pt-3 text-[15px] text-danger" : "sr-only"}>
        {copied && "Link copied"}
        {outcome === "failed" && "Copy failed. Select the link below."}
      </p>
      {outcome === "failed" && (
        <input
          readOnly
          aria-label="Link to this transaction"
          value={link}
          onFocus={(event) => event.currentTarget.select()}
          className="mt-2 min-h-12 w-full rounded-2xl border border-ink/15 bg-ground px-4 font-mono text-[13px] text-ink focus-visible:outline-2 focus-visible:outline-ink"
        />
      )}
    </div>
  );
}

/** A way out to the full explorer page of this transaction. */
function ExplorerLink({ chain, id }: { chain: Chain; id: string }) {
  const { name, url } = explorerFor(chain, id);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-12 min-w-0 flex-1 items-center justify-center rounded-2xl border border-ink/15 px-3 text-[15px] font-medium text-ink active:bg-ground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {name}
      <span aria-hidden="true" className="ml-1">
        ↗
      </span>
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function Fields({ details, notSent }: { details: TxDetails; notSent: boolean }) {
  const { to, amount, fee, time } = details;
  return (
    <>
      {to && (
        <Field label="To">
          {to.name && <span className="font-medium [overflow-wrap:anywhere]">{to.name}</span>}
          <Address address={to.address} />
          {to.method && <span className="text-[15px] text-muted [overflow-wrap:anywhere]">{to.method}</span>}
        </Field>
      )}
      {details.from && (
        <Field label="From">
          <Address address={details.from} />
        </Field>
      )}
      {amount && (
        <Field label="Amount">
          <Money money={amount} note={notSent ? "not sent" : undefined} />
        </Field>
      )}
      {fee && (
        <Field label="Fee">
          <Money money={fee} />
        </Field>
      )}
      <Field label="Time">
        <span>{time === null ? "Not yet" : formatTime(time)}</span>
      </Field>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-6 border-t border-ink/10 py-2 first:border-t-0">
      <dt className="flex-none text-[15px] text-muted">{label}</dt>
      <dd className="flex min-w-0 flex-col items-end text-right text-[15px]">{children}</dd>
    </div>
  );
}

/** An amount with its euro value, or a note instead when it should not count. */
function Money({ money, note }: { money: TxAmount; note?: string }) {
  const sub = note ?? (money.eur === null ? null : formatEur(money.eur));
  return (
    <>
      <span className="[overflow-wrap:anywhere]">
        {formatAmount(money.amount)} {money.symbol}
      </span>
      {sub && <span className="text-[15px] text-muted">{sub}</span>}
    </>
  );
}

/** A shortened address; one tap copies the full one. */
function Address({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy address ${address}`}
        className="-mr-3 flex min-h-11 items-center gap-2 rounded-xl px-3 font-mono text-[15px] active:bg-ground focus-visible:outline-2 focus-visible:outline-ink"
      >
        <span className={copied ? "font-sans text-[15px] font-medium text-success" : ""}>
          {copied ? "Copied" : shortAddress(address)}
        </span>
        <span className="text-hint">
          <CopyIcon size={16} />
        </span>
      </button>
      <span role="status" className="sr-only">
        {copied && "Copied"}
      </span>
    </>
  );
}
