import { describe, expect, it } from "vitest";
import type { TxStatus } from "../status";
import { withReceivedAmount } from "./received";

const ME = "bc1qme";
const BATCH: TxStatus = {
  kind: "final",
  value: { kind: "amount", amount: 12.3, symbol: "BTC", eur: 1_000_000, recipients: 200 },
  details: {
    from: "bc1qexchange",
    to: null,
    amount: { amount: 12.3, symbol: "BTC", eur: 1_000_000 },
    fee: { amount: 0.0001, symbol: "BTC", eur: 8 },
    time: 1_700_000_000,
  },
};
const MINE = { amount: 0.015, symbol: "BTC", eur: 1200 };

describe("withReceivedAmount", () => {
  it("shows what arrived at the address, not the batch it came in", () => {
    const status = withReceivedAmount(BATCH, ME, MINE);
    expect(status).toMatchObject({
      kind: "final",
      value: { kind: "amount", amount: 0.015, symbol: "BTC", eur: 1200 },
      details: { amount: MINE, to: { address: ME, name: null, method: null }, from: "bc1qexchange" },
    });
    // No "to 200 addresses" under the amount.
    expect(status).not.toHaveProperty("value.recipients");
  });

  it("keeps the rest of the status, and does not change the original", () => {
    const pending = { ...BATCH, kind: "pending", cause: null, blocksAway: 2 } as TxStatus;
    expect(withReceivedAmount(pending, ME, MINE)).toMatchObject({ kind: "pending", blocksAway: 2 });
    expect(withReceivedAmount(BATCH, ME, MINE)).not.toBe(BATCH);
    expect(BATCH).toMatchObject({ value: { amount: 12.3 } });
  });

  it("can show a token, and an amount without a euro value", () => {
    expect(withReceivedAmount(BATCH, ME, { amount: 400, symbol: "USDC", eur: null })).toMatchObject({
      value: { amount: 400, symbol: "USDC", eur: null },
    });
  });

  it("leaves statuses without an amount alone", () => {
    for (const status of [{ kind: "notFound" }, { kind: "replaced", by: "abc" }] as TxStatus[]) {
      expect(withReceivedAmount(status, ME, MINE)).toBe(status);
    }
  });
});
