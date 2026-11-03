import type { Chain } from "@/lib/detect";
import { shortAddress } from "@/lib/format";
import { Frame } from "./Frame";
import { Heading } from "./Heading";
import { Ring } from "./StatusCircle";

/** An address with nothing to show: an empty grey circle with the address in it, and why. */
export function AddressNote({
  chain,
  address,
  word,
  children,
}: {
  chain: Chain;
  address: string;
  word: string;
  children: React.ReactNode;
}) {
  return (
    <Frame chain={chain} pasteAgain>
      <Ring color="#5B6472" track="rgba(91,100,114,0.15)" progress={0}>
        <span className="font-mono text-[15px] text-muted">{shortAddress(address)}</span>
      </Ring>
      <Heading word={word} color="text-gone">
        {children}
      </Heading>
    </Frame>
  );
}
