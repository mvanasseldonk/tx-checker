import type { Metadata } from "next";
import { unstable_rethrow } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Checking } from "@/components/Checking";
import { PasteScreen } from "@/components/PasteScreen";
import { TxResult } from "@/components/TxResult";
import { Unavailable } from "@/components/Unavailable";
import { detectTransaction, type Chain } from "@/lib/detect";
import { logFailure } from "@/lib/logError";
import { LOOKUP } from "@/lib/lookup";

// The name comes from the layout: "Transaction · Ancoro".
export const metadata: Metadata = { title: "Transaction" };

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
  return (
    <Suspense fallback={<Checking chain={detection.chain} id={detection.id} />}>
      <LiveStatus chain={detection.chain} id={detection.id} />
    </Suspense>
  );
}

async function LiveStatus({ chain, id }: { chain: Chain; id: string }) {
  // A status is live data: look it up per request, never in a prerender that gets cached.
  await connection();
  const status = await LOOKUP[chain](id).catch((error: unknown) => {
    unstable_rethrow(error);
    logFailure(`Looking up ${id}`, error);
    return null;
  });
  return status ? <TxResult chain={chain} id={id} status={status} /> : <Unavailable chain={chain} />;
}
