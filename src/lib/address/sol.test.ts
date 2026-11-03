import { describe, expect, it } from "vitest";
import { movementOf, type SolTransaction } from "./sol";

const ME = "MeWa11et1111111111111111111111111111111111";
const OTHER = "Other1111111111111111111111111111111111111";
const MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

function tx(
  keys: { pubkey: string; signer?: boolean }[],
  pre: number[],
  post: number[],
  tokens: { pre?: [string, number][]; post?: [string, number][] } = {},
): SolTransaction {
  const balances = (list: [string, number][] = []) =>
    list.map(([owner, amount], i) => ({
      accountIndex: i + 10,
      mint: MINT,
      owner,
      uiTokenAmount: { uiAmountString: String(amount) },
    }));
  return {
    blockTime: 1_800_000_000,
    meta: {
      fee: 5000,
      preBalances: pre,
      postBalances: post,
      preTokenBalances: balances(tokens.pre),
      postTokenBalances: balances(tokens.post),
    },
    transaction: { signatures: ["sig"], message: { accountKeys: keys } },
  };
}

describe("movementOf", () => {
  it("is Sent when the address signed, and leaves the fee out of the amount", () => {
    const sent = tx(
      [{ pubkey: ME, signer: true }, { pubkey: OTHER }],
      [5_000_000_000, 0],
      [3_999_995_000, 1_000_000_000],
    );
    expect(movementOf(sent, ME)).toMatchObject({ id: "sig", direction: "sent", time: 1_800_000_000, sol: -1 });
  });

  it("is Received when somebody else signed", () => {
    const received = tx(
      [{ pubkey: OTHER, signer: true }, { pubkey: ME }],
      [9_000_000_000, 1_000_000_000],
      [8_499_995_000, 1_500_000_000],
    );
    expect(movementOf(received, ME)).toMatchObject({ direction: "received", sol: 0.5, tokens: [] });
  });

  it("finds a token that arrived at a wallet that is not in the transaction itself", () => {
    // Only the wallet's token account is part of the transaction, never the wallet.
    const received = tx([{ pubkey: OTHER, signer: true }], [1_000_000_000], [999_995_000], {
      pre: [[ME, 10]],
      post: [[ME, 35.5]],
    });
    expect(movementOf(received, ME)).toMatchObject({
      direction: "received",
      sol: 0,
      tokens: [{ mint: MINT, amount: 25.5 }],
    });
  });

  it("sees a token that went out as a negative change, and ignores other people's balances", () => {
    const sent = tx([{ pubkey: ME, signer: true }], [1_000_000_000], [999_995_000], {
      pre: [[ME, 100], [OTHER, 1]],
      post: [[ME, 40], [OTHER, 61]],
    });
    expect(movementOf(sent, ME)).toMatchObject({ direction: "sent", tokens: [{ mint: MINT, amount: -60 }] });
  });

  it("drops tokens that did not change", () => {
    const same = tx([{ pubkey: OTHER, signer: true }], [1], [1], { pre: [[ME, 5]], post: [[ME, 5]] });
    expect(movementOf(same, ME).tokens).toEqual([]);
  });

  it("sees SOL dust as a small positive change", () => {
    const dust = tx(
      [{ pubkey: OTHER, signer: true }, { pubkey: ME }],
      [1_000_000_000, 2_000_000_000],
      [999_985_000, 2_000_010_000],
    );
    expect(movementOf(dust, ME)).toMatchObject({ direction: "received", sol: 0.00001 });
  });
});
