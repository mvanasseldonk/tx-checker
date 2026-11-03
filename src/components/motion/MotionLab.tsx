"use client";

// TEMPORARY (S14): see app/motion/page.tsx. Removed once the PO has approved the animations.

import { useEffect, useRef, useState } from "react";
import type { Candidate } from "@/lib/address/types";
import { shake } from "@/lib/motion";
import type { TxDetails } from "@/lib/status";
import { DetailsSheet } from "../DetailsSheet";
import { Following } from "../Following";
import { FrameHeader } from "../Frame";
import { Heading } from "../Heading";
import { DoneIcon, ShareIcon, CopyIcon } from "../icons";
import { NotThisOne } from "../NotThisOne";
import { PasteCircle } from "../PasteCircle";
import { TypeField } from "../TypeField";

const HASH = "0x448f3b960c99ae65462d9440479fadd52ce817971f754fc9ed2030f3d56f1b36";
const ADDRESS = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

const DETAILS: TxDetails = {
  from: ADDRESS,
  to: { address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", name: "Dai Stablecoin", method: "transfer" },
  amount: { amount: 1.25, symbol: "ETH", eur: 3120 },
  fee: { amount: 0.0004, symbol: "ETH", eur: 1.02 },
  time: 1_762_180_000,
};

const NOW = 1_762_180_000;
const CANDIDATES: Candidate[] = [
  { id: HASH, direction: "received", time: NOW, pending: false, amount: { amount: 1.25, symbol: "ETH" } },
  { id: `0x${"a1".repeat(32)}`, direction: "sent", time: NOW - 3_600, pending: false, amount: { amount: 0.4, symbol: "ETH" } },
  { id: `0x${"b2".repeat(32)}`, direction: "received", time: NOW - 86_400, pending: false, amount: { amount: 2, symbol: "ETH" } },
  { id: `0x${"c3".repeat(32)}`, direction: "sent", time: NOW - 172_800, pending: false, amount: { amount: 0.05, symbol: "ETH" } },
  { id: `0x${"d4".repeat(32)}`, direction: "received", time: NOW - 259_200, pending: false, amount: { amount: 12, symbol: "ETH" } },
];

const SWAP_STEPS = [
  { word: "Pending", color: "text-pending", line: "In ~2 blocks · ~20 min" },
  { word: "Success", color: "text-success", line: "Final in ~3 min" },
  { word: "Success", color: "text-success", line: "Final in ~2 min" },
  { word: "Success", color: "text-success", line: "Final in ~1 min" },
];

const BUTTON =
  "min-h-11 rounded-full bg-ink px-5 text-[15px] font-medium text-white active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function MotionLab() {
  const [reduced, setReduced] = useState(false);

  // The switch makes motion-safe: and motion-reduce: (and the code that checks) act as if the system asked for less motion.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-reduce-motion", reduced);
    return () => document.documentElement.removeAttribute("data-reduce-motion");
  }, [reduced]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-6 pt-8 pb-16">
      <header className="flex flex-col gap-2">
        <h1 className="display text-[32px]">Motion lab</h1>
        <p className="text-[15px] text-muted">
          Temporary page for reviewing story S14. Every animation of the app, each with a Replay button. Not on production.
        </p>
        <label className="flex min-h-11 items-center gap-3 rounded-2xl bg-white px-4 text-[15px]">
          <input
            type="checkbox"
            checked={reduced}
            onChange={(event) => setReduced(event.target.checked)}
            className="size-5 accent-ink"
          />
          Simulate reduced motion
        </label>
        <p className="text-[13px] text-hint">
          {reduced
            ? "On: everything appears at once, without motion."
            : "Off: follows the system setting (Settings, Accessibility, Reduce Motion)."}
        </p>
      </header>

      <Landing />
      <QuietHeader />
      <WordSwap />
      <NotRecognised />
      <CopyAndShare />
      <Sheet />
      <EarlierList />
      <ArrowButton />
      <InvitingPaste />
    </main>
  );
}

