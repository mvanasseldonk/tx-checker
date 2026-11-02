import { encodeAbiParameters, toFunctionSelector, type Hex } from "viem";
import { describe, expect, it } from "vitest";
import { describeRevert } from "./revert";

function encodeError(signature: string, types: { type: string }[] = [], values: unknown[] = []): Hex {
  const args = encodeAbiParameters(types, values).slice(2);
  return `${toFunctionSelector(signature)}${args}` as Hex;
}

const errorString = (message: string) => encodeError("Error(string)", [{ type: "string" }], [message]);

describe("describeRevert", () => {
  it("returns null without revert data", () => {
    expect(describeRevert(undefined)).toBeNull();
    expect(describeRevert("0x")).toBeNull();
    expect(describeRevert(errorString(""))).toBeNull();
  });

  it("translates known revert strings", () => {
    expect(describeRevert(errorString("ERC20: transfer amount exceeds balance"))).toBe(
      "Insufficient balance",
    );
    expect(describeRevert(errorString("Too little received"))).toBe(
      "Price moved more than you allowed",
    );
    expect(describeRevert(errorString("UniswapV2Router: EXPIRED"))).toBe("Deadline passed");
    expect(describeRevert(errorString("STF"))).toBe("Token transfer failed");
  });

  it("shortens unknown revert strings", () => {
    expect(describeRevert(errorString("Paused"))).toBe("Paused");
    expect(describeRevert(errorString("x".repeat(60)))).toBe(`${"x".repeat(40)}…`);
  });

  it("translates known custom errors", () => {
    expect(
      describeRevert(
        encodeError(
          "ERC20InsufficientBalance(address,uint256,uint256)",
          [{ type: "address" }, { type: "uint256" }, { type: "uint256" }],
          ["0x0000000000000000000000000000000000000001", 1n, 2n],
        ),
      ),
    ).toBe("Insufficient balance");
    expect(
      describeRevert(
        encodeError("V4TooLittleReceived(uint256,uint256)", [{ type: "uint256" }, { type: "uint256" }], [2n, 1n]),
      ),
    ).toBe("Price moved more than you allowed");
    expect(describeRevert(encodeError("V3TooLittleReceived()"))).toBe(
      "Price moved more than you allowed",
    );
  });

  it("unwraps the Universal Router's ExecutionFailed", () => {
    const inner = encodeError("TransactionDeadlinePassed()");
    const wrapped = encodeError(
      "ExecutionFailed(uint256,bytes)",
      [{ type: "uint256" }, { type: "bytes" }],
      [0n, inner],
    );
    expect(describeRevert(wrapped)).toBe("Deadline passed");
  });

  it("names panics and unknown custom errors", () => {
    expect(describeRevert(encodeError("Panic(uint256)", [{ type: "uint256" }], [0x11n]))).toBe(
      "Contract error",
    );
    expect(describeRevert("0xdeadbeef")).toBe("Error 0xdeadbeef");
  });
});
