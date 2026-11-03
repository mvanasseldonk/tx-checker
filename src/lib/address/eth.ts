import { ethClient } from "../eth";
import { eurPriceNow, type Price } from "../prices";
import { isTimeout, isWellKnownToken, RECENT, summarize, takeRecent, worthShowing } from "./rules";
import type { AddressActivity, Candidate } from "./types";

// Each transfer list is read this deep: an address that gets a lot of spam needs the room to
// still turn up a few real transactions.
const TRANSFERS = 50;
// An EIP-7702 delegation is not a contract: the wallet just borrows code for its transactions.
const DELEGATION = "0xef0100";

export type Transfer = {
  hash: string;
  from: string;
  to: string | null;
  value: number | null;
  asset: string | null;
  blockNum: string;
  rawContract: { address: string | null };
  metadata: { blockTimestamp: string };
};

const timeOf = (transfer: Transfer) => Math.floor(Date.parse(transfer.metadata.blockTimestamp) / 1000);

type Mined = Omit<Candidate, "token"> & { block: number; token: string | null };

/** The recent transactions of an Ethereum address, newest first, minus spam. */
export async function lookupEthAddress(address: string): Promise<AddressActivity> {
  try {
    // A contract has everyone's transactions, which no list of five can sum up.
    if (isContract(await request<string>("eth_getCode", [address, "latest"]))) return { kind: "busy" };

    const [outgoing, incoming, pending] = await Promise.all([
      transfers({ fromAddress: address }),
      transfers({ toAddress: address }),
      pendingFrom(address),
    ]);
    const nativePrice = eurPriceNow("ethereum");
    const mined = await takeRecent(
      mergeTransfers(outgoing, incoming, address),
      async (tx) =>
        tx.direction === "sent" || (await isWorthShowing(tx, nativePrice)) ? candidateOf(tx) : null,
      RECENT - pending.length,
    );
    const recent = [...pending, ...mined].filter(
      (tx, i, all) => all.findIndex((other) => other.id === tx.id) === i,
    );
    return summarize("eth", recent.slice(0, RECENT), Date.now() / 1000, seenSince([outgoing, incoming]));
  } catch (error) {
    // Alchemy gave up on an address with too much on it.
    if (isTimeout(error)) return { kind: "busy" };
    throw error;
  }
}

// Not retried: a request that timed out is the sign of an address that is too busy, and
// trying again would only make the visitor wait three times as long.
function request<T>(method: string, params: unknown[]): Promise<T> {
  return ethClient().request({ method, params } as never, { retryCount: 0 }) as Promise<T>;
}

export function isContract(code: string): boolean {
  return code !== "0x" && !code.startsWith(DELEGATION);
}

async function transfers(side: { fromAddress: string } | { toAddress: string }): Promise<Transfer[]> {
  const result = await request<{ transfers: Transfer[] }>("alchemy_getAssetTransfers", [
    {
      ...side,
      category: ["external", "internal", "erc20"],
      order: "desc",
      maxCount: `0x${TRANSFERS.toString(16)}`,
      withMetadata: true,
      // Calling a contract moves no ETH, but it is a transaction the user made.
      excludeZeroValue: false,
    },
  ]);
  return result.transfers;
}

/**
 * Transactions waiting to be mined, from this address, newest first. Only outgoing ones can be
 * seen: a pending nonce means one was sent. Incoming ones are invisible until they are mined.
 */
async function pendingFrom(address: string): Promise<Candidate[]> {
  const [latest, pending] = await Promise.all([
    request<string>("eth_getTransactionCount", [address, "latest"]),
    request<string>("eth_getTransactionCount", [address, "pending"]),
  ]);
  // Older nonces than the latest one are pruned and only fail.
  const first = Number(latest);
  const nonces = Array.from({ length: Number(pending) - first }, (_, i) => first + i)
    .reverse()
    .slice(0, RECENT);
  const found = await Promise.all(
    nonces.map((nonce) =>
      request<{ hash: string; value: string } | null>("eth_getTransactionBySenderAndNonce", [
        address,
        `0x${nonce.toString(16)}`,
      ]),
    ),
  );
  return found.flatMap((tx) =>
    tx ? [{ id: tx.hash, direction: "sent" as const, time: null, pending: true, amount: null }] : [],
  );
}

/**
 * One entry per transaction from the transfers of both lists, newest first. A transaction can
 * have several transfers (an approval or swap moves a token and some ETH): it is Sent when
 * this address started any of them, which in practice is when it signed the transaction.
 */
export function mergeTransfers(outgoing: Transfer[], incoming: Transfer[], address: string): Mined[] {
  const byHash = new Map<string, Transfer[]>();
  for (const transfer of [...outgoing, ...incoming]) {
    byHash.set(transfer.hash, [...(byHash.get(transfer.hash) ?? []), transfer]);
  }
  const sent = new Set(outgoing.map((transfer) => transfer.hash));
  return [...byHash.entries()]
    .map(([hash, rows]): Mined => {
      const direction = sent.has(hash) ? "sent" : "received";
      const mine = rows.filter((row) => (direction === "sent" ? row.from : row.to) === address);
      // The first transfer that moves something is the one to describe.
      const main = mine.find((row) => row.value) ?? mine[0];
      return {
        id: hash,
        direction,
        block: Number(rows[0].blockNum),
        time: timeOf(rows[0]),
        pending: false,
        token: main?.rawContract.address ?? null,
        amount: main?.value ? { amount: main.value, symbol: main.asset ?? "tokens" } : null,
      };
    })
    .sort((a, b) => b.block - a.block);
}

/** How far back the lists reach together: transfers older than that may be missing from a full list. */
export function seenSince(lists: Transfer[][]): number | null {
  const reach = lists.filter((list) => list.length >= TRANSFERS).map((list) => timeOf(list[list.length - 1]));
  return reach.length > 0 ? Math.max(...reach) : null;
}

async function isWorthShowing(
  { amount, token }: Mined,
  nativePrice: Promise<Price>,
): Promise<boolean> {
  if (!amount) return false;
  const price = token ? await eurPriceNow({ platform: "ethereum", address: token }) : await nativePrice;
  return worthShowing(amount.amount, price, token === null || isWellKnownToken("eth", token));
}

function candidateOf({ id, direction, time, pending, amount, token }: Mined): Candidate {
  return { id, direction, time, pending, amount, ...(token && { token }) };
}
