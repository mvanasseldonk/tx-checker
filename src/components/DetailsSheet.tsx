"use client";

import { useEffect, useRef, useState } from "react";
import type { Chain } from "@/lib/detect";
import { explorerFor } from "@/lib/explorer";
import { formatAmount, formatEur, formatTime, shortAddress } from "@/lib/format";
import type { TxAmount, TxDetails } from "@/lib/status";
import { staggerDelay } from "@/lib/motion";
import { shareLink, txLink, type ShareOutcome } from "@/lib/share";
import { CopyIcon, DoneIcon, ShareIcon } from "./icons";
import { Sheet, type SheetHandle } from "./Sheet";

// The rows come in one after another, starting while the sheet is still on its way up.
const ROW_LEAD_MS = 90;
const ROW_STEP_MS = 25;

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
  const sheet = useRef<SheetHandle>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => sheet.current?.show()}
        className="min-h-11 rounded-full px-5 text-[15px] font-medium text-ink underline decoration-ink/30 underline-offset-4 active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Details
      </button>
      <Sheet ref={sheet} title="Details" footer={<Actions chain={chain} id={id} />}>
        <dl>
          <Fields details={details} notSent={notSent} />
        </dl>
      </Sheet>
    </>
  );
}

const NOTICE_MS = 2000;

/** Share the link to this transaction, or go on to the explorer: two equal buttons side by side. */
function Actions({ chain, id }: { chain: Chain; id: string }) {
  const [outcome, setOutcome] = useState<ShareOutcome | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [link, setLink] = useState("");
  // Counts the copies, so that the check pops again when the link is copied a second time.
  const [copies, setCopies] = useState(0);

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
    if (result === "copied") setCopies((count) => count + 1);
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
          <DoneIcon done={copied} stamp={copies} size={18} icon={<ShareIcon size={18} />} />
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
  const rows: { label: string; content: React.ReactNode }[] = [];
  if (to) {
    rows.push({
      label: "To",
      content: (
        <>
          {to.name && <span className="font-medium [overflow-wrap:anywhere]">{to.name}</span>}
          <Address address={to.address} />
          {to.method && <span className="text-[15px] text-muted [overflow-wrap:anywhere]">{to.method}</span>}
        </>
      ),
    });
  }
  if (details.from) rows.push({ label: "From", content: <Address address={details.from} /> });
  if (amount)
    rows.push({
      label: "Amount",
      content: <Money money={amount} note={notSent ? "not sent" : undefined} />,
    });
  if (fee) rows.push({ label: "Fee", content: <Money money={fee} /> });
  rows.push({
    label: "Time",
    content: <span>{time === null ? "Not yet" : formatTime(time)}</span>,
  });
  return (
    <>
      {rows.map((row, index) => (
        <Field key={row.label} label={row.label} index={index}>
          {row.content}
        </Field>
      ))}
    </>
  );
}

/** One row; the `index`-th starts a little after the one before it. */
function Field({ label, index, children }: { label: string; index: number; children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-14 items-center justify-between gap-6 border-t border-ink/10 py-2 first:border-t-0 motion-safe:animate-rise-fast"
      style={
        {
          "--delay": `${staggerDelay(index, { step: ROW_STEP_MS, lead: ROW_LEAD_MS })}ms`,
        } as React.CSSProperties
      }
    >
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
  const [copies, setCopies] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      return;
    }
    setCopied(true);
    setCopies((count) => count + 1);
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
          <DoneIcon done={copied} stamp={copies} size={16} icon={<CopyIcon size={16} />} />
        </span>
      </button>
      <span role="status" className="sr-only">
        {copied && "Copied"}
      </span>
    </>
  );
}
