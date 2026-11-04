import type { Chain } from "@/lib/detect";
import { EnsLine, type Ens } from "./EnsLine";
import { Frame } from "./Frame";
import { Heading } from "./Heading";
import { Ring } from "./StatusCircle";

/** An address with nothing to show: an empty grey circle with the address (`label`) in it, and why. */
export function AddressNote({
  chain,
  label,
  ens,
  word,
  children,
}: {
  chain: Chain;
  label: string;
  ens?: Ens;
  word: string;
  children: React.ReactNode;
}) {
  return (
    <Frame chain={chain} pasteAgain>
      {ens && <EnsLine ens={ens} />}
      <Ring color="#5B6472" track="rgba(91,100,114,0.15)" progress={0} landing>
        <span className="font-mono text-[15px] text-muted">{label}</span>
      </Ring>
      <Heading word={word} color="text-gone">
        {children}
      </Heading>
    </Frame>
  );
}
