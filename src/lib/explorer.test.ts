import { describe, expect, it } from "vitest";
import { explorerFor } from "./explorer";

describe("explorerFor", () => {
  it("links an Ethereum hash to Etherscan", () => {
    const hash = "0x99cf907f5df8046352d33960a435922ecfe9b7a8297639245a36ec0d8db73685";
    expect(explorerFor("eth", hash)).toEqual({
      name: "Etherscan",
      url: `https://etherscan.io/tx/${hash}`,
    });
  });

  it("links an L2 hash to its own explorer", () => {
    const hash = "0x99cf907f5df8046352d33960a435922ecfe9b7a8297639245a36ec0d8db73685";
    expect(explorerFor("base", hash)).toEqual({ name: "Basescan", url: `https://basescan.org/tx/${hash}` });
    expect(explorerFor("arb", hash)).toEqual({ name: "Arbiscan", url: `https://arbiscan.io/tx/${hash}` });
    expect(explorerFor("op", hash)).toEqual({
      name: "Optimistic Etherscan",
      url: `https://optimistic.etherscan.io/tx/${hash}`,
    });
  });

  it("links a Bitcoin txid to mempool.space", () => {
    const txid = "9fabe65d41545cffe3cb321bbbe90bb2fcf835e7db909af0f51166c018153034";
    expect(explorerFor("btc", txid)).toEqual({
      name: "mempool.space",
      url: `https://mempool.space/tx/${txid}`,
    });
  });

  it("links a Solana signature to Solscan", () => {
    const signature =
      "3kMv7f5Squcxeyx3nCJoZmgKsgA1DJS7w3zCTZs46zqcf21braHGygHzZ2W6RxKMJW3G8wUbUx6wwLbUkTtKZi6e";
    expect(explorerFor("sol", signature)).toEqual({
      name: "Solscan",
      url: `https://solscan.io/tx/${signature}`,
    });
  });
});
