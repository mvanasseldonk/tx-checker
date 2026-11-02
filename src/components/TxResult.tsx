import type { Chain } from "@/lib/detect";
import { formatAmount, formatEur, formatWait, shortAddress } from "@/lib/format";
import type { TxStatus, TxValue } from "@/lib/status";
import { DetailsSheet } from "./DetailsSheet";
import { Frame } from "./Frame";
import { Heading } from "./Heading";
import { LockIcon } from "./icons";
import { KeepChecking } from "./KeepChecking";
import { Disc, Ring } from "./StatusCircle";
import { StillLooking } from "./StillLooking";

const GREEN = "#0B6B45";
const AMBER = "#B86A00";
const RED = "#A3231B";

const NATIVE: Record<Chain, string> = { eth: "ETH", sol: "SOL" };
// Seconds between lookups: one block on each chain.
const BLOCK_SECONDS: Record<Chain, number> = { eth: 12, sol: 2 };

// Neither chain has a transaction yet: how long to keep looking, and what to say meanwhile.
const NOT_FOUND = {
  eth: {
    seconds: 120,
    looking: { word: "Not found", line: "Other chain? We only do ETH and SOL" },
    stopped: { word: "Not found", line: "Other chain? We only do ETH and SOL" },
  },
  // Solana has no queue: a transaction that never lands expires with its blockhash.
  sol: {
    seconds: 90,
    looking: { word: "Not seen yet", line: "Expires on its own · nothing charged" },
    stopped: { word: "Not found", line: "Expired · nothing charged" },
  },
};

const PENDING_CAUSE = {
  fee: "Fee too low · speed up in your wallet",
  nonce: "Waiting for an earlier transaction",
};

/** One status circle, one status word and at most one line. */
export function TxResult({ chain, status }: { chain: Chain; status: TxStatus }) {
  if (status.kind === "notFound") {
    return (
      <Frame chain={chain} pasteAgain>
        <StillLooking refreshSeconds={BLOCK_SECONDS[chain]} {...NOT_FOUND[chain]} />
      </Frame>
    );
  }
  return (
    <Frame chain={chain} pasteAgain>
      <Circle chain={chain} status={status} />
      <Verdict status={status} />
      <DetailsSheet details={status.details} notSent={status.kind === "failed"} />
      {(status.kind === "included" || status.kind === "pending") && (
        <KeepChecking seconds={BLOCK_SECONDS[chain]} />
      )}
    </Frame>
  );
}

function Circle({ chain, status }: { chain: Chain; status: Exclude<TxStatus, { kind: "notFound" }> }) {
  switch (status.kind) {
    case "final":
      return (
        <Disc color={GREEN} shadow="rgba(11,107,69,0.5)">
          <Value chain={chain} value={status.value} onDisc />
        </Disc>
      );
    case "included":
      return (
        <Ring color={GREEN} track="rgba(11,107,69,0.15)" progress={Math.max(0.04, status.progress)}>
          <Value chain={chain} value={status.value} />
        </Ring>
      );
    case "pending":
      return (
        <Ring color={AMBER} track="rgba(184,106,0,0.15)" progress={0.11}>
          <Value chain={chain} value={status.value} />
        </Ring>
      );
    case "failed":
      return (
        <Disc color={RED} shadow="rgba(163,35,27,0.5)">
          <Value chain={chain} value={status.value} onDisc notSent />
        </Disc>
      );
  }
}

function Verdict({ status }: { status: Exclude<TxStatus, { kind: "notFound" }> }) {
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
          Final in {formatWait(status.secondsToFinal)}
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
  }
}

/** The amount and its euro value, or the contract or program and the coin sent to it. */
function Value({
  chain,
  value,
  onDisc = false,
  notSent = false,
}: {
  chain: Chain;
  value: TxValue;
  onDisc?: boolean;
  notSent?: boolean;
}) {
  const main =
    value.kind === "amount"
      ? `${formatAmount(value.amount)} ${value.symbol}`
      : (value.name ?? shortAddress(value.address));
  const sub = notSent
    ? "not sent"
    : value.kind === "amount"
      ? value.eur !== null && formatEur(value.eur)
      : value.sent > 0 && `${formatAmount(value.sent)} ${NATIVE[chain]} sent`;
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
