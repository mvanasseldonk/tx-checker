import type { Chain } from "../detect";
import { eurPrice, type Coin } from "../prices";
import { WRAPPED_SOL } from "../sol";
import type { TxAmount, TxStatus } from "../status";
import type { Candidate } from "./types";

const NATIVE: Record<Chain, Coin> = { eth: "ethereum", sol: "solana", btc: "bitcoin" };

/**
 * A transaction found through an address that was Received says what arrived at that address,
 * not what the whole transaction moved: an exchange pays out many addresses in one transaction.
 * The circle and the Details then show `amount`, and the address as the recipient.
 */
export function withReceivedAmount(status: TxStatus, address: string, amount: TxAmount): TxStatus {
  if (status.kind === "notFound" || status.kind === "replaced" || status.kind === "failed") return status;
  return {
    ...status,
    value: { kind: "amount", ...amount },
    details: { ...status.details, amount, to: { address, name: null, method: null } },
  };
}

/** The status with what the candidate received in it, when it is a Received one with an amount. */
export async function showReceived(
  chain: Chain,
  address: string,
  status: TxStatus,
  candidate: Candidate,
): Promise<TxStatus> {
  if (candidate.direction !== "received" || !candidate.amount) return status;
  const { token, time } = candidate;
  const coin: Coin =
    !token || token === WRAPPED_SOL
      ? NATIVE[chain]
      : { platform: chain === "sol" ? "solana" : "ethereum", address: token };
  const price = await eurPrice(coin, time);
  const { amount, symbol } = candidate.amount;
  return withReceivedAmount(status, address, { amount, symbol, eur: price === null ? null : amount * price });
}
