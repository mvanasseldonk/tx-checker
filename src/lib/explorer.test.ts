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

  it("links a Solana signature to Solscan", () => {
    const signature =
      "3kMv7f5Squcxeyx3nCJoZmgKsgA1DJS7w3zCTZs46zqcf21braHGygHzZ2W6RxKMJW3G8wUbUx6wwLbUkTtKZi6e";
    expect(explorerFor("sol", signature)).toEqual({
      name: "Solscan",
      url: `https://solscan.io/tx/${signature}`,
    });
  });
});
