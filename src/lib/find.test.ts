import { describe, expect, it } from "vitest";
import type { EvmChain } from "./detect";
import { findFirst } from "./find";
import type { TxStatus } from "./status";

const NETWORKS: EvmChain[] = ["eth", "base", "arb", "op"];
const NOT_FOUND: TxStatus = { kind: "notFound" };
const FOUND: TxStatus = {
  kind: "final",
  value: { kind: "amount", amount: 1, symbol: "ETH", eur: null },
  details: { from: null, to: null, amount: null, fee: null, time: null },
};

/** A lookup per network that answers with `answers[network]`, fails on "fail", and never answers on "never". */
function lookup(answers: Partial<Record<EvmChain, TxStatus | "fail" | "never">>) {
  return (chain: EvmChain): Promise<TxStatus> => {
    const answer = answers[chain] ?? NOT_FOUND;
    if (answer === "never") return new Promise(() => {});
    return answer === "fail" ? Promise.reject(new Error("down")) : Promise.resolve(answer);
  };
}

describe("findFirst", () => {
  it("takes the first network that has it, without waiting for the slowest", async () => {
    const result = await findFirst(NETWORKS, lookup({ eth: "never", base: FOUND, arb: "never", op: "never" }));
    expect(result).toEqual({ kind: "found", chain: "base", status: FOUND });
  });

  it("is not found only when every network has answered and none has it", async () => {
    expect(await findFirst(NETWORKS, lookup({}))).toEqual({ kind: "notFound" });
  });

  it("keeps waiting while a network has not answered", async () => {
    let settled = false;
    void findFirst(NETWORKS, lookup({ op: "never" })).then(() => (settled = true));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(settled).toBe(false);
  });

  it("fails when a network failed and none of the others has it", async () => {
    expect(await findFirst(NETWORKS, lookup({ arb: "fail" }))).toEqual({ kind: "failed" });
  });

  it("shows a transaction on another network when one is down", async () => {
    const result = await findFirst(NETWORKS, lookup({ eth: "fail", op: FOUND }));
    expect(result).toEqual({ kind: "found", chain: "op", status: FOUND });
  });

  it("shows a transaction that is found after a network failed", async () => {
    const slow = (chain: EvmChain) =>
      chain === "arb"
        ? new Promise<TxStatus>((resolve) => setTimeout(() => resolve(FOUND), 20))
        : lookup({ eth: "fail" })(chain);
    expect(await findFirst(NETWORKS, slow)).toMatchObject({ kind: "found", chain: "arb" });
  });

  it("is not found when there is no network to ask", async () => {
    expect(await findFirst([], lookup({}))).toEqual({ kind: "notFound" });
  });
});
