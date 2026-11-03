import Link from "next/link";
import { CHAIN_LABEL, type Chain } from "@/lib/detect";
import { ClipboardIcon } from "./icons";

/** The page around the status circle: chain label top left, a way back to Paste top right. */
export function Frame({
  chain,
  pasteAgain = false,
  children,
}: {
  chain?: Chain;
  pasteAgain?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-5 pb-8">
      <header className="flex h-11 items-center justify-between">
        {chain && <span className="text-xs tracking-[0.14em] text-muted">{CHAIN_LABEL[chain]}</span>}
        {pasteAgain && (
          <Link
            href="/"
            aria-label="Paste another transaction or address"
            className="ml-auto flex size-11 items-center justify-center rounded-full bg-ink text-white transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <ClipboardIcon size={18} strokeWidth={1.8} />
          </Link>
        )}
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-7 pb-10">{children}</div>
    </main>
  );
}
