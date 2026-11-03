import { describe, expect, it } from "vitest";
import type { Candidate } from "./address/types";
import {
  isRecent,
  isWatching,
  parseSeen,
  seenParam,
  shownCandidate,
  WATCH_MINUTES,
  WATCH_SECONDS,
  watchDeadline,
} from "./watch";

const NOW = 1_800_000_000;
const HOUR = 3600;
const MINUTE = 60_000;

function candidate(id: string, ageSeconds: number | null): Candidate {
  return {
    id,
    direction: "received",
    time: ageSeconds === null ? null : NOW - ageSeconds,
    pending: ageSeconds === null,
    amount: null,
  };
}

describe("isRecent", () => {
  it("is true for a pending transaction", () => {
    expect(isRecent(candidate("a", null), NOW)).toBe(true);
  });

  it("is true up to an hour old and false from then on", () => {
    expect(isRecent(candidate("a", 0), NOW)).toBe(true);
    expect(isRecent(candidate("a", HOUR - 1), NOW)).toBe(true);
    expect(isRecent(candidate("a", HOUR), NOW)).toBe(false);
    expect(isRecent(candidate("a", 7 * 24 * HOUR), NOW)).toBe(false);
  });
});

describe("shownCandidate", () => {
  const old = candidate("old", 3 * HOUR);
  const older = candidate("older", 5 * HOUR);

  it("shows nothing for an address without transactions", () => {
    expect(shownCandidate([], [], NOW)).toBeNull();
  });

  it("shows nothing while the newest transaction is old and was already there", () => {
    expect(shownCandidate([old, older], ["old", "older"], NOW)).toBeNull();
  });

  it("shows a recent newest transaction that was already there", () => {
    const recent = candidate("recent", 10 * 60);
    expect(shownCandidate([recent, old], ["recent", "old"], NOW)).toBe(recent);
  });

  it("shows a pending transaction that was already there", () => {
    const pending = candidate("pending", null);
    expect(shownCandidate([pending, old], ["pending", "old"], NOW)).toBe(pending);
  });

  it("shows a new transaction, compared by id and not by time", () => {
    const fresh = candidate("fresh", 20);
    expect(shownCandidate([fresh, old], ["old"], NOW)).toBe(fresh);
    // Even one that says it is old: it was not there before.
    const stale = candidate("stale", 2 * HOUR);
    expect(shownCandidate([stale, old], ["old"], NOW)).toBe(stale);
  });

  it("shows the first transaction of an address that was empty", () => {
    const first = candidate("first", null);
    expect(shownCandidate([first], [], NOW)).toBe(first);
  });

  it("looks only at the newest: an older one that is not seen changes nothing", () => {
    expect(shownCandidate([old, older], ["old"], NOW)).toBeNull();
  });
});

describe("parseSeen and seenParam", () => {
  it("is null for an address opened for the first time", () => {
    expect(parseSeen(undefined)).toBeNull();
    expect(parseSeen(["a", "b"])).toBeNull();
  });

  it("reads the ids back", () => {
    expect(parseSeen(seenParam(["a", "b", "c"]))).toEqual(["a", "b", "c"]);
  });

  it("reads an empty parameter as nothing seen, not as first time", () => {
    expect(seenParam([])).toBe("");
    expect(parseSeen("")).toEqual([]);
  });
});

describe("watching", () => {
  const START = 1_800_000_000_000;

  it("watches until 30 minutes after the start", () => {
    expect(isWatching(START, START)).toBe(true);
    expect(isWatching(START, START + 30 * MINUTE - 1)).toBe(true);
    expect(isWatching(START, START + 30 * MINUTE)).toBe(false);
    expect(isWatching(START, START + 300 * MINUTE)).toBe(false);
  });

  it("has its deadline 30 minutes after the start", () => {
    expect(WATCH_MINUTES).toBe(30);
    expect(watchDeadline(START)).toBe(START + 30 * MINUTE);
  });

  it("looks again every 12 s on ETH, 5 s on SOL and 30 s on BTC", () => {
    expect(WATCH_SECONDS).toEqual({ eth: 12, sol: 5, btc: 30 });
  });
});
