import type { Chain as ViemChain, TransactionReceipt } from "viem";
import { arbitrum, base, mainnet, optimism } from "viem/chains";
import type { EvmChain } from "./detect";

/** Per EVM network: its viem chain, its host at Alchemy and the CoinGecko platform that prices its tokens. */
export const NETWORKS: Record<EvmChain, { chain: ViemChain; alchemy: string; platform: string }> = {
  eth: { chain: mainnet, alchemy: "eth-mainnet", platform: "ethereum" },
  base: { chain: base, alchemy: "base-mainnet", platform: "base" },
  arb: { chain: arbitrum, alchemy: "arb-mainnet", platform: "arbitrum-one" },
  op: { chain: optimism, alchemy: "opt-mainnet", platform: "optimistic-ethereum" },
};

/**
 * How long after its block an L2 transaction is expected to be final, in seconds: Ethereum has to finalize the
 * L1 block that holds the batch. Estimates; Ethereum itself is exact (see `finalizedAt`).
 *
 * Measured on 4 November 2026 with five blocks per network, six minutes apart, until the `finalized` tag had
 * passed them (min, median, max in seconds): Base 798, 852, 1158; Arbitrum 1158, 1212, 1253; Optimism 1436,
 * 1511, 1573. These are the medians, rounded.
 */
export const SECONDS_TO_FINAL: Record<Exclude<EvmChain, "eth">, number> = {
  base: 850,
  arb: 1210,
  op: 1510,
};

// A transaction that is still not final when its estimate has passed is shown as one minute away.
const OVERDUE_SECONDS = 60;

const SECONDS_PER_SLOT = 12;
const SLOTS_PER_EPOCH = 32;
const BEACON_GENESIS = 1606824023;

/**
 * When a block is expected to be final. On Ethereum the chain finalizes the first slot of the epoch two
 * epochs behind the current one, so a block is final two epochs after the first epoch that starts at or
 * after it. On an L2 it is an estimate.
 */
export function finalizedAt(network: EvmChain, blockTime: number): number {
  if (network !== "eth") return blockTime + SECONDS_TO_FINAL[network];
  const epochSeconds = SLOTS_PER_EPOCH * SECONDS_PER_SLOT;
  const nextEpoch = Math.ceil((blockTime - BEACON_GENESIS) / epochSeconds);
  return BEACON_GENESIS + (nextEpoch + 2) * epochSeconds;
}

/** How far along a block is towards Final (0 to 1), and the seconds left, at unix time `now`. */
export function waitToFinal(network: EvmChain, blockTime: number, now: number) {
  const finalAt = finalizedAt(network, blockTime);
  return {
    progress: Math.min(1, Math.max(0, (now - blockTime) / (finalAt - blockTime))),
    // Ethereum is exact, so a second is all that is left; an L2 estimate that has passed says a minute.
    secondsToFinal: Math.max(network === "eth" ? 1 : OVERDUE_SECONDS, finalAt - now),
  };
}

/**
 * What a transaction cost in wei. The OP Stack networks (Base, Optimism) charge the cost of posting it to
 * Ethereum on top, in `l1Fee`. Arbitrum has no such field: its `gasUsed` already includes the gas for that.
 */
export function feeWei(receipt: TransactionReceipt & { l1Fee?: bigint | null }): bigint {
  return receipt.gasUsed * receipt.effectiveGasPrice + (receipt.l1Fee ?? 0n);
}
