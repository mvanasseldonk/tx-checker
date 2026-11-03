import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddressNote } from "@/components/AddressNote";
import { Checking } from "@/components/Checking";
import { NotThisOne } from "@/components/NotThisOne";
import { NothingNew } from "@/components/NothingNew";
import { PasteScreen } from "@/components/PasteScreen";
import { TxResult } from "@/components/TxResult";
import { Unavailable } from "@/components/Unavailable";
import { Watch, WatchNote } from "@/components/Watch";
import { LOOKUP_ADDRESS } from "@/lib/address/lookup";
import { showReceived } from "@/lib/address/received";
import type { Candidate } from "@/lib/address/types";
import { detectAddress, type Chain } from "@/lib/detect";
import { LOOKUP } from "@/lib/lookup";
import type { TxStatus } from "@/lib/status";
import { parseSeen, shownCandidate, WATCH_SECONDS } from "@/lib/watch";

// The name comes from the layout: "Address · Ancoro".
export const metadata: Metadata = { title: "Address" };

export default function AddressPage({ params, searchParams }: PageProps<"/address/[address]">) {
  return (
    <Suspense fallback={<Checking />}>
      {Promise.all([params, searchParams]).then(([{ address }, query]) => (
        <Address address={decodeURIComponent(address)} opened={parseSeen(query.seen)} />
      ))}
    </Suspense>
  );
}

function Address({ address, opened }: { address: string; opened: string[] | null }) {
  const detection = detectAddress(address);
  if (!detection.ok) return <PasteScreen initialInvalid />;
  return (
    <Suspense fallback={<Checking chain={detection.chain} id={detection.id} />}>
      <LiveAddress chain={detection.chain} address={detection.id} opened={opened} />
    </Suspense>
  );
}

/**
 * `opened` is the transactions the address had when it was first opened, null on that first
 * visit: what is "new" is measured against it. The page watches the address for a new one.
 */
async function LiveAddress({
  chain,
  address,
  opened,
}: {
  chain: Chain;
  address: string;
  opened: string[] | null;
}) {
  // The latest transaction is live data: look it up per request, never in a prerender that gets cached.
  await connection();
  const activity = await LOOKUP_ADDRESS[chain](address).catch((error: unknown) => {
    unstable_rethrow(error);
    console.error(`Looking up address ${address} failed`, error);
    return null;
  });
  // A failed look in the middle of watching does not end it, nor replace what is shown: the next one may work.
  if (!activity) {
    const unavailable = <Unavailable chain={chain} />;
    return opened ? watching(chain, opened, opened[0] ?? null, unavailable, { failed: true }) : unavailable;
  }
  if (activity.kind === "busy") {
    return (
      <AddressNote chain={chain} address={address} word="Busy">
        This address is too busy · paste the transaction instead
      </AddressNote>
    );
  }

  const candidates = activity.kind === "found" ? activity.candidates : [];
  const seen = opened ?? candidates.map((candidate) => candidate.id);
  const shown = shownCandidate(candidates, seen);
  const status = shown && (await statusOf(chain, address, shown));
  const latest = candidates[0]?.id ?? null;

  if (!shown) {
    return watching(
      chain,
      seen,
      latest,
      <NothingNew
        chain={chain}
        address={address}
        empty={candidates.length === 0}
        below={<NotThisOne candidates={candidates} />}
      />,
    );
  }
  if (!status) return watching(chain, seen, latest, <Unavailable chain={chain} />, { failed: true });
  const ringMoves = status.kind === "pending" || status.kind === "included";
  return watching(
    chain,
    seen,
    latest,
    <TxResult
      // A transaction that takes the place of another starts its circle afresh.
      key={shown.id}
      chain={chain}
      id={shown.id}
      status={status}
      direction={shown.direction}
      // Only an outgoing pending transaction can be seen on Ethereum, so this is what it is.
      waiting={chain === "eth" && shown.pending ? "Pending transaction from this address" : undefined}
      arrived={!seen.includes(shown.id)}
      below={
        <div className="flex w-full flex-col items-center gap-1">
          <WatchNote ringMoves={ringMoves} />
          <NotThisOne candidates={candidates} currentId={shown.id} />
        </div>
      }
    />,
    // Included, a transaction is on its way to Final: watch for as long as that takes.
    { hold: status.kind === "included" },
  );
}

function watching(
  chain: Chain,
  seen: string[],
  latest: string | null,
  page: React.ReactNode,
  { hold = false, failed = false } = {},
) {
  return (
    <Watch seconds={WATCH_SECONDS[chain]} seen={seen} latest={latest} hold={hold} failed={failed}>
      {page}
    </Watch>
  );
}

/** The status of a transaction of the address, with what the address received in it; null if that failed. */
function statusOf(chain: Chain, address: string, candidate: Candidate): Promise<TxStatus | null> {
  return LOOKUP[chain](candidate.id)
    .then((found) => showReceived(chain, address, found, candidate))
    .catch((error: unknown) => {
      unstable_rethrow(error);
      console.error(`Looking up ${candidate.id} failed`, error);
      return null;
    });
}
