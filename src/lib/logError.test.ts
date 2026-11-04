import { HttpRequestError, RpcRequestError, TimeoutError } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeError, logFailure } from "./logError";

const URL_WITH_KEY = "https://eth-mainnet.g.alchemy.com/v2/SECRETKEY123";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

/** Everything `console.error` was called with, as one string, whatever the shape of the arguments. */
function logged(log: ReturnType<typeof vi.spyOn>): string {
  return JSON.stringify(log.mock.calls, (_, value) => (value instanceof Error ? { ...value, message: value.message, stack: value.stack } : value));
}

describe("logFailure", () => {
  it("never lets the URL of a viem error, nor its key, reach console.error", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const failures = [
      new HttpRequestError({ url: URL_WITH_KEY, status: 503, details: `fetch ${URL_WITH_KEY} failed` }),
      new TimeoutError({ body: {}, url: URL_WITH_KEY }),
      new RpcRequestError({ body: {}, url: URL_WITH_KEY, error: { code: -32000, message: "boom" } }),
    ];
    for (const failure of failures) {
      // The premise: the whole error does hold the key, so that logging it would leak.
      expect(`${failure.message} ${failure.metaMessages?.join(" ")}`, failure.name).toContain("SECRETKEY123");
      log.mockClear();
      logFailure("Looking up 0xabc", failure);
      expect(log, failure.name).toHaveBeenCalledOnce();
      expect(logged(log), failure.name).not.toContain("SECRETKEY123");
      expect(logged(log), failure.name).not.toContain("alchemy");
    }
  });

  it("says what failed, without the error itself", () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    logFailure("Looking up 0xabc", new TimeoutError({ body: {}, url: URL_WITH_KEY }));
    expect(log).toHaveBeenCalledWith("Looking up 0xabc failed: TimeoutError: The request took too long to respond.");
  });
});

describe("describeError", () => {
  it("keeps the name and message of an error that is not viem's, minus any URL", () => {
    expect(describeError(new Error("Etherscan 429"))).toBe("Error: Etherscan 429");
    expect(describeError(new Error(`GET ${URL_WITH_KEY}?x=1 returned 500`))).toBe("Error: GET [url] returned 500");
    expect(describeError(new Error("see wss://rpc.test/ws/SECRETKEY123"))).not.toContain("SECRETKEY123");
  });

  it("takes out a key that stands alone, outside a URL", () => {
    vi.stubEnv("HELIUS_API_KEY", "SECRETKEY123");
    expect(describeError(new Error("api-key=SECRETKEY123 was rejected"))).toBe("Error: api-key=[key] was rejected");
  });

  it("says nothing of what is not an error", () => {
    expect(describeError(`oops ${URL_WITH_KEY}`)).toBe("unknown error");
    expect(describeError(null)).toBe("unknown error");
  });
});
