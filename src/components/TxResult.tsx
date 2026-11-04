import Link from "next/link";
import type { Direction } from "@/lib/address/types";
import { shortId, type Chain } from "@/lib/detect";
import { formatAmount, formatEur, formatWait, shortAddress } from "@/lib/format";
import type { TxStatus, TxValue } from "@/lib/status";
import { DetailsSheet } from "./DetailsSheet";
import { EnsLine, type Ens } from "./EnsLine";
import { Frame } from "./Frame";
import { Heading } from "./Heading";
import { ArrowRightIcon, LockIcon } from "./icons";
import { Following } from "./Following";
import { Disc } from "./StatusCircle";
import { StillLooking } from "./StillLooking";

const GREEN = "#0B6B45";
const AMBER = "#B86A00";
const RED = "#A3231B";

const NATIVE: Record<Chain, string> = { eth: "ETH", base: "ETH", arb: "ETH", op: "ETH", sol: "SOL", btc: "BTC" };
const GONE = "#5B6472";
// Seconds between lookups: one block on ETH and SOL. Bitcoin blocks take ~10 min, so every 30 s. The L2s make a block
// in 2 s or less, but 5 s is often enough and spares the requests.
const BLOCK_SECONDS: Record<Chain, number> = { eth: 12, base: 5, arb: 5, op: 5, sol: 2, btc: 30 };
const MINUTES_PER_BLOCK = 10;

// No transaction yet: how long to keep looking, and what to say meanwhile.
const UNKNOWN = {
  seconds: 120,
  looking: { word: "Not found", line: "Other chain? We do ETH, Base, Arbitrum, Optimism, SOL and BTC" },
  stopped: { word: "Not found", line: "Other chain? We do ETH, Base, Arbitrum, Optimism, SOL and BTC" },
};
const NOT_FOUND = {
  eth: UNKNOWN,
  base: UNKNOWN,
  arb: UNKNOWN,
  op: UNKNOWN,
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

/**
 * One status circle, one status word and at most one line. Found through an address, it also
 * says whether the transaction was `direction` and has `below` it a way to pick another one, and, when it
 * went by an ENS name, that name above it (`ens`);
 * `waiting` is then what a pending transaction says when it has no cause to show, and `arrived`
 * that it turned up just now, while the address was being watched.
 */
export function TxResult({
  chain,
  id,
  status,
  direction,
  ens,
  waiting = "Waiting to be included",
  arrived = false,
  logo = true,
  below,
}: {
  chain: Chain;
  id: string;
  status: TxStatus;
  direction?: Direction;
  ens?: Ens;
  waiting?: string;
  arrived?: boolean;
  // False when no network has the transaction: the header then shows no network.
  logo?: boolean;
  below?: React.ReactNode;
}) {
  const label = (ens || direction) && (
    <>
      {ens && <EnsLine ens={ens} />}
      {direction && <DirectionLabel direction={direction} />}
    </>
  );
  if (status.kind === "replaced") {
    return (
      <Frame chain={chain} pasteAgain>
        {label}
        <Replaced chain={chain} by={status.by} />
        {below}
      </Frame>
    );
  }
  if (status.kind === "notFound") {
    return (
      <Frame chain={logo ? chain : undefined} pasteAgain>
        {label}
        <StillLooking refreshSeconds={BLOCK_SECONDS[chain]} {...NOT_FOUND[chain]} />
        {below}
      </Frame>
    );
  }
  return (
    <Frame chain={chain} pasteAgain>
      {label}
      <Following
        kind={status.kind}
        seconds={BLOCK_SECONDS[chain]}
        {...LOOK[status.kind]}
        progress={progressOf(status)}
        arrived={arrived}
        {...verdictOf(status, waiting)}
      >
        <Value chain={chain} value={status.value} notSent={status.kind === "failed"} />
      </Following>
      <DetailsSheet chain={chain} id={id} details={status.details} notSent={status.kind === "failed"} />
      {below}
    </Frame>
  );
}

/** Found through an address, a transaction is not necessarily the user's own: say which way it went. */
function DirectionLabel({ direction }: { direction: Direction }) {
  return <p className="-mb-2 text-[15px] font-medium text-muted">{direction === "sent" ? "Sent" : "Received"}</p>;
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
function verdictOf(
  status: Found,
  waiting: string,
): { word: string; wordClass: string; line: React.ReactNode; lineKey: string } {
  switch (status.kind) {
    case "final":
      return {
        word: "Success",
        wordClass: "text-success",
        lineKey: "Final",
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
      return withKey({ word: "Success", wordClass: "text-success", line: `Final in ${formatWait(status.secondsToFinal)}` });
    case "pending":
      return withKey({
        word: "Pending",
        wordClass: "text-pending",
        line: status.cause
          ? PENDING_CAUSE[status.cause]
          : status.blocksAway
            ? placeInLine(status.blocksAway)
            : waiting,
      });
    case "failed":
      return withKey({
        word: "Failed",
        wordClass: "text-danger",
        line: `${status.reason ?? "No reason given"}${status.feeEur !== null ? ` · ${formatEur(status.feeEur)} fee paid` : ""}`,
      });
  }
}

/** A line that is plain text is its own key. */
function withKey(verdict: { word: string; wordClass: string; line: string }) {
  return { ...verdict, lineKey: verdict.line };
}

/** The amount and its euro value, or the contract or program and the coin sent to it. */
function Value({
  chain,
  value,
  notSent = false,
}: {
  chain: Chain;
  value: TxValue;
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
        className={`max-w-full line-clamp-3 leading-tight [overflow-wrap:anywhere] ${mainSize(main, isAddress)} ${
          notSent ? "line-through decoration-white/60 decoration-2" : ""
        }`}
      >
        {main}
      </span>
      {sub && (
        // The circle sets --sub: grey on the ring, soft white on the disc.
        <span className="line-clamp-2 max-w-full text-[15px] text-(--sub) [overflow-wrap:anywhere] motion-safe:transition-colors motion-safe:duration-[600ms] motion-safe:delay-500">
          {sub}
        </span>
      )}
    </>
  );
}

function mainSize(text: string, isAddress: boolean): string {
  if (isAddress) return "font-mono text-xl";
  if (text.length > 16) return "display text-[18px]";
  if (text.length > 11) return "display text-[22px]";
  return "display text-[28px]";
}
