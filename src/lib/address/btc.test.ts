import { describe, expect, it } from "vitest";
import { directionOf, newestFirst, toActivity, type AddressTx } from "./btc";

const ME = "bc1qme";
const OTHER = "bc1qother";

function tx(
  txid: string,
  from: string,
  outputs: [string, number][],
  status: { confirmed: boolean; block_time?: number } = { confirmed: true, block_time: 1_700_000_000 },
): AddressTx {
  return {
    txid,
    vin: [{ prevout: { scriptpubkey_address: from } }],
    vout: outputs.map(([scriptpubkey_address, value]) => ({ scriptpubkey_address, value })),
    status,
  };
}

describe("newestFirst", () => {
  it("puts the newest pending transaction first: mempool.space lists those oldest first", () => {
    const list = [
      tx("pending-old", OTHER, [[ME, 1]], { confirmed: false }),
      tx("pending-mid", OTHER, [[ME, 1]], { confirmed: false }),
      tx("pending-new", OTHER, [[ME, 1]], { confirmed: false }),
      tx("block-2", OTHER, [[ME, 1]]),
      tx("block-1", OTHER, [[ME, 1]]),
    ];
    expect(newestFirst(list).map((t) => t.txid)).toEqual([
      "pending-new",
      "pending-mid",
      "pending-old",
      "block-2",
      "block-1",
    ]);
  });

  it("keeps the order of confirmed transactions, which is already newest first", () => {
    const list = [tx("b", OTHER, [[ME, 1]]), tx("a", OTHER, [[ME, 1]])];
    expect(newestFirst(list).map((t) => t.txid)).toEqual(["b", "a"]);
    expect(newestFirst([])).toEqual([]);
  });
});

describe("directionOf", () => {
  it("is Sent when this address is one of the inputs, Received otherwise", () => {
    expect(directionOf(tx("a", ME, [[OTHER, 1000]]), ME)).toBe("sent");
    expect(directionOf(tx("b", OTHER, [[ME, 1000]]), ME)).toBe("received");
  });

  it("is Sent even when most of it comes back as change", () => {
    const sent = tx("c", ME, [[OTHER, 10], [ME, 99_990]]);
    expect(directionOf(sent, ME)).toBe("sent");
  });

  it("is Received when only another input is this address' counterpart", () => {
    const mixed: AddressTx = {
      ...tx("d", OTHER, [[ME, 500]]),
      vin: [{ prevout: null }, { prevout: { scriptpubkey_address: OTHER } }],
    };
    expect(directionOf(mixed, ME)).toBe("received");
  });
});

describe("toActivity", () => {
  it("counts what a Sent transaction paid out, not the change", () => {
    expect(toActivity(tx("a", ME, [[OTHER, 25_000], [ME, 75_000]]), ME)).toMatchObject({
      id: "a",
      direction: "sent",
      sats: 25_000,
      pending: false,
      time: 1_700_000_000,
    });
  });

  it("counts what a Received transaction paid to this address", () => {
    expect(toActivity(tx("b", OTHER, [[ME, 40_000], [OTHER, 9_000], [ME, 1_000]]), ME).sats).toBe(41_000);
  });

  it("has no time while pending", () => {
    expect(toActivity(tx("p", OTHER, [[ME, 1]], { confirmed: false }), ME)).toMatchObject({
      pending: true,
      time: null,
    });
  });
});
