import { describe, expect, it } from "vitest";
import { isContract, mergeTransfers, seenSince, type Transfer } from "./eth";

const ME = "0xaaaa000000000000000000000000000000000001";
const OTHER = "0xbbbb000000000000000000000000000000000002";
const USDC = "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48";

function transfer(hash: string, block: number, from: string, to: string, extra: Partial<Transfer> = {}): Transfer {
  return {
    hash,
    from,
    to,
    value: 1,
    asset: "ETH",
    blockNum: `0x${block.toString(16)}`,
    rawContract: { address: null },
    metadata: { blockTimestamp: new Date(block * 1000).toISOString() },
    ...extra,
  };
}

describe("mergeTransfers", () => {
  it("merges both lists newest first", () => {
    const outgoing = [transfer("0xout2", 20, ME, OTHER), transfer("0xout1", 5, ME, OTHER)];
    const incoming = [transfer("0xin2", 30, OTHER, ME), transfer("0xin1", 10, OTHER, ME)];
    expect(mergeTransfers(outgoing, incoming, ME).map((tx) => tx.id)).toEqual([
      "0xin2",
      "0xout2",
      "0xin1",
      "0xout1",
    ]);
  });

  it("makes one transaction of the several transfers it caused", () => {
    // A token swap: ETH goes out, tokens come in, both in the same transaction.
    const outgoing = [transfer("0xswap", 7, ME, OTHER, { value: 0.5 })];
    const incoming = [transfer("0xswap", 7, OTHER, ME, { value: 1200, asset: "USDC", rawContract: { address: USDC } })];
    const merged = mergeTransfers(outgoing, incoming, ME);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ id: "0xswap", direction: "sent", amount: { amount: 0.5, symbol: "ETH" }, token: null });
  });

  it("dedupes a transaction that has two transfers in the same list", () => {
    const incoming = [
      transfer("0xdup", 3, OTHER, ME, { value: 0 }),
      transfer("0xdup", 3, OTHER, ME, { value: 25, asset: "USDC", rawContract: { address: USDC } }),
    ];
    const merged = mergeTransfers([], incoming, ME);
    expect(merged).toHaveLength(1);
    // The one that moves something is the one described.
    expect(merged[0]).toMatchObject({ direction: "received", token: USDC, amount: { amount: 25, symbol: "USDC" } });
  });

  it("calls a transaction to this address Received, and from it Sent", () => {
    const merged = mergeTransfers([transfer("0xs", 1, ME, OTHER)], [transfer("0xr", 2, OTHER, ME)], ME);
    expect(Object.fromEntries(merged.map((tx) => [tx.id, tx.direction]))).toEqual({ "0xs": "sent", "0xr": "received" });
  });

  it("calls a transaction to itself Sent", () => {
    const self = transfer("0xself", 1, ME, ME);
    expect(mergeTransfers([self], [self], ME)).toHaveLength(1);
    expect(mergeTransfers([self], [self], ME)[0].direction).toBe("sent");
  });

  it("has no amount for a call that moved nothing, so it can be told from spam later", () => {
    const [call] = mergeTransfers([transfer("0xcall", 1, ME, OTHER, { value: 0 })], [], ME);
    expect(call).toMatchObject({ direction: "sent", amount: null });
    // A token whose decimals are unknown has no value either.
    const [unknown] = mergeTransfers([], [transfer("0xodd", 1, OTHER, ME, { value: null, asset: null })], ME);
    expect(unknown.amount).toBeNull();
  });

  it("reads the time from the block timestamp", () => {
    const [tx] = mergeTransfers([], [transfer("0xt", 1_700_000_000, OTHER, ME)], ME);
    expect(tx.time).toBe(1_700_000_000);
    expect(tx.pending).toBe(false);
  });

  it("handles no transfers", () => {
    expect(mergeTransfers([], [], ME)).toEqual([]);
  });
});

describe("isContract", () => {
  it("is false for a wallet, also one that delegates to code (EIP-7702)", () => {
    expect(isContract("0x")).toBe(false);
    expect(isContract("0xef01005a7fc11397e9a8ad41bf10bf13f22b0a63f96f6d")).toBe(false);
  });

  it("is true for any other code", () => {
    expect(isContract("0x608060405234801561001057600080fd5b50")).toBe(true);
    expect(isContract("0xef0200aa")).toBe(true);
  });
});

describe("seenSince", () => {
  const list = (length: number, oldest: number) =>
    Array.from({ length }, (_, i) => transfer(`0x${i}`, oldest + (length - 1 - i), OTHER, ME));

  it("is the oldest transfer of a list that is full, and the newest of those if several are", () => {
    expect(seenSince([list(50, 1_000)])).toBe(1_000);
    expect(seenSince([list(50, 1_000), list(50, 5_000)])).toBe(5_000);
  });

  it("ignores a list that is not full: it went back to the start", () => {
    expect(seenSince([list(50, 1_000), list(3, 5_000)])).toBe(1_000);
    expect(seenSince([list(3, 5_000), list(0, 0)])).toBeNull();
  });
});
