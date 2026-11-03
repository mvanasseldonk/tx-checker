import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AddressNote } from "@/components/AddressNote";
import { Checking } from "@/components/Checking";
import { NotThisOne } from "@/components/NotThisOne";
import { PasteScreen } from "@/components/PasteScreen";
import { TxResult } from "@/components/TxResult";
import { Unavailable } from "@/components/Unavailable";
import { LOOKUP_ADDRESS } from "@/lib/address/lookup";
import { showReceived } from "@/lib/address/received";
import type { Candidate } from "@/lib/address/types";
import { detectAddress, type Chain } from "@/lib/detect";
import { LOOKUP } from "@/lib/lookup";

export default function AddressPage({ params }: PageProps<"/address/[address]">) {
  return (
    <Suspense fallback={<Checking />}>
      {params.then(({ address }) => (
        <Address address={decodeURIComponent(address)} />
      ))}
    </Suspense>
  );
}

function Address({ address }: { address: string }) {
  const detection = detectAddress(address);
  if (!detection.ok) return <PasteScreen initialInvalid />;
  return (
    <Suspense fallback={<Checking chain={detection.chain} id={detection.id} />}>
      <LiveAddress chain={detection.chain} address={detection.id} />
    </Suspense>
  );
}

async function LiveAddress({ chain, address }: { chain: Chain; address: string }) {
  // The latest transaction is live data: look it up per request, never in a prerender that gets cached.
  await connection();
  const activity = await LOOKUP_ADDRESS[chain](address).catch((error: unknown) => {
    unstable_rethrow(error);
    console.error(`Looking up address ${address} failed`, error);
    return null;
  });
  if (!activity) return <Unavailable chain={chain} />;
  if (activity.kind === "busy") {
    return (
      <AddressNote chain={chain} address={address} word="Busy">
        This address is too busy · paste the transaction instead
      </AddressNote>
    );
  }
  if (activity.kind === "empty") {
    return (
      <AddressNote chain={chain} address={address} word="Empty">
        No transactions yet
      </AddressNote>
    );
  }
  return <Latest chain={chain} address={address} candidates={activity.candidates} />;
}

/** The newest transaction as a normal result, with the others a tap away. */
async function Latest({
  chain,
  address,
  candidates,
}: {
  chain: Chain;
  address: string;
  candidates: Candidate[];
}) {
  const [latest] = candidates;
  const status = await LOOKUP[chain](latest.id)
    .then((found) => showReceived(chain, address, found, latest))
    .catch((error: unknown) => {
    unstable_rethrow(error);
    console.error(`Looking up ${latest.id} failed`, error);
    return null;
  });
  if (!status) return <Unavailable chain={chain} />;
  return (
    <TxResult
      chain={chain}
      id={latest.id}
      status={status}
      direction={latest.direction}
      // Only an outgoing pending transaction can be seen on Ethereum, so this is what it is.
      waiting={chain === "eth" && latest.pending ? "Pending transaction from this address" : undefined}
      below={<NotThisOne candidates={candidates} currentId={latest.id} />}
    />
  );
}
