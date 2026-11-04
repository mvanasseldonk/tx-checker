"use client";

import { useEffect } from "react";
import type { EvmChain } from "@/lib/detect";

/**
 * Puts the network a hash was found on in the URL (`?chain=base`), without a navigation, so that a reload,
 * a shared link and every refresh after this one ask that network only. Shows nothing.
 */
export function NetworkParam({ chain }: { chain: EvmChain }) {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("chain") === chain) return;
    url.searchParams.set("chain", chain);
    window.history.replaceState(null, "", url);
  }, [chain]);
  return null;
}
