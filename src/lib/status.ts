/** What a transaction moves, as shown in the circle. */
export type TxValue =
  // `recipients` is set when a Bitcoin transaction splits the amount over several addresses.
  | { kind: "amount"; amount: number; symbol: string; eur: number | null; recipients?: number }
  // A contract (ETH) or program (SOL) call, with the native coin sent along with it.
  | { kind: "call"; name: string | null; address: string; sent: number };

/** An amount of a coin with its euro value, when the coin has a known price. */
export type TxAmount = { amount: number; symbol: string; eur: number | null };

/** Who receives a transaction: an address, its name and the method called, as far as known. */
export type TxRecipient = { address: string; name: string | null; method: string | null };

/** The few facts shown on request. */
export type TxDetails = {
  // Null when no input address is known, as in a Bitcoin coinbase transaction.
  from: string | null;
  to: TxRecipient | null;
  amount: TxAmount | null;
  // Null while no fee has been charged yet.
  fee: TxAmount | null;
  // Unix seconds, null while the transaction is not in a block.
  time: number | null;
};

export type TxStatus =
  | { kind: "final"; value: TxValue; details: TxDetails }
  | { kind: "included"; value: TxValue; details: TxDetails; progress: number; secondsToFinal: number }
  // `blocksAway` (Bitcoin): which projected block it is in, 1 being the next one.
  | { kind: "pending"; value: TxValue; details: TxDetails; cause: "fee" | "nonce" | null; blocksAway?: number }
  | { kind: "failed"; value: TxValue; details: TxDetails; reason: string | null; feeEur: number | null }
  | { kind: "notFound" }
  // Bitcoin: swapped for a faster or cancelling version. `by` is the txid that replaced it.
  | { kind: "replaced"; by: string };

/** The amount row of the details: what was moved, or the coin sent along with a call. */
export function detailAmount(value: TxValue, symbol: string, nativeEur: number | null): TxAmount | null {
  if (value.kind === "amount") return value;
  if (value.sent === 0) return null;
  return { amount: value.sent, symbol, eur: nativeEur === null ? null : value.sent * nativeEur };
}
