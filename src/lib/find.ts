import type { EvmChain } from "./detect";
import type { TxStatus } from "./status";

/** The outcome of asking several networks for one hash. */
export type Found =
  | { kind: "found"; chain: EvmChain; status: Exclude<TxStatus, { kind: "notFound" }> }
  // Every network answered, and none has it.
  | { kind: "notFound" }
  // At least one network failed and none of the others has it: it may well be on the one that failed.
  | { kind: "failed" };

/**
 * Asks every network at once and takes the first one that has the transaction, without waiting for
 * the others. Only when all have answered is it not found, and a network that failed makes that a failure.
 */
export function findFirst(
  networks: readonly EvmChain[],
  look: (chain: EvmChain) => Promise<TxStatus>,
): Promise<Found> {
  return new Promise((resolve) => {
    let waiting = networks.length;
    let failed = false;
    const answered = () => {
      if (--waiting === 0) resolve(failed ? { kind: "failed" } : { kind: "notFound" });
    };
    if (waiting === 0) resolve({ kind: "notFound" });
    for (const chain of networks) {
      look(chain).then(
        (status) => {
          if (status.kind === "notFound") answered();
          else resolve({ kind: "found", chain, status });
        },
        () => {
          failed = true;
          answered();
        },
      );
    }
  });
}
