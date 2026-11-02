import { describe, expect, it } from "vitest";
import { describeSolError } from "./solErrors";

const JUPITER = "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const noProgram = () => undefined;

describe("describeSolError", () => {
  it("returns null for a transaction that didn't fail", () => {
    expect(describeSolError(null, [], noProgram)).toBeNull();
  });

  it("translates known program errors", () => {
    expect(
      describeSolError(
        { InstructionError: [4, { Custom: 6001 }] },
        [`Program ${JUPITER} failed: custom program error: 0x1771`],
        noProgram,
      ),
    ).toBe("Price moved more than you allowed");
  });

  it("blames the innermost program in the logs", () => {
    expect(
      describeSolError(
        { InstructionError: [2, { Custom: 1 }] },
        [
          "Program log: Error: insufficient funds",
          `Program ${TOKEN} failed: custom program error: 0x1`,
          `Program ${JUPITER} failed: custom program error: 0x1`,
        ],
        () => JUPITER,
      ),
    ).toBe("Insufficient balance");
  });

  it("falls back to the program of the instruction without logs", () => {
    expect(describeSolError({ InstructionError: [0, { Custom: 6001 }] }, [], () => JUPITER)).toBe(
      "Price moved more than you allowed",
    );
  });

  it("uses an Anchor error message for unknown codes", () => {
    expect(
      describeSolError(
        { InstructionError: [1, { Custom: 6036 }] },
        [
          "Program log: AnchorError occurred. Error Code: AmountOutBelowMinimum. Error Number: 6036. Error Message: Amount out below minimum threshold.",
          "Program whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc failed: custom program error: 0x1794",
        ],
        noProgram,
      ),
    ).toBe("Price moved more than you allowed");
    expect(
      describeSolError(
        { InstructionError: [0, { Custom: 6000 }] },
        [
          "Program log: AnchorError occurred. Error Code: Paused. Error Number: 6000. Error Message: Pool is paused.",
        ],
        noProgram,
      ),
    ).toBe("Pool is paused");
  });

  it("names unknown codes and runtime errors without raw JSON", () => {
    expect(describeSolError({ InstructionError: [0, { Custom: 43008 }] }, [], noProgram)).toBe(
      "Error 43008",
    );
    expect(describeSolError({ InstructionError: [0, "InsufficientFunds"] }, [], noProgram)).toBe(
      "Insufficient balance",
    );
    expect(
      describeSolError({ InsufficientFundsForRent: { account_index: 0 } }, [], noProgram),
    ).toBe("Not enough SOL left for rent");
    expect(describeSolError("ProgramFailedToComplete", [], noProgram)).toBe(
      "Program failed to complete",
    );
  });
});
