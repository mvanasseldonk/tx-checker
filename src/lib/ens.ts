import { BaseError, ContractFunctionRevertedError, type Address } from "viem";
import { normalize } from "viem/ens";
import { ethClient } from "./eth";

/** What an ENS name came to: its name (normalized) and the address it points to. */
export type EnsResult =
  | { kind: "address"; name: string; address: Address }
  // The name has no address to send to, whether it is registered or not.
  | { kind: "none"; name: string }
  | { kind: "invalid" }
  // The lookup itself failed: the name may well have an address.
  | { kind: "unavailable" };

// What the universal resolver says when there is simply nothing to find. Its other errors (the HttpError
// of an offchain gateway, ResolverError) say that the lookup failed, so they are not in this list.
const NO_ADDRESS = new Set(["ResolverNotFound", "ResolverNotContract", "UnsupportedResolverProfile"]);

/** Is this error the resolver saying that the name has no address (and not that the lookup went wrong)? */
export function isNoAddress(error: unknown): boolean {
  const walk = (error as { walk?: (fn: (e: unknown) => boolean) => unknown } | null)?.walk;
  const reverted = walk?.call(error, (e) => e instanceof ContractFunctionRevertedError);
  return reverted instanceof ContractFunctionRevertedError && NO_ADDRESS.has(reverted.data?.errorName ?? "");
}

/** The part of the client that is used, so that a test can stand in for it. */
type EnsClient = { getEnsAddress: (parameters: { name: string; strict: boolean }) => Promise<Address | null> };

/**
 * Looks up the address of a `.eth` name, given with its outer spaces at most (`foo bar.eth` is no name).
 * `strict` makes viem throw every error of the resolver, where it would turn a failing offchain gateway into
 * "no address" otherwise: only the errors of NO_ADDRESS, and an empty answer, mean that.
 */
export async function resolveEns(input: string, client?: EnsClient): Promise<EnsResult> {
  let name: string;
  try {
    name = normalize(input.trim());
  } catch {
    return { kind: "invalid" };
  }
  if (!name.endsWith(".eth") || name === ".eth") return { kind: "invalid" };
  try {
    const address = await (client ?? ethClient()).getEnsAddress({ name, strict: true });
    return address ? { kind: "address", name, address } : { kind: "none", name };
  } catch (error) {
    if (isNoAddress(error)) return { kind: "none", name };
    // Only the short message: the whole error holds the RPC URL, and with it the API key.
    console.error(`Looking up ENS name ${name} failed: ${error instanceof BaseError ? error.shortMessage : "unknown error"}`);
    return { kind: "unavailable" };
  }
}
