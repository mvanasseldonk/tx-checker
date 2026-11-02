import { describe, expect, it } from "vitest";
import { methodName } from "./method";

describe("methodName", () => {
  it("names ERC-20 calls", () => {
    const transfer =
      "0xa9059cbb000000000000000000000000d8da6bf26964af9d7eed9e03e53415d37aa960450000000000000000000000000000000000000000000000000000000000000001";
    expect(methodName(transfer)).toBe("transfer");
  });

  it("names a few well-known selectors", () => {
    expect(methodName("0x3593564c0000")).toBe("execute");
  });

  it("stays quiet about anything else", () => {
    expect(methodName("0x12345678")).toBeNull();
    expect(methodName("0x")).toBeNull();
  });
});
