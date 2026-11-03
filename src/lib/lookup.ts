import type { Hash } from "viem";
import { lookupBtc } from "./btc";
import type { Chain } from "./detect";
import { lookupEth } from "./eth";
import { lookupSol } from "./sol";
import type { TxStatus } from "./status";

/** Looks up one transaction on its chain. */
export const LOOKUP: Record<Chain, (id: string) => Promise<TxStatus>> = {
  eth: (id) => lookupEth(id as Hash),
  sol: lookupSol,
  btc: lookupBtc,
};
