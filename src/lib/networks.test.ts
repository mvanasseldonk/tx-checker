import { describe, expect, it } from "vitest";
import type { TransactionReceipt } from "viem";
import { feeWei, finalizedAt, NETWORKS, SECONDS_TO_FINAL, waitToFinal } from "./networks";

const receipt = (extra: { l1Fee?: bigint | null } = {}) =>
  ({ gasUsed: 100_000n, effectiveGasPrice: 2_000_000_000n, ...extra }) as TransactionReceipt & {
    l1Fee?: bigint | null;
  };

describe("feeWei", () => {
  it("is gas used times the gas price on Ethereum and Arbitrum (its gasUsed holds the L1 gas)", () => {
    expect(feeWei(receipt())).toBe(200_000_000_000_000n);
    expect(feeWei(receipt({ l1Fee: null }))).toBe(200_000_000_000_000n);
  });

  it("adds the L1 fee on the OP Stack networks", () => {
    expect(feeWei(receipt({ l1Fee: 5_000_000_000_000n }))).toBe(205_000_000_000_000n);
  });
});

describe("waitToFinal", () => {
  const at = 1_800_000_000;

  it("estimates an L2 as its block time plus the network's constant", () => {
    expect(finalizedAt("base", at)).toBe(at + SECONDS_TO_FINAL.base);
    expect(finalizedAt("arb", at)).toBe(at + SECONDS_TO_FINAL.arb);
    expect(finalizedAt("op", at)).toBe(at + SECONDS_TO_FINAL.op);
    const { progress, secondsToFinal } = waitToFinal("base", at, at + SECONDS_TO_FINAL.base / 2);
    expect(progress).toBeCloseTo(0.5);
    expect(secondsToFinal).toBeCloseTo(SECONDS_TO_FINAL.base / 2);
  });

  it("says about a minute when the L2 estimate has passed", () => {
    expect(waitToFinal("arb", at, at + SECONDS_TO_FINAL.arb + 500)).toEqual({ progress: 1, secondsToFinal: 60 });
  });

  it("keeps the beacon chain schedule for Ethereum", () => {
    const epoch = 32 * 12;
    expect(finalizedAt("eth", 1606824023 + 1)).toBe(1606824023 + 3 * epoch);
    expect(waitToFinal("eth", at, finalizedAt("eth", at) + 100).secondsToFinal).toBe(1);
  });
});

describe("NETWORKS", () => {
  it("names each network's chain, Alchemy host and CoinGecko platform", () => {
    expect(Object.values(NETWORKS).map((n) => [n.chain.id, n.alchemy, n.platform])).toEqual([
      [1, "eth-mainnet", "ethereum"],
      [8453, "base-mainnet", "base"],
      [42161, "arb-mainnet", "arbitrum-one"],
      [10, "opt-mainnet", "optimistic-ethereum"],
    ]);
  });
});
