import type { Chain } from "@/lib/detect";
import { Frame } from "./Frame";
import { Heading } from "./Heading";
import { Retry } from "./Retry";

/** The lookup itself failed: say so instead of guessing a status. */
export function Unavailable({ chain }: { chain: Chain }) {
  return (
    <Frame chain={chain} pasteAgain>
      <Retry />
      <Heading word="Try again" color="text-gone">
        Couldn&apos;t reach the network
      </Heading>
    </Frame>
  );
}
