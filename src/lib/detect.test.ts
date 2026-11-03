import { describe, expect, it } from "vitest";
import { detectTransaction, shortId } from "./detect";

const ETH_HASH =
  "0x8f2e7a1c94b0d6e3f1a25c7b8d90e4f3a6b1c2d3e4f5a6b7c8d9e5e3a7d9c41b";

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58Encode(bytes: Uint8Array): string {
  let value = BigInt(0);
  for (const b of bytes) value = (value << BigInt(8)) + BigInt(b);
  let out = "";
  while (value > BigInt(0)) {
    out = ALPHABET[Number(value % BigInt(58))] + out;
    value /= BigInt(58);
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

function signature(fill: (i: number) => number): string {
  return base58Encode(Uint8Array.from({ length: 64 }, (_, i) => fill(i)));
}

const BTC_TXID = "9fabe65d41545cffe3cb321bbbe90bb2fcf835e7db909af0f51166c018153034";

const SOL_SIG = signature((i) => (i * 37 + 11) % 256);

describe("detectTransaction", () => {
  it("recognises an Ethereum hash and normalises it to lowercase", () => {
    expect(detectTransaction(ETH_HASH.toUpperCase().replace("0X", "0x"))).toEqual({
      ok: true,
      chain: "eth",
      id: ETH_HASH,
    });
  });

  it("recognises a Bitcoin txid and normalises it to lowercase", () => {
    expect(detectTransaction(BTC_TXID.toUpperCase())).toEqual({ ok: true, chain: "btc", id: BTC_TXID });
  });

  it("still reads a hash with 0x as Ethereum, and one without as Bitcoin", () => {
    expect(detectTransaction(`0x${BTC_TXID}`)).toMatchObject({ ok: true, chain: "eth" });
    expect(detectTransaction(ETH_HASH.slice(2))).toMatchObject({ ok: true, chain: "btc" });
  });

  it("recognises a Solana signature", () => {
    expect(SOL_SIG.length).toBeGreaterThanOrEqual(86);
    expect(detectTransaction(SOL_SIG)).toEqual({ ok: true, chain: "sol", id: SOL_SIG });
  });

  it("ignores spaces and line breaks", () => {
    const messy = `  ${ETH_HASH.slice(0, 20)}\n${ETH_HASH.slice(20, 40)} \r\n${ETH_HASH.slice(40)}\t`;
    expect(detectTransaction(messy)).toMatchObject({ ok: true, chain: "eth" });
  });

  it("extracts the hash from an Etherscan link", () => {
    expect(detectTransaction(`https://etherscan.io/tx/${ETH_HASH}`)).toMatchObject({
      ok: true,
      chain: "eth",
      id: ETH_HASH,
    });
    expect(detectTransaction(`etherscan.io/tx/${ETH_HASH}?utm=x#eventlog`)).toMatchObject({
      ok: true,
      chain: "eth",
    });
    expect(detectTransaction(`https://www.etherscan.io/tx/${ETH_HASH}/`)).toMatchObject({
      ok: true,
      chain: "eth",
    });
  });

  it("extracts the signature from a Solscan link", () => {
    expect(detectTransaction(`https://solscan.io/tx/${SOL_SIG}`)).toMatchObject({
      ok: true,
      chain: "sol",
      id: SOL_SIG,
    });
    expect(
      detectTransaction(`https://solscan.io/tx/${SOL_SIG}?cluster=mainnet-beta`),
    ).toMatchObject({ ok: true, chain: "sol" });
  });

  it("extracts the txid from a mempool.space or Blockstream link", () => {
    for (const link of [
      `https://mempool.space/tx/${BTC_TXID}`,
      `mempool.space/tx/${BTC_TXID}`,
      `https://mempool.space/nl/tx/${BTC_TXID}`,
      `https://mempool.space/tx/${BTC_TXID}?mode=details#flow`,
      `https://blockstream.info/tx/${BTC_TXID}`,
      `https://www.blockstream.info/tx/${BTC_TXID}/`,
    ]) {
      expect(detectTransaction(link), link).toEqual({ ok: true, chain: "btc", id: BTC_TXID });
    }
  });

  it("rejects testnet explorer links", () => {
    expect(detectTransaction(`https://sepolia.etherscan.io/tx/${ETH_HASH}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://solscan.io/tx/${SOL_SIG}?cluster=devnet`)).toEqual({ ok: false });
    for (const network of ["testnet", "testnet4", "signet"]) {
      expect(detectTransaction(`https://mempool.space/${network}/tx/${BTC_TXID}`)).toEqual({ ok: false });
    }
    expect(detectTransaction(`https://blockstream.info/testnet/tx/${BTC_TXID}`)).toEqual({ ok: false });
  });

  it("rejects links to other sites or other explorer pages", () => {
    expect(detectTransaction(`https://example.com/tx/${ETH_HASH}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://etherscan.io/address/${ETH_HASH}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://etherscan.io/tx/${SOL_SIG}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://solscan.io/tx/${ETH_HASH}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://mempool.space/address/${BTC_TXID}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://mempool.space/tx/${ETH_HASH}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://etherscan.io/tx/${BTC_TXID}`)).toEqual({ ok: false });
  });

  it("rejects input that is not a transaction", () => {
    for (const input of [
      "",
      "hello",
      ETH_HASH.slice(0, -1),
      `${ETH_HASH}0`,
      BTC_TXID.slice(0, -1),
      `${BTC_TXID}0`,
      "g".repeat(64),
      `0x${"g".repeat(64)}`,
      "0x3f5Ca91E3f5Ca91E3f5Ca91E3f5Ca91E3f5Ca91E", // an address, not a hash
      "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", // a Solana address
      SOL_SIG.slice(0, 80),
      `${SOL_SIG}0`.replace(/.$/, "0"), // 0 is not base58
    ]) {
      expect(detectTransaction(input), input).toEqual({ ok: false });
    }
  });

  it("rejects base58 of the right length that does not decode to 64 bytes", () => {
    expect(detectTransaction("z".repeat(88))).toEqual({ ok: false });
  });

  it("accepts signatures with leading zero bytes", () => {
    const sig = signature((i) => (i < 1 ? 0 : (i * 53 + 7) % 256));
    if (sig.length >= 86) {
      expect(detectTransaction(sig)).toMatchObject({ ok: true, chain: "sol" });
    }
  });
});

describe("shortId", () => {
  it("shortens hashes for display", () => {
    expect(shortId("eth", ETH_HASH)).toBe("0x8f2e…c41b");
    expect(shortId("sol", "5VERv8NMvzbJ")).toBe("5VER…vzbJ");
    expect(shortId("btc", BTC_TXID)).toBe("9fab…3034");
  });
});
