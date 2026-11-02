import { cacheLife } from "next/cache";
import { shortAddress } from "./format";
import { eurPrice } from "./prices";
import { describeSolError } from "./solErrors";
import {
  detailAmount,
  type TxDetails,
  type TxRecipient,
  type TxStatus,
  type TxValue,
} from "./status";

const LAMPORTS_PER_SOL = 1e9;
// Mainnet finalizes within about a second of confirming, so not-yet-final is short-lived.
const PROGRESS = { processed: 0.33, confirmed: 0.66 };
const TIMEOUT_MS = 2500;
const RETRY_MS = 400;
// Smaller transfers alongside a program call are tips to validators, not what the user sent.
const TIP_LAMPORTS = 1_000_000;

const SYSTEM = "11111111111111111111111111111111";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const WRAPPED_SOL = "So11111111111111111111111111111111111111112";

// Programs that only prepare or decorate a transaction, never what it is about.
const HELPERS = new Set([
  "ComputeBudget111111111111111111111111111111",
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr",
  "Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo",
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95",
]);

// Programs people send transactions to most.
const PROGRAMS: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter",
  JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB: "Jupiter",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "Raydium",
  CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C: "Raydium",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Orca",
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun",
  pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA: "PumpSwap",
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: "Meteora",
  Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB: "Meteora",
  M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K: "Magic Eden",
  TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN: "Tensor",
  MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD: "Marinade",
  Stake11111111111111111111111111111111111111: "Stake",
  [TOKEN]: "Token Program",
  [TOKEN_2022]: "Token Program",
};

// Tokens people send most, by mint.
const TOKENS: Record<string, string> = {
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
  [WRAPPED_SOL]: "SOL",
  JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN: "JUP",
  DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263: "BONK",
  EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm: "WIF",
  jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL: "JTO",
  HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3: "PYTH",
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": "RAY",
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: "mSOL",
  J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn: "JitoSOL",
  "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo": "PYUSD",
};

type SignatureStatus = { confirmationStatus: "processed" | "confirmed" | "finalized" | null };

type Instruction = {
  programId: string;
  parsed?: { type?: string; info?: Record<string, unknown> } | string;
};

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { decimals: number };
};

type ParsedTransaction = {
  blockTime: number | null;
  meta: {
    err: unknown;
    fee: number;
    logMessages: string[] | null;
    preTokenBalances: TokenBalance[] | null;
    postTokenBalances: TokenBalance[] | null;
  };
  transaction: {
    message: {
      accountKeys: { pubkey: string }[];
      instructions: Instruction[];
    };
  };
};

function rpcUrl(): string {
  const key = process.env.HELIUS_API_KEY;
  // The public endpoint is rate limited: fine while developing, not for real traffic.
  return key
    ? `https://mainnet.helius-rpc.com/?api-key=${key}`
    : "https://api.mainnet-beta.solana.com";
}

async function rpc<T>(method: string, params: unknown, retry = true): Promise<T> {
  const response = await fetch(rpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // Rate limits and node hiccups pass quickly; one failed refresh shouldn't end the countdown.
  if ((response.status === 429 || response.status >= 500) && retry) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_MS));
    return rpc(method, params, false);
  }
  if (!response.ok) throw new Error(`Solana RPC ${method} returned ${response.status}`);
  const body = (await response.json()) as { result?: T; error?: { message: string } };
  if (body.error) throw new Error(`Solana RPC ${method}: ${body.error.message}`);
  return body.result as T;
}

/** Looks up a Solana mainnet transaction and what to tell the user about it. */
export async function lookupSol(signature: string): Promise<TxStatus> {
  const statuses = await rpc<{ value: (SignatureStatus | null)[] }>("getSignatureStatuses", [
    [signature],
    { searchTransactionHistory: true },
  ]);
  const status = statuses.value[0];
  if (!status) return { kind: "notFound" };

  // A processed transaction can't be fetched yet: it shows up once confirmed, a moment later.
  const tx = await rpc<ParsedTransaction | null>("getTransaction", [
    signature,
    { encoding: "jsonParsed", commitment: "confirmed", maxSupportedTransactionVersion: 1 },
  ]);
  if (!tx) return { kind: "notFound" };

  const at = tx.blockTime;
  const solEur = eurPrice("solana", at);
  const { instructions } = tx.transaction.message;
  const [described, price] = await Promise.all([describeValue(tx, at, solEur), solEur]);
  const { value } = described;
  const details = detailsOf(tx, described, price);

  if (tx.meta.err) {
    const reason = describeSolError(
      tx.meta.err,
      tx.meta.logMessages ?? [],
      (index) => instructions[index]?.programId,
    );
    return { kind: "failed", value, details, reason, feeEur: details.fee?.eur ?? null };
  }

  if (status.confirmationStatus === "finalized") return { kind: "final", value, details };
  return {
    kind: "included",
    value,
    details,
    progress: PROGRESS[status.confirmationStatus ?? "processed"],
    secondsToFinal: 1,
  };
}

type Described = { value: TxValue; to: TxRecipient };

function detailsOf(tx: ParsedTransaction, { value, to }: Described, solEur: number | null): TxDetails {
  const fee = tx.meta.fee / LAMPORTS_PER_SOL;
  return {
    from: tx.transaction.message.accountKeys[0].pubkey,
    to,
    amount: detailAmount(value, "SOL", solEur),
    fee: { amount: fee, symbol: "SOL", eur: solEur === null ? null : fee * solEur },
    time: tx.blockTime,
  };
}

