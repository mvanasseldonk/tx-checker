import type { Chain } from "@/lib/detect";
import { HomeMark } from "./brand/Brand";
import { ChainLogo } from "./ChainLogo";
import { PasteAgainButton } from "./PasteAgainButton";

/**
 * The page around the status circle: chain logo top left, the small mark (home) in the middle, a button that pastes the next one top right.
 * The header is quiet: it fades in once the circle has landed, so that the circle stays the hero. While `checking`
 * it waits invisibly (it is still there, and still works), and the header of the result takes over.
 */
export function Frame({
  chain,
  pasteAgain = false,
  checking = false,
  children,
}: {
  chain?: Chain;
  pasteAgain?: boolean;
  checking?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-5 pb-8">
      <FrameHeader chain={chain} pasteAgain={pasteAgain} checking={checking} />
      <div className="flex flex-1 flex-col items-center justify-center gap-7 pb-10">{children}</div>
    </main>
  );
}

export function FrameHeader({
  chain,
  pasteAgain = false,
  checking = false,
}: {
  chain?: Chain;
  pasteAgain?: boolean;
  checking?: boolean;
}) {
  return (
    <header
      className={`grid h-11 grid-cols-[1fr_auto_1fr] items-center ${
        checking ? "motion-safe:opacity-0" : "motion-safe:animate-header"
      }`}
    >
      <div className="flex items-center">{chain && <ChainLogo chain={chain} />}</div>
      <HomeMark />
      <div className="flex items-center justify-end">{pasteAgain && <PasteAgainButton />}</div>
    </header>
  );
}
