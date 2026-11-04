import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Checking } from "@/components/Checking";
import { NetworkParam } from "@/components/NetworkParam";
import { PasteScreen } from "@/components/PasteScreen";
import { TxResult } from "@/components/TxResult";
import { Unavailable } from "@/components/Unavailable";
import { detectTransaction, EVM_CHAINS, isEvm, parseNetwork, type Chain, type EvmChain } from "@/lib/detect";
import { findFirst } from "@/lib/find";
import { logFailure } from "@/lib/logError";
import { LOOKUP } from "@/lib/lookup";

// The name comes from the layout: "Transaction · Ancoro".
export const metadata: Metadata = { title: "Transaction" };

export default function TxPage({ params, searchParams }: PageProps<"/tx/[id]">) {
  return (
    <Suspense fallback={<Checking />}>
      {Promise.all([params, searchParams]).then(([{ id }, query]) => (
        <Transaction id={decodeURIComponent(id)} network={parseNetwork(query.chain)} />
      ))}
    </Suspense>
  );
}

/** `network` is the `chain` of the URL: where a 0x hash is known to be, null when that is not known (or not valid). */
function Transaction({ id, network }: { id: string; network: EvmChain | null }) {
  const detection = detectTransaction(id);
  if (!detection.ok) return <PasteScreen initialInvalid />;
  const { chain } = detection;
  // A hash pasted from an explorer link carries its network; a bare 0x hash only has what the URL says.
  const known = isEvm(chain) ? (detection.explorer ? chain : network) : chain;
  return (
    // Until a network has the hash, the circle shows no network logo.
    <Suspense fallback={<Checking chain={known ?? chain} id={detection.id} logo={known !== null} />}>
      <LiveStatus chain={known ?? chain} known={known !== null} id={detection.id} />
    </Suspense>
  );
}

/** `known`: the network is certain. Otherwise `chain` is Ethereum for a 0x hash, which may be on any network. */
async function LiveStatus({ chain, known, id }: { chain: Chain; known: boolean; id: string }) {
  // A status is live data: look it up per request, never in a prerender that gets cached.
  await connection();
  const look = (on: Chain) =>
    LOOKUP[on](id).catch((error: unknown) => {
      unstable_rethrow(error);
      logFailure(`Looking up ${id} on ${on}`, error);
      throw error;
    });

  if (known) {
    const status = await look(chain).catch(() => null);
    if (!status) return <Unavailable chain={chain} />;
    // A network that does not have the hash is no reason to stop: it can be on another one.
    if (status.kind !== "notFound" || !isEvm(chain)) return <TxResult chain={chain} id={id} status={status} />;
  }

  const found = await findFirst(
    EVM_CHAINS.filter((network) => !known || network !== chain),
    look,
  );
  if (found.kind === "failed") return <Unavailable />;
  if (found.kind === "notFound") return <TxResult chain={chain} id={id} status={{ kind: "notFound" }} logo={false} />;
  return (
    <>
      <NetworkParam chain={found.chain} />
      <TxResult chain={found.chain} id={id} status={found.status} />
    </>
  );
}
