import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hedged } from "./hedge";

const timeout = () => new DOMException("timed out", "TimeoutError");
const never = () => new Promise<string>(() => {});

describe("hedged", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("answers with the primary, and never starts the backup, when it is quick", async () => {
    const backup = vi.fn(async () => "backup");
    expect(await hedged(async () => "primary", backup, 2500)).toBe("primary");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(backup).not.toHaveBeenCalled();
  });

  it("starts the backup when the primary is slow, and takes the first answer", async () => {
    const backup = vi.fn(async () => "backup");
    const result = hedged(never, backup, 2500);
    await vi.advanceTimersByTimeAsync(2499);
    expect(backup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(await result).toBe("backup");
  });

  it("takes a primary that answers late if the backup has not", async () => {
    let answer: (value: string) => void = () => {};
    const slow = new Promise<string>((resolve) => (answer = resolve));
    const result = hedged(() => slow, never, 2500);
    await vi.advanceTimersByTimeAsync(3000);
    answer("late");
    expect(await result).toBe("late");
  });

  it("starts the backup at once when the primary fails", async () => {
    const backup = vi.fn(async () => "backup");
    expect(await hedged(() => Promise.reject(new Error("HTTP 500")), backup, 2500)).toBe("backup");
  });

  it("fails with a timeout when either one timed out", async () => {
    const slow = timeout();
    const other = new Error("HTTP 429");
    await expect(hedged(() => Promise.reject(other), () => Promise.reject(slow), 2500)).rejects.toBe(slow);
    await expect(hedged(() => Promise.reject(slow), () => Promise.reject(other), 2500)).rejects.toBe(slow);
  });

  it("fails with the primary's error when neither timed out", async () => {
    const first = new Error("HTTP 429");
    const result = hedged(() => Promise.reject(first), () => Promise.reject(new Error("HTTP 500")), 2500);
    await expect(result).rejects.toBe(first);
  });
});
