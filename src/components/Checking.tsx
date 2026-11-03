import { shortId, type Chain } from "@/lib/detect";
import { Frame } from "./Frame";
import { Ring } from "./StatusCircle";

/** The circle spinning while a transaction is looked up. */
export function Checking({ chain, id }: { chain?: Chain; id?: string }) {
  return (
    <Frame chain={chain} checking>
      <Ring color="#101318" track="rgba(16,19,24,0.08)" progress={0.15} spinning>
        {chain && id && <span className="font-mono text-[15px] text-muted">{shortId(chain, id)}</span>}
      </Ring>
      <p role="status" className="text-[15px] text-muted">
        Checking
      </p>
    </Frame>
  );
}
