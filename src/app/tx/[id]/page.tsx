import { Suspense } from "react";
import { Checking } from "@/components/Checking";
import { PasteScreen } from "@/components/PasteScreen";
import { detectTransaction } from "@/lib/detect";

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
  // S2/S3 replace this with the live status of the transaction.
  return <Checking chain={detection.chain} id={detection.id} />;
}
