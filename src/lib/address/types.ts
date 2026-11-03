export type Direction = "sent" | "received";

/** One transaction of an address, as listed under "Not this one?". */
export type Candidate = {
  id: string;
  direction: Direction;
  // Unix seconds, null while the transaction is not in a block.
  time: number | null;
  pending: boolean;
  // What moved, where it is cheap to tell: the main coin or token of the transaction.
  amount: { amount: number; symbol: string } | null;
};

export type AddressActivity =
  // Newest first, at most RECENT of them.
  | { kind: "found"; candidates: Candidate[] }
  | { kind: "empty" }
  | { kind: "busy" };
