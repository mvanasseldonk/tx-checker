import type { AddressChain } from "../detect";
import { lookupBtcAddress } from "./btc";
import { lookupEthAddress } from "./eth";
import { lookupSolAddress } from "./sol";
import type { AddressActivity } from "./types";

/** Looks up the recent transactions of an address on its chain. */
export const LOOKUP_ADDRESS: Record<AddressChain, (address: string) => Promise<AddressActivity>> = {
  eth: lookupEthAddress,
  sol: lookupSolAddress,
  btc: lookupBtcAddress,
};
