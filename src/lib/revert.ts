import {
  decodeAbiParameters,
  toFunctionSelector,
  type Hex,
} from "viem";

const PRICE_MOVED = "Price moved more than you allowed";
const NO_BALANCE = "Insufficient balance";
const NO_ALLOWANCE = "Token not approved";
const DEADLINE = "Deadline passed";

// Custom errors that wallets and routers commonly revert with.
const CUSTOM_ERRORS: Record<string, string> = Object.fromEntries(
  (
    [
      ["ERC20InsufficientBalance(address,uint256,uint256)", NO_BALANCE],
      ["ERC20InsufficientAllowance(address,uint256,uint256)", NO_ALLOWANCE],
      ["V2TooLittleReceived()", PRICE_MOVED],
      ["V3TooLittleReceived()", PRICE_MOVED],
      ["V2TooMuchRequested()", PRICE_MOVED],
      ["V3TooMuchRequested()", PRICE_MOVED],
      ["V4TooLittleReceived(uint256,uint256)", PRICE_MOVED],
      ["V4TooMuchRequested(uint256,uint256)", PRICE_MOVED],
      ["MaximumAmountExceeded(uint128,uint128)", PRICE_MOVED],
      ["MinimumAmountInsufficient(uint128,uint128)", PRICE_MOVED],
      ["TooLittleReceived()", PRICE_MOVED],
      ["TransactionDeadlinePassed()", DEADLINE],
      ["DeadlinePassed()", DEADLINE],
      ["InsufficientETH()", "Not enough ETH sent"],
    ] as const
  ).map(([signature, text]) => [toFunctionSelector(signature), text]),
);

const ERROR_STRING = toFunctionSelector("Error(string)");
const PANIC = toFunctionSelector("Panic(uint256)");
// Uniswap's Universal Router wraps the real error of a failed command.
const EXECUTION_FAILED = toFunctionSelector("ExecutionFailed(uint256,bytes)");

// Revert strings in plain language, first match wins.
const MESSAGES: [RegExp, string][] = [
  [/exceeds balance|insufficient (balance|funds)/i, NO_BALANCE],
  [/too little received|insufficient_output_amount|too_little_received|slippage/i, PRICE_MOVED],
  [/allowance/i, NO_ALLOWANCE],
  [/too old|expired|deadline/i, DEADLINE],
  [/^stf$|transfer_?from_?failed/i, "Token transfer failed"],
];

const MAX_RAW_LENGTH = 40;

/** A failed transaction's revert data in plain language, or null when there is none. */
export function describeRevert(data: Hex | undefined): string | null {
  if (!data || data.length < 10) return null;
  const selector = data.slice(0, 10).toLowerCase();
  const args = `0x${data.slice(10)}` as Hex;
  try {
    if (selector === ERROR_STRING) {
      const [message] = decodeAbiParameters([{ type: "string" }], args);
      return describeMessage(message);
    }
    if (selector === PANIC) return "Contract error";
    if (selector === EXECUTION_FAILED) {
      const [, inner] = decodeAbiParameters([{ type: "uint256" }, { type: "bytes" }], args);
      return describeRevert(inner);
    }
  } catch {
    // Malformed data: fall through to the raw selector.
  }
  return CUSTOM_ERRORS[selector] ?? `Error ${selector}`;
}

function describeMessage(message: string): string | null {
  const trimmed = message.trim();
  if (!trimmed) return null;
  const known = MESSAGES.find(([pattern]) => pattern.test(trimmed));
  if (known) return known[1];
  return trimmed.length > MAX_RAW_LENGTH ? `${trimmed.slice(0, MAX_RAW_LENGTH)}…` : trimmed;
}