/** A card with a title, the numbers, a Replay button and the demo, which starts afresh on every replay. */
function Demo({
  number,
  title,
  timing,
  onReplay,
  replayLabel = "Replay",
  children,
}: {
  number: number;
  title: string;
  timing: string;
  onReplay: () => void;
  replayLabel?: string;
  children: (run: number) => React.ReactNode;
}) {
  const [run, setRun] = useState(0);
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-ink/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">
            {number}. {title}
          </h2>
          <p className="text-[13px] text-muted">{timing}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setRun((count) => count + 1);
            onReplay();
          }}
          className={`${BUTTON} flex-none`}
        >
          {replayLabel}
        </button>
      </div>
      <div data-demo-body className="flex min-h-40 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl bg-ground py-6">
        {children(run)}
      </div>
    </section>
  );
}

const nothing = () => {};

function Landing() {
  return (
    <Demo
      number={1}
      title="Landing"
      timing="Circle: 1 to 1.02 to 1 in 400 ms. Words: fade up 7 px after 40 ms, 40 ms apart, 300 ms each."
      onReplay={nothing}
    >
      {(run) => (
        <div key={run} className="flex flex-col items-center gap-7">
          <Following
            kind="final"
            seconds={12}
            color="#0B6B45"
            track="rgba(11,107,69,0.15)"
            shadow="rgba(11,107,69,0.5)"
            progress={1}
            word="Success"
            wordClass="text-success"
            line="Final"
            lineKey="Final"
          >
            <span className="display text-[28px] leading-tight">1.25 ETH</span>
            <span className="text-[15px] text-(--sub)">€3,120</span>
          </Following>
        </div>
      )}
    </Demo>
  );
}

function QuietHeader() {
  return (
    <Demo
      number={2}
      title="Quiet header"
      timing="Chain logo, mark and paste button fade in over 250 ms, 300 ms after the page appears (once the circle has landed)."
      onReplay={nothing}
    >
      {(run) => (
        <div key={run} className="w-full px-4">
          <FrameHeader chain="eth" pasteAgain />
        </div>
      )}
    </Demo>
  );
}

function WordSwap() {
  const [step, setStep] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    const running = timers.current;
    return () => running.forEach(clearTimeout);
  }, []);

  function play() {
    timers.current.forEach(clearTimeout);
    setStep(0);
    timers.current = SWAP_STEPS.slice(1).map((_, index) => setTimeout(() => setStep(index + 1), 1400 * (index + 1)));
  }

  const current = SWAP_STEPS[step];
  return (
    <Demo
      number={3}
      title="Word swap"
      timing="Old text slides up and out in 180 ms, the new one comes in from below in 300 ms. Fixed-height box, new text announced once."
      onReplay={play}
    >
      {() => (
        <>
          <Heading word={current.word} color={current.color} lineKey={current.line}>
            {current.line}
          </Heading>
          <button type="button" onClick={() => setStep((step + 1) % SWAP_STEPS.length)} className={BUTTON}>
            Next status
          </button>
        </>
      )}
    </Demo>
  );
}

function NotRecognised() {
  const circle = useRef<HTMLButtonElement>(null);
  const field = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState("hello");

  function reject() {
    setShown(true);
    shake(circle.current);
    shake(field.current);
  }

  return (
    <Demo
      number={4}
      title="Not recognised"
      timing="Three small moves out and back, 300 ms, together with the message. The Paste circle, and the field in type mode."
      onReplay={reject}
    >
      {() => (
        <>
          <PasteCircle onClick={reject} invalid={shown} morph={false} buttonRef={circle} describedBy={shown ? "lab-invalid" : undefined} />
          <div className="w-full px-4">
            <TypeField value={typed} invalid={shown} boxRef={field} onChange={setTyped} onPasteText={setTyped} />
          </div>
          {shown && (
            <p id="lab-invalid" role="alert" className="px-4 text-center text-base font-medium text-balance text-danger">
              Not an ETH, SOL or BTC transaction or address
            </p>
          )}
        </>
      )}
    </Demo>
  );
}

