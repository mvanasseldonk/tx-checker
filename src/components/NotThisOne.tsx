"use client";

import Link from "next/link";
import { useState } from "react";
import type { AddressChain } from "@/lib/detect";
import type { Candidate } from "@/lib/address/types";
import { formatAmount, formatTime } from "@/lib/format";
import { staggerDelay } from "@/lib/motion";

/**
 * A quiet "Not this one?" that opens the last few transactions of the address, each a link to follow it.
 * When none is shown (`currentId` is absent), it reads "Earlier transactions". The list builds up one row after
 * another, each time it opens.
 */
export function NotThisOne({
  chain,
  candidates,
  currentId,
  initialOpen = false,
}: {
  chain: AddressChain;
  candidates: Candidate[];
  currentId?: string;
  initialOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);
  // Only the transaction that is shown: there is no other one to pick.
  if (candidates.every((candidate) => candidate.id === currentId)) return null;
  return (
    <div className="flex w-full flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="min-h-11 rounded-full px-5 text-[15px] text-muted underline decoration-hint underline-offset-4 active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        {currentId ? "Not this one?" : "Earlier transactions"}
      </button>
      {/* The list only exists while open, so times render in the viewer's time zone, never the server's. */}
      {open && (
        <ul className="mt-2 w-full divide-y divide-ink/10 overflow-hidden rounded-2xl bg-white">
          {candidates.map((candidate, index) => (
            <li
              key={candidate.id}
              className="motion-safe:animate-rise-fast"
              style={{ "--delay": `${staggerDelay(index, { step: 30, cap: 7 })}ms` } as React.CSSProperties}
            >
              <Row chain={chain} candidate={candidate} current={candidate.id === currentId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ chain, candidate, current }: { chain: AddressChain; candidate: Candidate; current: boolean }) {
  const { id, direction, time, amount } = candidate;
  return (
    <Link
      // An Ethereum address has Ethereum transactions: the page then asks that network only.
      href={`/tx/${id}${chain === "eth" ? "?chain=eth" : ""}`}
      aria-current={current || undefined}
      className="flex min-h-14 items-center justify-between gap-4 px-4 py-2 text-[15px] active:bg-ground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
    >
      <span className="flex min-w-0 flex-col">
        <span className={`whitespace-nowrap ${current ? "font-semibold" : ""}`}>{time === null ? "Pending" : formatTime(time)}</span>
        <span className="text-[15px] text-muted">{direction === "sent" ? "Sent" : "Received"}</span>
      </span>
      {amount && (
        <span className="min-w-0 truncate text-right">
          {formatAmount(amount.amount)} {amount.symbol}
        </span>
      )}
    </Link>
  );
}
