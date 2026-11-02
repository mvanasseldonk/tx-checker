import type { EthStatus, EthValue } from "@/lib/eth";
import { formatAmount, formatEur, shortAddress } from "@/lib/format";
import { Frame } from "./Frame";
import { LockIcon } from "./icons";
import { KeepChecking } from "./KeepChecking";
import { Disc, Ring } from "./StatusCircle";
import { StillLooking } from "./StillLooking";

const GREEN = "#0B6B45";
const AMBER = "#B86A00";
const RED = "#A3231B";

const PENDING_CAUSE = {
  fee: "Fee too low · speed up in your wallet",
  nonce: "Waiting for an earlier transaction",
};

/** One status circle, one status word and at most one line. */
export function EthResult({ status }: { status: EthStatus }) {
  return (
    <Frame chain="eth" pasteAgain>
      <Circle status={status} />
      <Verdict status={status} />
      {(status.kind === "included" || status.kind === "pending") && <KeepChecking />}
    </Frame>
  );
}

function Circle({ status }: { status: EthStatus }) {
  switch (status.kind) {
    case "final":
      return (
        <Disc color={GREEN} shadow="rgba(11,107,69,0.5)">
          <Value value={status.value} onDisc />
        </Disc>
      );
    case "included":
      return (
        <Ring color={GREEN} track="rgba(11,107,69,0.15)" progress={Math.max(0.04, status.progress)}>
          <Value value={status.value} />
        </Ring>
      );
    case "pending":
      return (
        <Ring color={AMBER} track="rgba(184,106,0,0.15)" progress={0.11}>
          <Value value={status.value} />
        </Ring>
      );
    case "failed":
      return (
        <Disc color={RED} shadow="rgba(163,35,27,0.5)">
          <Value value={status.value} onDisc notSent />
        </Disc>
      );
    case "notFound":
      return <StillLooking />;
  }
}

function Verdict({ status }: { status: EthStatus }) {
  switch (status.kind) {
    case "final":
      return (
        <Heading word="Success" color="text-success">
          <span className="mr-1.5 inline-block align-[-1px]">
            <LockIcon size={14} />
          </span>
          Final
        </Heading>
      );
    case "included":
      return (
        <Heading word="Success" color="text-success">
          Final in ~{status.minutesToFinal} min
        </Heading>
      );
    case "pending":
      return (
        <Heading word="Pending" color="text-pending">
          {status.cause ? PENDING_CAUSE[status.cause] : "Waiting to be included"}
        </Heading>
      );
    case "failed":
      return (
        <Heading word="Failed" color="text-danger">
          {status.reason ?? "No reason given"}
          {status.feeEur !== null && ` · ${formatEur(status.feeEur)} fee paid`}
        </Heading>
      );
    case "notFound":
      return (
        <Heading word="Not found" color="text-gone">
          Other chain? We only do ETH and SOL
        </Heading>
      );
  }
}

function Heading({ word, color, children }: { word: string; color: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <h1 className={`text-[40px] leading-none font-semibold tracking-[-0.03em] ${color}`}>{word}</h1>
      <p className="text-[15px] text-balance text-muted">{children}</p>
    </div>
  );
}

/** The amount and its euro value, or the contract and the ETH sent to it. */
function Value({ value, onDisc = false, notSent = false }: { value: EthValue; onDisc?: boolean; notSent?: boolean }) {
  const main =
    value.kind === "amount"
      ? `${formatAmount(value.amount)} ${value.symbol}`
      : (value.name ?? shortAddress(value.address));
  const sub = notSent
    ? "not sent"
    : value.kind === "amount"
      ? value.eur !== null && formatEur(value.eur)
      : value.ethSent > 0 && `${formatAmount(value.ethSent)} ETH sent`;
  const isAddress = value.kind === "call" && !value.name;
  return (
    <>
      <span
        className={`max-w-full font-semibold tracking-[-0.02em] break-words ${mainSize(main, isAddress)} ${
          notSent ? "line-through decoration-white/60 decoration-2" : ""
        }`}
      >
        {main}
      </span>
      {sub && <span className={`text-[15px] ${onDisc ? "text-white/85" : "text-muted"}`}>{sub}</span>}
    </>
  );
}

function mainSize(text: string, isAddress: boolean): string {
  if (isAddress) return "font-mono text-xl";
  if (text.length > 16) return "text-lg";
  if (text.length > 11) return "text-[22px]";
  return "text-[28px]";
}
