import { afterEach, describe, expect, it, vi } from "vitest";
import { contractName } from "./names";

const UNISWAP = "0x7a250d5630b4cf539739df2c5dacb4c659f2488d";

afterEach(() => vi.unstubAllEnvs());

describe("contractName", () => {
  it("knows Ethereum contracts", async () => {
    expect(await contractName(UNISWAP)).toBe("Uniswap");
    expect(await contractName(UNISWAP, "eth")).toBe("Uniswap");
  });

  it("never uses the Ethereum list on an L2, where the same address can be another contract", async () => {
    vi.stubEnv("ETHERSCAN_API_KEY", "");
    for (const network of ["base", "arb", "op"] as const) {
      expect(await contractName(UNISWAP, network)).toBeNull();
    }
  });
});
