import { eurPriceNow, type Price } from "../prices";
import { LAMPORTS_PER_SOL, rpc, tokenSymbol, WRAPPED_SOL } from "../sol";
import { isTimeout, isWellKnownToken, once, SOL_DUST, summarize, takeRecent, worthShowing } from "./rules";
import type { AddressActivity, Candidate, Direction } from "./types";

// Read this many, then drop the spam: a wallet that gets a lot of dust still needs a few real ones.
const TRANSACTIONS = 40;

type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { uiAmountString?: string };
};

export type SolTransaction = {
  blockTime: number | null;
  meta: {
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances: TokenBalance[] | null;
    postTokenBalances: TokenBalance[] | null;
  };
  transaction: {
    signatures: string[];
    message: { accountKeys: { pubkey: string; signer?: boolean }[] };
  };
};

/** What one transaction did to the address: a direction, and the change of each coin it touched. */
export type Movement = {
  id: string;
  direction: Direction;
  time: number | null;
  // Net change of SOL (the fee not counted) and of each token, by mint. Negative is outgoing.
  sol: number;
  tokens: { mint: string; amount: number }[];
};

/** The recent transactions of a Solana address, newest first, minus spam. */
export async function lookupSolAddress(address: string): Promise<AddressActivity> {
  try {
    // The plain signatures call misses tokens that were sent to the wallet; this one finds them.
    const { data } = await rpc<{ data: SolTransaction[] }>("getTransactionsForAddress", [
      address,
      {
        transactionDetails: "full",
        encoding: "jsonParsed",
        sortOrder: "desc",
        limit: TRANSACTIONS,
        filters: { tokenAccounts: "balanceChanged" },
        maxSupportedTransactionVersion: 1,
      },
    ]);
    const solEur = once(() => eurPriceNow("solana"));
    const shown = await takeRecent(
      data.map((tx) => movementOf(tx, address)),
      (movement) => describe(movement, solEur),
    );
    const last = data[data.length - 1];
    const seenSince = data.length >= TRANSACTIONS ? last.blockTime : null;
    return summarize("sol", shown, Date.now() / 1000, seenSince);
  } catch (error) {
    // Helius gave up on an address with too much on it.
    if (isTimeout(error)) return { kind: "busy" };
    throw error;
  }
}

/** Sent when this address signed the transaction (a wallet's own transactions), else Received. */
export function movementOf(tx: SolTransaction, address: string): Movement {
  const keys = tx.transaction.message.accountKeys;
  const index = keys.findIndex((key) => key.pubkey === address);
  const { meta } = tx;
  // The fee is paid by the first account; it is not what the transaction moved.
  const fee = index === 0 ? meta.fee : 0;
  const lamports = index === -1 ? 0 : meta.postBalances[index] - meta.preBalances[index] + fee;

  const changes = new Map<string, number>();
  for (const [balances, sign] of [[meta.postTokenBalances, 1], [meta.preTokenBalances, -1]] as const) {
    for (const balance of balances ?? []) {
      if (balance.owner !== address) continue;
      const amount = Number(balance.uiTokenAmount.uiAmountString ?? 0) * sign;
      changes.set(balance.mint, (changes.get(balance.mint) ?? 0) + amount);
    }
  }
  return {
    id: tx.transaction.signatures[0],
    direction: index !== -1 && keys[index].signer ? "sent" : "received",
    time: tx.blockTime,
    sol: lamports / LAMPORTS_PER_SOL,
    tokens: [...changes].filter(([, amount]) => amount !== 0).map(([mint, amount]) => ({ mint, amount })),
  };
}

/** The transaction as a candidate, or null when it is spam (received transfers only). */
async function describe(movement: Movement, solEur: () => Promise<Price>): Promise<Candidate | null> {
  const { id, direction, time } = movement;
  const candidate = { id, direction, time, pending: false };
  // Same sign as the direction: what left on a send, what arrived on a receive.
  const sign = direction === "sent" ? -1 : 1;
  const tokens = movement.tokens
    .filter(({ amount }) => Math.sign(amount) === sign)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));

  if (direction === "sent") {
    const token = tokens[0];
    if (token) return { ...candidate, ...(await tokenAmount(token)) };
    const sol = Math.abs(movement.sol);
    return { ...candidate, amount: movement.sol < 0 ? { amount: sol, symbol: "SOL" } : null };
  }

  // Enough SOL, or a token somebody puts a price on, makes it real.
  if (movement.sol >= SOL_DUST) return { ...candidate, amount: { amount: movement.sol, symbol: "SOL" } };
  for (const token of tokens) {
    const wrapped = token.mint === WRAPPED_SOL;
    const price = wrapped ? await solEur() : await eurPriceNow({ platform: "solana", address: token.mint });
    if (worthShowing(token.amount, price, wrapped || isWellKnownToken("sol", token.mint))) {
      return { ...candidate, ...(await tokenAmount(token)) };
    }
  }
  return null;
}

async function tokenAmount({ mint, amount }: { mint: string; amount: number }) {
  return { amount: { amount: Math.abs(amount), symbol: await tokenSymbol(mint) }, token: mint };
}
