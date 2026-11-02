import type { Chain } from "@/lib/detect";
import { Frame } from "./Frame";
import { Ring } from "./StatusCircle";

/** The lookup itself failed: say so instead of guessing a status. */
export function Unavailable({ chain }: { chain: Chain }) {
  return (
    <Frame chain={chain} pasteAgain>
      <Ring color="#5B6472" track="rgba(91,100,114,0.15)" progress={0} />
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-[40px] leading-none font-semibold tracking-[-0.03em] text-gone">Try again</h1>
        <p className="text-[15px] text-muted">Couldn&apos;t reach the network</p>
      </div>
    </Frame>
  );
}
