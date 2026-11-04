import { shortId, type Chain } from "@/lib/detect";
import { shortName } from "@/lib/format";
import { Frame } from "./Frame";
import { Ring } from "./StatusCircle";

const CIRCLE_NAME = 14;

/** The circle spinning while a transaction is looked up; for an ENS name, it holds the (shortened) name. */
export function Checking({
  chain,
  id,
  name,
  logo = true,
}: {
  chain?: Chain;
  id?: string;
  name?: string;
  // False while the network is not known yet: no logo, but the hash is still shortened as for `chain`.
  logo?: boolean;
}) {
  return (
    <Frame chain={logo ? chain : undefined} checking>
      <Ring color="#101318" track="rgba(16,19,24,0.08)" progress={0.15} spinning>
        {chain && id && <span className="font-mono text-[15px] text-muted">{shortId(chain, id)}</span>}
        {name && <span className="font-mono text-[15px] text-muted">{shortName(name, CIRCLE_NAME)}</span>}
      </Ring>
      <p role="status" className="text-[15px] text-muted">
        Checking
      </p>
    </Frame>
  );
}
