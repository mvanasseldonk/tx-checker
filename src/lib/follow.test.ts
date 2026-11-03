import { describe, expect, it } from "vitest";
import { circleChange, followDeadline, isFollowing, isSettled, PENDING_FOLLOW_MINUTES } from "./follow";

const START = 1_700_000_000_000;
const LIMIT = PENDING_FOLLOW_MINUTES * 60_000;

describe("isFollowing", () => {
  it("follows a pending transaction until the limit", () => {
    expect(isFollowing("pending", START, START)).toBe(true);
    expect(isFollowing("pending", START, START + LIMIT - 1)).toBe(true);
  });

  it("stops following a pending transaction at the limit", () => {
    expect(isFollowing("pending", START, START + LIMIT)).toBe(false);
    expect(isFollowing("pending", START, START + LIMIT * 10)).toBe(false);
  });

  it("follows an included transaction until it is final, however long it takes", () => {
    expect(isFollowing("included", START, START + LIMIT * 10)).toBe(true);
  });

  it("does not follow a final or failed transaction", () => {
    expect(isFollowing("final", START, START)).toBe(false);
    expect(isFollowing("failed", START, START)).toBe(false);
  });
});

describe("followDeadline", () => {
  it("is the limit after the start for pending", () => {
    expect(followDeadline("pending", START)).toBe(START + LIMIT);
  });

  it("is null when only the status can end following", () => {
    expect(followDeadline("included", START)).toBeNull();
    expect(followDeadline("final", START)).toBeNull();
  });

  it("is 30 minutes", () => {
    expect(PENDING_FOLLOW_MINUTES).toBe(30);
  });
});

describe("isSettled", () => {
  it("is true for final and failed only", () => {
    expect(isSettled("final")).toBe(true);
    expect(isSettled("failed")).toBe(true);
    expect(isSettled("included")).toBe(false);
    expect(isSettled("pending")).toBe(false);
  });
});

describe("circleChange", () => {
  it("settles into a disc when a followed transaction ends", () => {
    expect(circleChange("included", "final")).toBe("settle");
    expect(circleChange("pending", "final")).toBe("settle");
    expect(circleChange("pending", "failed")).toBe("settle");
    expect(circleChange("included", "failed")).toBe("settle");
  });

  it("draws the ring anew when a pending transaction is included", () => {
    expect(circleChange("pending", "included")).toBe("draw");
  });

  it("changes nothing when the status stays the same", () => {
    expect(circleChange("included", "included")).toBeNull();
    expect(circleChange("pending", "pending")).toBeNull();
    expect(circleChange("final", "final")).toBeNull();
  });
});
