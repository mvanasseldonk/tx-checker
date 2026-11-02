import { decodeFunctionData, erc20Abi, type Hex } from "viem";

// A few calls people see most, by 4-byte selector. A label, not an interpretation.
const SELECTORS: Record<string, string> = {
  "0x3593564c": "execute",
  "0x7ff36ab5": "swapExactETHForTokens",
  "0x38ed1739": "swapExactTokensForTokens",
  "0x18cbafe5": "swapExactTokensForETH",
  "0xd0e30db0": "deposit",
  "0x2e1a7d4d": "withdraw",
};

/** The name of the method a call invokes, when it is cheap to know. */
export function methodName(input: Hex): string | null {
  try {
    return decodeFunctionData({ abi: erc20Abi, data: input }).functionName;
  } catch {
    return SELECTORS[input.slice(0, 10).toLowerCase()] ?? null;
  }
}
