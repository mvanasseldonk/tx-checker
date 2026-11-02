/** What a transaction moves, as shown in the circle. */
export type TxValue =
  | { kind: "amount"; amount: number; symbol: string; eur: number | null }
  // A contract (ETH) or program (SOL) call, with the native coin sent along with it.
  | { kind: "call"; name: string | null; address: string; sent: number };

export type TxStatus =
  | { kind: "final"; value: TxValue }
  | { kind: "included"; value: TxValue; progress: number; secondsToFinal: number }
  | { kind: "pending"; value: TxValue; cause: "fee" | "nonce" | null }
  | { kind: "failed"; value: TxValue; reason: string | null; feeEur: number | null }
  | { kind: "notFound" };
