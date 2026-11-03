import type { Chain } from "@/lib/detect";
import { HomeMark } from "./brand/Brand";
import { ChainLogo } from "./ChainLogo";
import { PasteAgainButton } from "./PasteAgainButton";

/** The page around the status circle: chain logo top left, the small mark (home) in the middle, a button that pastes the next one top right. */
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
      <header className="grid h-11 grid-cols-[1fr_auto_1fr] items-center">
        <div className="flex items-center">{chain && <ChainLogo chain={chain} />}</div>
        <HomeMark />
        <div className="flex items-center justify-end">
          {pasteAgain && <PasteAgainButton />}
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-7 pb-10">{children}</div>
    </main>
  );
}
