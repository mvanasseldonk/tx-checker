import type { Chain } from "@/lib/detect";
import { Frame } from "./Frame";
import { Retry } from "./Retry";

/** The lookup itself failed: say so instead of guessing a status. */
export function Unavailable({ chain }: { chain: Chain }) {
  return (
    <Frame chain={chain} pasteAgain>
      <Retry />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[40px] leading-none font-semibold tracking-[-0.03em] text-gone">Try again</h1>
        <p className="text-[15px] text-muted">Couldn&apos;t reach the network</p>
      </div>
    </Frame>
  );
}
