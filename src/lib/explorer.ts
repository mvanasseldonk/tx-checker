import type { Chain } from "./detect";

const EXPLORERS: Record<Chain, { name: string; txUrl: string }> = {
  eth: { name: "Etherscan", txUrl: "https://etherscan.io/tx/" },
  sol: { name: "Solscan", txUrl: "https://solscan.io/tx/" },
  btc: { name: "mempool.space", txUrl: "https://mempool.space/tx/" },
};

/** The mainnet block explorer for a chain, with a link straight to one transaction. */
export function explorerFor(chain: Chain, id: string): { name: string; url: string } {
  const { name, txUrl } = EXPLORERS[chain];
  return { name, url: `${txUrl}${encodeURIComponent(id)}` };
}
