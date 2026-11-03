import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { briefly } from "./memo";

describe("briefly", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads once within the time, and again after it", async () => {
    const load = vi.fn(async () => "a");
    expect(await briefly("once", 5000, load)).toBe("a");
    vi.advanceTimersByTime(4000);
    expect(await briefly("once", 5000, load)).toBe("a");
    expect(load).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1000);
    await briefly("once", 5000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("shares one load between callers that come in while it runs", async () => {
    let finish: (value: string) => void = () => {};
    const load = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const first = briefly("shared", 5000, load);
    const second = briefly("shared", 5000, load);
    finish("done");
    expect(await Promise.all([first, second])).toEqual(["done", "done"]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("keeps keys apart", async () => {
    const load = vi.fn(async () => "x");
    await briefly("k1", 5000, load);
    await briefly("k2", 5000, load);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("never keeps a failure: the error comes through as it was, and the next caller tries again", async () => {
    const timeout = new DOMException("timed out", "TimeoutError");
    const load = vi.fn<() => Promise<string>>().mockRejectedValueOnce(timeout).mockResolvedValue("ok");
    await expect(briefly("fails", 5000, load)).rejects.toBe(timeout);
    expect(await briefly("fails", 5000, load)).toBe("ok");
    expect(load).toHaveBeenCalledTimes(2);
  });
});
