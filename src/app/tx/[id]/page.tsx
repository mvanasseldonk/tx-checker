import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import type { Hash } from "viem";
import { Checking } from "@/components/Checking";
import { EthResult } from "@/components/EthResult";
import { PasteScreen } from "@/components/PasteScreen";
import { Unavailable } from "@/components/Unavailable";
import { detectTransaction } from "@/lib/detect";
import { lookupEth } from "@/lib/eth";

export default function TxPage({ params }: PageProps<"/tx/[id]">) {
  return (
    <Suspense fallback={<Checking />}>
      {params.then(({ id }) => (
        <Transaction id={decodeURIComponent(id)} />
      ))}
    </Suspense>
  );
}

function Transaction({ id }: { id: string }) {
  const detection = detectTransaction(id);
  if (!detection.ok) return <PasteScreen initialInvalid />;
  // S3 replaces this with the status of a Solana transaction.
  if (detection.chain === "sol") return <Checking chain="sol" id={detection.id} />;
  return (
    <Suspense fallback={<Checking chain="eth" id={detection.id} />}>
      <EthTransaction hash={detection.id as Hash} />
    </Suspense>
  );
}

async function EthTransaction({ hash }: { hash: Hash }) {
  // A status is live data: look it up per request, never in a prerender that gets cached.
  await connection();
  const status = await lookupEth(hash).catch((error: unknown) => {
    unstable_rethrow(error);
    console.error(`Looking up ${hash} failed`, error);
    return null;
  });
  return status ? <EthResult status={status} /> : <Unavailable chain="eth" />;
}
