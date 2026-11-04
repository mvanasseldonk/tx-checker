"use client";

import type { Chain } from "@/lib/detect";
import { shortAddress } from "@/lib/format";
import { EnsLine, type Ens } from "./EnsLine";
import { Frame } from "./Frame";
import { Heading } from "./Heading";
import { Ring } from "./StatusCircle";
import { STRUGGLING, StoppedLine, useWatch } from "./Watch";

/**
 * An address with no new transaction: a grey circle with a quiet arc travelling round it while the
 * page watches, and still once it stopped. A tap on the circle or on the line looks again.
 * `below` is what else there is to see, such as the earlier transactions.
 */
export function NothingNew({
  chain,
  address,
  ens,
  empty,
  below,
}: {
  chain: Chain;
  address: string;
  ens?: Ens;
  empty: boolean;
  below?: React.ReactNode;
}) {
  const watch = useWatch();
  const stopped = watch?.stopped ?? false;
  return (
    <Frame chain={chain} pasteAgain>
      {ens && <EnsLine ens={ens} />}
      {/* The button sits over the circle, so the circle itself stays put when it appears. */}
      <div className="relative rounded-full transition-transform has-[button:active]:scale-95">
        <Ring color="#5B6472" track="rgba(91,100,114,0.15)" progress={0.11} following still={stopped} landing>
          <span className="font-mono text-[15px] text-muted">{shortAddress(address)}</span>
        </Ring>
        {stopped && (
          <button
            type="button"
            onClick={watch?.restart}
            aria-label="Check again"
            className="absolute inset-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink"
          />
        )}
      </div>
      <Heading word="Nothing new yet" color="text-gone">
        {stopped ? (
          <StoppedLine />
        ) : watch?.struggling ? (
          STRUGGLING
        ) : empty ? (
          "No transactions yet · watching"
        ) : (
          "Watching · new transactions show here"
        )}
      </Heading>
      {below}
    </Frame>
  );
}
