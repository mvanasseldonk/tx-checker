import { ContractFunctionExecutionError, ContractFunctionRevertedError, encodeErrorResult, HttpRequestError, TimeoutError } from "viem";
import { describe, expect, it, vi } from "vitest";
import { isNoAddress, resolveEns } from "./ens";

const ADDRESS = "0xEc6792BaB73BeC96a1D6FE5A27F78F311162BE35";

const ABI = [
  { type: "error", name: "ResolverNotFound", inputs: [{ name: "name", type: "bytes" }] },
  { type: "error", name: "HttpError", inputs: [{ name: "status", type: "uint16" }, { name: "message", type: "string" }] },
  { type: "error", name: "ResolverError", inputs: [{ name: "errorData", type: "bytes" }] },
  { type: "function", name: "resolveWithGateways", stateMutability: "view", inputs: [], outputs: [] },
] as const;

/** What viem throws (in strict mode) when the universal resolver reverts with this error. */
function reverted(errorName: "ResolverNotFound" | "HttpError" | "ResolverError") {
  const args = {
    ResolverNotFound: ["0x00"],
    HttpError: [500, "bad gateway"],
    ResolverError: ["0x"],
  }[errorName];
  const data = encodeErrorResult({ abi: ABI, errorName, args } as never);
  const cause = new ContractFunctionRevertedError({ abi: ABI, data, functionName: "resolveWithGateways" });
  return new ContractFunctionExecutionError(cause, { abi: ABI, functionName: "resolveWithGateways" });
}

function clientThat(result: () => Promise<string | null>) {
  return { getEnsAddress: vi.fn(result) } as unknown as Parameters<typeof resolveEns>[1] & { getEnsAddress: ReturnType<typeof vi.fn> };
}

describe("resolveEns", () => {
  it("gives the address of a name, asking strictly for the normalized name", async () => {
    const client = clientThat(async () => ADDRESS);
    expect(await resolveEns("  ASSELDONK.ETH ", client)).toEqual({ kind: "address", name: "asseldonk.eth", address: ADDRESS });
    expect(client!.getEnsAddress).toHaveBeenCalledWith({ name: "asseldonk.eth", strict: true });
  });

  it("resolves a subname and an emoji name", async () => {
    const client = clientThat(async () => ADDRESS);
    expect(await resolveEns("jesse.base.eth", client)).toMatchObject({ kind: "address", name: "jesse.base.eth" });
    expect(await resolveEns("🦄.eth", client)).toMatchObject({ kind: "address" });
  });

  it("says a name has no address when there is no answer, or the resolver says there is nothing", async () => {
    expect(await resolveEns("nobody.eth", clientThat(async () => null))).toEqual({ kind: "none", name: "nobody.eth" });
    const missing = clientThat(async () => {
      throw reverted("ResolverNotFound");
    });
    expect(await resolveEns("nobody.eth", missing)).toEqual({ kind: "none", name: "nobody.eth" });
  });

  it("never turns a failed lookup into 'no address'", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failures = [
      reverted("HttpError"),
      reverted("ResolverError"),
      new TimeoutError({ body: {}, url: "https://example.test" }),
      new HttpRequestError({ url: "https://example.test", status: 503 }),
      new Error("ALCHEMY_API_KEY is not set"),
    ];
    for (const failure of failures) {
      const client = clientThat(async () => {
        throw failure;
      });
      expect(await resolveEns("asseldonk.eth", client), String(failure)).toEqual({ kind: "unavailable" });
    }
  });

  it("never logs the URL of a failed lookup, as it holds the API key", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    log.mockClear();
    const failure = new HttpRequestError({ url: "https://rpc.test/v2/SECRET", status: 503 });
    await resolveEns("asseldonk.eth", clientThat(async () => {
      throw failure;
    }));
    expect(log).toHaveBeenCalledOnce();
    expect(JSON.stringify(log.mock.calls)).not.toContain("SECRET");
  });

  it("does not look up what is not a name", async () => {
    const client = clientThat(async () => ADDRESS);
    for (const input of ["foo bar.eth", "foo\nbar.eth", ".eth", "a..eth", "foo.com", "foo_bar.eth", "foo.eth/bar", ""]) {
      expect(await resolveEns(input, client), input).toEqual({ kind: "invalid" });
    }
    expect(client!.getEnsAddress).not.toHaveBeenCalled();
  });
});

describe("isNoAddress", () => {
  it("is only the resolver's own 'nothing there'", () => {
    expect(isNoAddress(reverted("ResolverNotFound"))).toBe(true);
    expect(isNoAddress(reverted("HttpError"))).toBe(false);
    expect(isNoAddress(reverted("ResolverError"))).toBe(false);
    expect(isNoAddress(new Error("boom"))).toBe(false);
    expect(isNoAddress(null)).toBe(false);
  });
});
