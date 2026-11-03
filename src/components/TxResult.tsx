import Link from "next/link";
import { shortId, type Chain } from "@/lib/detect";
import { formatAmount, formatEur, formatWait, shortAddress } from "@/lib/format";
import type { TxStatus, TxValue } from "@/lib/status";
import { DetailsSheet } from "./DetailsSheet";
import { Frame } from "./Frame";
import { Heading } from "./Heading";
import { ArrowRightIcon, LockIcon } from "./icons";
import { Following } from "./Following";
import { Disc } from "./StatusCircle";
import { StillLooking } from "./StillLooking";

const GREEN = "#0B6B45";
const AMBER = "#B86A00";
const RED = "#A3231B";

const NATIVE: Record<Chain, string> = { eth: "ETH", sol: "SOL", btc: "BTC" };
const GONE = "#5B6472";
// Seconds between lookups: one block on ETH and SOL. Bitcoin blocks take ~10 min, so every 30 s.
const BLOCK_SECONDS: Record<Chain, number> = { eth: 12, sol: 2, btc: 30 };
const MINUTES_PER_BLOCK = 10;

// No transaction yet: how long to keep looking, and what to say meanwhile.
const UNKNOWN = {
  seconds: 120,
  looking: { word: "Not found", line: "Other chain? We only do ETH, SOL and BTC" },
  stopped: { word: "Not found", line: "Other chain? We only do ETH, SOL and BTC" },
};
const NOT_FOUND = {
  eth: UNKNOWN,
  btc: UNKNOWN,
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

function placeInLine(blocksAway: number): string {
  if (blocksAway === 1) return "Next block";
  return `In ~${blocksAway} blocks · ~${blocksAway * MINUTES_PER_BLOCK} min`;
}

/** One status circle, one status word and at most one line. */
export function TxResult({ chain, id, status }: { chain: Chain; id: string; status: TxStatus }) {
  if (status.kind === "replaced") {
    return (
      <Frame chain={chain} pasteAgain>
        <Replaced chain={chain} by={status.by} />
      </Frame>
    );
  }
  if (status.kind === "notFound") {
    return (
      <Frame chain={chain} pasteAgain>
        <StillLooking refreshSeconds={BLOCK_SECONDS[chain]} {...NOT_FOUND[chain]} />
      </Frame>
    );
  }
  return (
    <Frame chain={chain} pasteAgain>
      <Following
        kind={status.kind}
        seconds={BLOCK_SECONDS[chain]}
        {...LOOK[status.kind]}
        progress={progressOf(status)}
        {...verdictOf(status)}
      >
        <Value
          chain={chain}
          value={status.value}
          onDisc={status.kind === "final" || status.kind === "failed"}
          notSent={status.kind === "failed"}
        />
      </Following>
      <DetailsSheet chain={chain} id={id} details={status.details} notSent={status.kind === "failed"} />
    </Frame>
  );
}

type Found = Exclude<TxStatus, { kind: "notFound" | "replaced" }>;

/** Bitcoin: swapped for another version. The circle leads to the one that took its place. */
function Replaced({ chain, by }: { chain: Chain; by: string }) {
  return (
    <>
      <Link
        href={`/tx/${by}`}
        aria-label={`Open the new transaction ${shortId(chain, by)}`}
        className="rounded-full transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
      >
        <Disc color={GONE} shadow="rgba(91,100,114,0.5)">
          <span className="text-[15px] text-white/85">replaced by</span>
          <span className="font-mono text-xl">{shortId(chain, by)}</span>
          <span className="text-white/85">
            <ArrowRightIcon size={20} />
          </span>
        </Disc>
      </Link>
      <Heading word="Replaced" color="text-gone">
        Sped up or cancelled in your wallet
      </Heading>
    </>
  );
}

/** Colors of each status: the ring, its track and the shadow of the disc it settles into. */
const LOOK = {
  final: { color: GREEN, track: "rgba(11,107,69,0.15)", shadow: "rgba(11,107,69,0.5)" },
  included: { color: GREEN, track: "rgba(11,107,69,0.15)", shadow: "rgba(11,107,69,0.5)" },
  pending: { color: AMBER, track: "rgba(184,106,0,0.15)", shadow: "rgba(184,106,0,0.5)" },
  failed: { color: RED, track: "rgba(163,35,27,0.15)", shadow: "rgba(163,35,27,0.5)" },
};

/** How far round the ring goes: a Final or Failed one is complete, as the disc it turns into. */
function progressOf(status: Found): number {
  switch (status.kind) {
    case "final":
    case "failed":
      return 1;
    case "included":
      return Math.max(0.04, status.progress);
    case "pending":
      return 0.11;
  }
}

/** The status word and the one line under it. */
function verdictOf(status: Found): { word: string; wordClass: string; line: React.ReactNode } {
  switch (status.kind) {
    case "final":
      return {
        word: "Success",
        wordClass: "text-success",
        line: (
          <>
            <span className="mr-1.5 inline-block align-[-1px]">
              <LockIcon size={14} />
            </span>
            Final
          </>
        ),
      };
    case "included":
      return { word: "Success", wordClass: "text-success", line: `Final in ${formatWait(status.secondsToFinal)}` };
    case "pending":
      return {
        word: "Pending",
        wordClass: "text-pending",
        line: status.cause
          ? PENDING_CAUSE[status.cause]
          : status.blocksAway
            ? placeInLine(status.blocksAway)
            : "Waiting to be included",
      };
    case "failed":
      return {
        word: "Failed",
        wordClass: "text-danger",
        line: `${status.reason ?? "No reason given"}${status.feeEur !== null ? ` · ${formatEur(status.feeEur)} fee paid` : ""}`,
      };
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
      ? [value.eur !== null && formatEur(value.eur), value.recipients && `to ${value.recipients} addresses`]
          .filter(Boolean)
          .join(" · ")
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
