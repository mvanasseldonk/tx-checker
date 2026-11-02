import { describeMessage, NO_BALANCE, PRICE_MOVED } from "./revert";

const SYSTEM = "11111111111111111111111111111111";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

// Custom error codes of the programs people trade through most, by program.
const PROGRAM_ERRORS: Record<string, Record<number, string>> = {
  [SYSTEM]: { 1: NO_BALANCE },
  [TOKEN]: { 1: NO_BALANCE },
  [TOKEN_2022]: { 1: NO_BALANCE },
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: { 6001: PRICE_MOVED },
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": { 30: PRICE_MOVED },
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": { 6002: PRICE_MOVED, 6003: PRICE_MOVED },
};

// Errors of the transaction as a whole, or of an instruction without a custom code.
const RUNTIME_ERRORS: Record<string, string> = {
  InsufficientFunds: NO_BALANCE,
  InsufficientFundsForFee: "Not enough SOL for the fee",
  InsufficientFundsForRent: "Not enough SOL left for rent",
};

const FAILED_LOG = /^Program (\w+) failed: custom program error: 0x([0-9a-f]+)$/i;
const ANCHOR_MESSAGE = /Error Message: (.+?)\.?$/;

/**
 * A failed Solana transaction's error in plain language, never as raw JSON. `programAt` gives
 * the program of a top-level instruction, for when the logs don't say where it failed.
 */
export function describeSolError(
  err: unknown,
  logs: string[],
  programAt: (index: number) => string | undefined,
): string | null {
  if (err === null || err === undefined) return null;
  if (typeof err === "string") return RUNTIME_ERRORS[err] ?? humanize(err);
  if (typeof err !== "object") return null;

  const [name, detail] = Object.entries(err)[0] ?? [];
  if (name !== "InstructionError" || !Array.isArray(detail)) {
    return name ? (RUNTIME_ERRORS[name] ?? humanize(name)) : null;
  }

  const [index, inner] = detail as [number, unknown];
  if (typeof inner === "string") return RUNTIME_ERRORS[inner] ?? humanize(inner);
  const code = (inner as { Custom?: number } | null)?.Custom;
  if (code === undefined) return null;

  // The first failure in the logs is the innermost program, where the error came from.
  const failed = logs.map((line) => FAILED_LOG.exec(line)).find(Boolean);
  const program = failed?.[1] ?? programAt(index);
  const origin = failed ? parseInt(failed[2], 16) : code;
  const known = program ? PROGRAM_ERRORS[program]?.[origin] : undefined;
  if (known) return known;

  const anchor = logs.map((line) => ANCHOR_MESSAGE.exec(line)).find(Boolean);
  if (anchor) return describeMessage(anchor[1]);
  return `Error ${origin}`;
}

/** "ProgramFailedToComplete" → "Program failed to complete" */
function humanize(name: string): string {
  const words = name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}
