import type { Chain } from "@/lib/detect";
import { EnsLine, type Ens } from "./EnsLine";
import { Frame } from "./Frame";
import { Heading } from "./Heading";
import { Retry } from "./Retry";

/** The lookup itself failed: say so instead of guessing a status. */
export function Unavailable({ chain, ens }: { chain: Chain; ens?: Ens }) {
  return (
    <Frame chain={chain} pasteAgain>
      {ens && <EnsLine ens={ens} />}
      <Retry />
      <Heading word="Try again" color="text-gone">
        Couldn&apos;t reach the network
      </Heading>
    </Frame>
  );
}
