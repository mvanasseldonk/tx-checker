"use client";

import { useRef, useState } from "react";
import { HelpIcon } from "./icons";
import { Sheet, type SheetHandle } from "./Sheet";

const STEPS = [
  "Copy the transaction hash or an address from your wallet or exchange.",
  "Tap Paste. Your phone may ask for permission first.",
  "Keep the page open. It updates by itself.",
];

const STATUSES = [
  {
    word: "Pending",
    color: "text-pending",
    meaning: "Sent, but not in a block yet.",
  },
  {
    word: "Success",
    color: "text-success",
    meaning: "In a block. It went through, and is on its way to final.",
  },
  {
    word: "Final",
    color: "text-success",
    meaning: "Permanent. It can't be reversed anymore.",
  },
  {
    word: "Failed",
    color: "text-danger",
    meaning: "It didn't go through. The amount wasn't sent, but a fee can still be charged.",
  },
];

const SECTION = "border-t border-ink/10 py-4 text-[15px] first:border-t-0 first:pt-0";

/** The "?" on the Paste screen, rocking slowly, and the sheet that explains what Ancoro does and what its words mean. */
export function HowItWorks() {
  const sheet = useRef<SheetHandle>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => sheet.current?.show()}
        aria-label="How it works"
        className="-mr-2.5 flex size-11 items-center justify-center rounded-full text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
      >
        {/* Only the icon rocks, around its centre; the button holds still. Not while the sheet is open. */}
        <span className={`flex ${open ? "" : "motion-safe:animate-rock"}`}>
          <HelpIcon size={22} />
        </span>
      </button>
      <Sheet ref={sheet} title="How it works" scrolls onOpenChange={setOpen}>
        <p className={SECTION}>
          Ancoro tells you if your transaction went through, and follows it until it&apos;s final.
        </p>
        <ol className={`${SECTION} flex list-decimal flex-col gap-3 pl-5 marker:text-muted`}>
          {STEPS.map((step) => (
            <li key={step} className="pl-1">
              {step}
            </li>
          ))}
        </ol>
        <dl className={`${SECTION} flex flex-col gap-3`}>
          {STATUSES.map(({ word, color, meaning }) => (
            <div key={word} className="grid grid-cols-[4.5rem_1fr] gap-3">
              <dt className={`font-medium ${color}`}>{word}</dt>
              <dd className="text-muted">{meaning}</dd>
            </div>
          ))}
        </dl>
        <p className={`${SECTION} text-muted`}>
          Works with Ethereum, Solana, and Bitcoin. Ancoro only reads public blockchain data. It never asks for your
          keys and can&apos;t touch your funds.
        </p>
      </Sheet>
    </>
  );
}
