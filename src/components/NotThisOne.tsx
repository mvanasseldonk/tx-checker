"use client";

import Link from "next/link";
import { useState } from "react";
import type { Candidate } from "@/lib/address/types";
import { formatAmount, formatTime } from "@/lib/format";

/** A quiet "Not this one?" that opens the last few transactions of the address, each a link to follow it. */
export function NotThisOne({ candidates, currentId }: { candidates: Candidate[]; currentId: string }) {
  const [open, setOpen] = useState(false);
  // Only a single transaction found: there is no other one to pick.
  if (candidates.length < 2) return null;
  return (
    <div className="flex w-full flex-col items-center">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="min-h-11 rounded-full px-5 text-[15px] text-muted underline decoration-hint underline-offset-4 active:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Not this one?
      </button>
      {/* The list only exists while open, so times render in the viewer's time zone, never the server's. */}
      {open && (
        <ul className="mt-2 w-full divide-y divide-ink/10 overflow-hidden rounded-2xl bg-white">
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <Row candidate={candidate} current={candidate.id === currentId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Row({ candidate, current }: { candidate: Candidate; current: boolean }) {
  const { id, direction, time, amount } = candidate;
  return (
    <Link
      href={`/tx/${id}`}
      aria-current={current || undefined}
      className="flex min-h-14 items-center justify-between gap-4 px-4 py-2 text-[15px] active:bg-ground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ink"
    >
      <span className="flex min-w-0 flex-col">
        <span className={current ? "font-semibold" : ""}>{time === null ? "Pending" : formatTime(time)}</span>
        <span className="text-sm text-muted">{direction === "sent" ? "Sent" : "Received"}</span>
      </span>
      {amount && (
        <span className="min-w-0 truncate text-right">
          {formatAmount(amount.amount)} {amount.symbol}
        </span>
      )}
    </Link>
  );
}
