import { describe, expect, it, vi } from "vitest";
import { isBusy, isTimeout, isWellKnownToken, summarize, takeRecent, worthShowing } from "./rules";
import type { Candidate } from "./types";

const NOW = 1_800_000_000;

function candidate(ageSeconds: number | null, id = String(ageSeconds)): Candidate {
  return {
    id,
    direction: "received",
    time: ageSeconds === null ? null : NOW - ageSeconds,
    pending: ageSeconds === null,
    amount: null,
  };
}

/** Five transactions, the newest 1 minute old, the 5th `fifth` seconds old. */
function five(fifth: number): Candidate[] {
  return [60, 120, 180, 240, fifth].map((age) => candidate(age));
}

describe("worthShowing", () => {
  it("skips transfers worth less than a cent", () => {
    expect(worthShowing(0.001, 2000, true)).toBe(true); // €2
    expect(worthShowing(0.000004, 2000, true)).toBe(false); // €0.008
    expect(worthShowing(0.000005, 2000, true)).toBe(true); // €0.01
    expect(worthShowing(500, 0.00001, false)).toBe(false);
  });

  it("skips nothing-transfers, whatever they are", () => {
    expect(worthShowing(0, 2000, true)).toBe(false);
    expect(worthShowing(0, "unavailable", true)).toBe(false);
    expect(worthShowing(0, "unknown", true)).toBe(false);
    expect(worthShowing(-1, 2000, false)).toBe(false);
  });

  it("skips a token nobody prices", () => {
    expect(worthShowing(1000, "unknown", false)).toBe(false);
  });

  it("keeps a real coin or well-known token the price service has nothing on", () => {
    expect(worthShowing(0.5, "unknown", true)).toBe(true);
  });

  it("keeps everything while the price service is down: an outage hides no real receive", () => {
    expect(worthShowing(400, "unavailable", false)).toBe(true);
    expect(worthShowing(0.5, "unavailable", true)).toBe(true);
  });
});