function CopyAndShare() {
  const [done, setDone] = useState(false);
  const [stamp, setStamp] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function copy() {
    setDone(true);
    setStamp((count) => count + 1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDone(false), 2000);
  }

  return (
    <Demo
      number={5}
      title="Copy and share"
      timing="The icon turns into a check with a pop: 0.6 to 1.1 to 1 in 250 ms. Also in the real sheet below (copy an address, or Share where there is no share sheet)."
      onReplay={copy}
    >
      {() => (
        <>
          <button type="button" onClick={copy} className="flex min-h-12 w-56 items-center justify-center gap-2 rounded-2xl bg-ink px-3 text-[15px] font-medium text-white active:scale-[0.98]">
            <DoneIcon done={done} stamp={stamp} size={18} icon={<ShareIcon size={18} />} />
            {done ? "Link copied" : "Share"}
          </button>
          <button type="button" onClick={copy} className="flex min-h-11 items-center gap-2 rounded-xl bg-white px-3 font-mono text-[15px] active:bg-ground">
            <span className={done ? "font-sans font-medium text-success" : ""}>{done ? "Copied" : "0xd8dA…6045"}</span>
            <span className="text-hint">
              <DoneIcon done={done} stamp={stamp} size={16} icon={<CopyIcon size={16} />} />
            </span>
          </button>
        </>
      )}
    </Demo>
  );
}

function Sheet() {
  const box = useRef<HTMLDivElement>(null);
  return (
    <div ref={box}>
      <Demo
        number={6}
        title="Details sheet"
        timing="The sheet slides up in 300 ms and settles with a light overshoot; the rows fade up 25 ms apart, from 90 ms, 180 ms each. Drag down to close."
        onReplay={() => {
          // The Details button of the real component opens it.
          requestAnimationFrame(() => box.current?.querySelector<HTMLButtonElement>("[data-demo-body] > button")?.click());
        }}
        replayLabel="Open"
      >
        {(run) => <DetailsSheet key={run} chain="eth" id={HASH} details={DETAILS} notSent={false} />}
      </Demo>
    </div>
  );
}

function EarlierList() {
  return (
    <Demo
      number={7}
      title="“Not this one?”"
      timing="The list builds up row by row: 30 ms apart, 180 ms each."
      onReplay={nothing}
    >
      {(run) => (
        <div key={run} className="w-full px-4">
          <NotThisOne candidates={CANDIDATES} currentId={HASH} initialOpen />
        </div>
      )}
    </Demo>
  );
}

function ArrowButton() {
  const [value, setValue] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  function replay() {
    setValue("");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setValue(ADDRESS), 700);
  }

  return (
    <Demo
      number={8}
      title="Type field"
      timing="The arrow goes from muted to ink with a slight scale in 300 ms once the field holds a valid hash or address. Type your own to try."
      onReplay={replay}
    >
      {() => (
        <form className="w-full px-4" onSubmit={(event) => event.preventDefault()}>
          <TypeField value={value} invalid={false} onChange={setValue} onPasteText={setValue} />
        </form>
      )}
    </Demo>
  );
}

function InvitingPaste() {
  return (
    <Demo
      number={9}
      title="Inviting Paste"
      timing="A soft halo breathes out from behind the circle: 3.6 s a cycle, ease-in-out, a soft ink glow, 30% at most. It is gone while pressed or shaking, never runs in type mode or during the morph, and not at all with reduced motion."
      onReplay={nothing}
    >
      {(run) => <PasteCircle key={run} onClick={nothing} invalid={false} morph={false} pulse />}
    </Demo>
  );
}