/**
 * A SOL or token transfer as an amount, anything else as a program call. Also who it goes to:
 * the recipient of a transfer, the program of a call.
 */
async function describeValue(
  tx: ParsedTransaction,
  at: number | null,
  solEur: Promise<number | null>,
): Promise<Described> {
  const { instructions, accountKeys } = tx.transaction.message;
  const signer = accountKeys[0]?.pubkey;
  const main = instructions.filter(
    (ix) => !HELPERS.has(ix.programId) && parsedType(ix) !== "advanceNonce",
  );
  const transfers = main.filter((ix) => ix.programId === SYSTEM && parsedType(ix) === "transfer");
  const sent =
    transfers
      .filter((ix) => info(ix).source === signer && Number(info(ix).lamports ?? 0) >= TIP_LAMPORTS)
      .reduce((sum, ix) => sum + Number(info(ix).lamports ?? 0), 0) / LAMPORTS_PER_SOL;

  const others = main.filter((ix) => !transfers.includes(ix));
  if (others.length === 0 && transfers.length > 0) {
    // A plain SOL transfer, maybe with a tip: the largest transfer is the one that matters.
    const largest = transfers.reduce((best, ix) =>
      Number(info(ix).lamports ?? 0) > Number(info(best).lamports ?? 0) ? ix : best,
    );
    const amount = Number(info(largest).lamports ?? 0) / LAMPORTS_PER_SOL;
    const price = await solEur;
    return {
      value: { kind: "amount", amount, symbol: "SOL", eur: price === null ? null : amount * price },
      to: { address: String(info(largest).destination ?? SYSTEM), name: null, method: null },
    };
  }

  // A token transfer, maybe among other token bookkeeping: the one the signer signed is it.
  const signed = others.filter(
    (ix) => isTokenProgram(ix.programId) && info(ix).authority === signer,
  );
  const candidates =
    others.length === 1 ? others : others.every((ix) => isTokenProgram(ix.programId)) ? signed : [];
  if (candidates.length === 1) {
    const token = tokenTransfer(tx, candidates[0]);
    if (token) {
      const [symbol, price] = await Promise.all([
        tokenSymbol(token.mint),
        token.mint === WRAPPED_SOL
          ? solEur
          : eurPrice({ platform: "solana", address: token.mint }, at),
      ]);
      return {
        value: {
          kind: "amount",
          amount: token.amount,
          symbol,
          eur: price === null ? null : token.amount * price,
        },
        to: { address: token.recipient, name: null, method: null },
      };
    }
  }

  const program =
    others.find((ix) => !isTokenProgram(ix.programId))?.programId ?? others[0]?.programId ?? SYSTEM;
  const name = PROGRAMS[program] ?? null;
  return {
    value: { kind: "call", name, address: program, sent },
    to: { address: program, name, method: null },
  };
}

function tokenTransfer(
  tx: ParsedTransaction,
  ix: Instruction,
): { mint: string; amount: number; recipient: string } | null {
  const type = parsedType(ix);
  if (type !== "transfer" && type !== "transferChecked") return null;
  const data = info(ix);
  const recipient = tokenOwner(tx, data.destination);
  if (type === "transferChecked") {
    const amount = (data.tokenAmount as { uiAmount?: number } | undefined)?.uiAmount;
    return typeof data.mint === "string" && typeof amount === "number"
      ? { mint: data.mint, amount, recipient }
      : null;
  }
  // A plain transfer doesn't name its mint: read it from the source account's balance.
  const index = tx.transaction.message.accountKeys.findIndex((key) => key.pubkey === data.source);
  const balance = tx.meta.preTokenBalances?.find((b) => b.accountIndex === index);
  if (!balance || typeof data.amount !== "string") return null;
  return {
    mint: balance.mint,
    amount: Number(data.amount) / 10 ** balance.uiTokenAmount.decimals,
    recipient,
  };
}

/** The wallet that owns a token account, falling back to the account itself. */
function tokenOwner(tx: ParsedTransaction, account: unknown): string {
  const index = tx.transaction.message.accountKeys.findIndex((key) => key.pubkey === account);
  const balances = [...(tx.meta.postTokenBalances ?? []), ...(tx.meta.preTokenBalances ?? [])];
  return balances.find((b) => b.accountIndex === index)?.owner ?? String(account);
}

function isTokenProgram(programId: string): boolean {
  return programId === TOKEN || programId === TOKEN_2022;
}

function parsedType(ix: Instruction): string | undefined {
  return typeof ix.parsed === "object" ? ix.parsed.type : undefined;
}

function info(ix: Instruction): Record<string, unknown> {
  return (typeof ix.parsed === "object" && ix.parsed.info) || {};
}

/** A token's symbol: a well-known one, or its metadata on Helius. */
async function tokenSymbol(mint: string): Promise<string> {
  const known = TOKENS[mint];
  if (known) return known;
  if (!process.env.HELIUS_API_KEY) return shortAddress(mint);
  try {
    return (await heliusSymbol(mint)) ?? shortAddress(mint);
  } catch {
    return shortAddress(mint);
  }
}

async function heliusSymbol(mint: string): Promise<string | null> {
  "use cache";
  cacheLife("days");
  const asset = await rpc<{
    content?: { metadata?: { symbol?: string } };
    token_info?: { symbol?: string };
  } | null>("getAsset", { id: mint });
  return asset?.token_info?.symbol || asset?.content?.metadata?.symbol || null;
}