describe("isWellKnownToken", () => {
  it("knows the big stablecoins and wrapped coins, by contract or mint", () => {
    expect(isWellKnownToken("eth", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")).toBe(true);
    expect(isWellKnownToken("eth", "0xdac17f958d2ee523a2206206994597c13d831ec7")).toBe(true);
    expect(isWellKnownToken("eth", "0x6b175474e89094c44da98b954eedeac495271d0f")).toBe(true);
    expect(isWellKnownToken("eth", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")).toBe(true);
    expect(isWellKnownToken("eth", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599")).toBe(true);
    expect(isWellKnownToken("sol", "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")).toBe(true);
    expect(isWellKnownToken("sol", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB")).toBe(true);
  });

  it("does not know anything else, and does not mix the chains up", () => {
    expect(isWellKnownToken("eth", "0x6cfc18d2bfd14b08b1ad711e9ec94049991305d6")).toBe(false);
    expect(isWellKnownToken("sol", "83eAEViwWvrwBxXNQUN5pLaYMc1i5eurMzkwEs9zURB")).toBe(false);
    expect(isWellKnownToken("sol", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")).toBe(false);
  });
});

describe("isBusy", () => {
  it("is busy when the 5th newest is under 10 minutes old (1 hour on Bitcoin)", () => {
    expect(isBusy("eth", five(9 * 60), NOW)).toBe(true);
    expect(isBusy("eth", five(10 * 60), NOW)).toBe(false);
    expect(isBusy("sol", five(9 * 60), NOW)).toBe(true);
    expect(isBusy("sol", five(11 * 60), NOW)).toBe(false);
    expect(isBusy("btc", five(59 * 60), NOW)).toBe(true);
    expect(isBusy("btc", five(61 * 60), NOW)).toBe(false);
    // 30 minutes is quiet for Ethereum, busy for Bitcoin.
    expect(isBusy("eth", five(30 * 60), NOW)).toBe(false);
    expect(isBusy("btc", five(30 * 60), NOW)).toBe(true);
  });

  it("is not busy with fewer than five transactions, however recent", () => {
    expect(isBusy("eth", five(10).slice(0, 4), NOW)).toBe(false);
    expect(isBusy("eth", [], NOW)).toBe(false);
  });

  it("counts a pending transaction as happening now", () => {
    expect(isBusy("btc", [...five(1000).slice(0, 4), candidate(null)], NOW)).toBe(true);
    expect(isBusy("btc", [candidate(null), ...[7200, 7300, 7400, 7500].map((age) => candidate(age))], NOW)).toBe(false);
  });
});

describe("summarize", () => {
  it("is empty without transactions", () => {
    expect(summarize("eth", [], NOW)).toEqual({ kind: "empty" });
  });

  it("is busy when the 5th is recent, else it lists them", () => {
    expect(summarize("eth", five(60), NOW)).toEqual({ kind: "busy" });
    const calm = five(3600);
    expect(summarize("eth", calm, NOW)).toEqual({ kind: "found", candidates: calm });
    expect(summarize("eth", calm.slice(0, 2), NOW)).toEqual({ kind: "found", candidates: calm.slice(0, 2) });
  });
});

describe("summarize in a flood", () => {
  it("is busy when a full list reaches back only minutes, even if spam left fewer than five", () => {
    const few = five(3600).slice(0, 2);
    expect(summarize("sol", few, NOW, NOW - 5 * 60)).toEqual({ kind: "busy" });
    expect(summarize("sol", [], NOW, NOW - 5 * 60)).toEqual({ kind: "busy" });
    expect(summarize("btc", few, NOW, NOW - 30 * 60)).toEqual({ kind: "busy" });
  });

  it("is not busy when the list reaches back far enough, or went back to the start", () => {
    const few = five(3600).slice(0, 2);
    expect(summarize("sol", few, NOW, NOW - 11 * 60)).toEqual({ kind: "found", candidates: few });
    expect(summarize("sol", few, NOW, null)).toEqual({ kind: "found", candidates: few });
    expect(summarize("sol", [], NOW, null)).toEqual({ kind: "empty" });
  });
});

describe("takeRecent", () => {
  it("keeps the first five that pick accepts, newest first", async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const even = await takeRecent(items, async (n) => (n % 2 === 0 ? `#${n}` : null));
    expect(even).toEqual(["#0", "#2", "#4", "#6", "#8"]);
  });

  it("stops looking once it has enough", async () => {
    const pick = vi.fn(async (n: number) => n);
    await takeRecent(Array.from({ length: 50 }, (_, i) => i), pick);
    expect(pick).toHaveBeenCalledTimes(5);

    const spammy = vi.fn(async (n: number) => (n >= 12 ? n : null));
    expect(await takeRecent(Array.from({ length: 50 }, (_, i) => i), spammy)).toEqual([12, 13, 14, 15, 16]);
    expect(spammy).toHaveBeenCalledTimes(20);
  });

  it("returns what there is, and honours another amount", async () => {
    expect(await takeRecent([1, 2], async (n) => n)).toEqual([1, 2]);
    expect(await takeRecent([1, 2, 3], async (n) => n, 2)).toEqual([1, 2]);
    expect(await takeRecent([1, 2, 3], async (n) => n, 0)).toEqual([]);
    expect(await takeRecent([], async (n) => n)).toEqual([]);
  });
});

describe("isTimeout", () => {
  it("recognises a request that ran out of time", () => {
    expect(isTimeout(new DOMException("signal timed out", "TimeoutError"))).toBe(true);
    const viemLike = Object.assign(new Error("took too long"), { name: "TimeoutError" });
    expect(isTimeout(viemLike)).toBe(true);
    expect(isTimeout(new Error("HTTP 500"))).toBe(false);
    expect(isTimeout("TimeoutError")).toBe(false);
  });
});
