"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RetryIcon } from "./icons";
import { Ring } from "./StatusCircle";

/** The empty grey circle as a button: tap it to look the transaction up again. */
export function Retry() {
  const router = useRouter();
  const [checking, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={checking}
      aria-label="Try again"
      className="rounded-full text-muted transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
    >
      <Ring color="#5B6472" track="rgba(91,100,114,0.15)" progress={checking ? 0.15 : 0} spinning={checking} landing>
        <RetryIcon size={36} strokeWidth={1.8} />
      </Ring>
    </button>
  );
}
