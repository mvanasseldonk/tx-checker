import { describe, expect, it } from "vitest";
import { CHAIN_NAME, detectAddress, detectEns, detectPaste, detectTransaction, parseNetwork, shortId } from "./detect";

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

const ETH_ADDRESS = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
const ETH_ADDRESS_CHECKSUMMED = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";
const BTC_LEGACY = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
const BTC_P2SH = "34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo";
const BTC_BECH32 = "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq";
const BTC_BECH32_62 = "bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97";
const BTC_TAPROOT = "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0";
const SOL_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const SOL_SYSTEM_PROGRAM = "11111111111111111111111111111111";
// A Solana address that starts with 1 and is as long as a Bitcoin one: mostly zero bytes.
const SOL_LOOKS_LIKE_BTC = base58Encode(
  Uint8Array.from({ length: 32 }, (_, i) => (i < 27 ? 0 : (i * 29 + 5) % 255 + 1)),
);

describe("detectAddress", () => {
  it("recognises an Ethereum address and lowercases it", () => {
    expect(detectAddress(ETH_ADDRESS_CHECKSUMMED)).toEqual({ ok: true, chain: "eth", id: ETH_ADDRESS });
    expect(detectAddress(ETH_ADDRESS)).toEqual({ ok: true, chain: "eth", id: ETH_ADDRESS });
    expect(detectAddress(`0x${ETH_ADDRESS.slice(2).toUpperCase()}`)).toMatchObject({ ok: true, chain: "eth" });
  });

  it("rejects a mixed-case Ethereum address whose checksum is wrong", () => {
    const typo = ETH_ADDRESS_CHECKSUMMED.replace("dA6", "Da6");
    expect(detectAddress(typo)).toEqual({ ok: false });
  });

  it("recognises every kind of Bitcoin address", () => {
    for (const address of [BTC_LEGACY, BTC_P2SH, BTC_BECH32, BTC_BECH32_62, BTC_TAPROOT]) {
      expect(detectAddress(address), address).toEqual({ ok: true, chain: "btc", id: address });
    }
  });

  it("reads an all-uppercase bech32 address as its lowercase form", () => {
    expect(detectAddress("BC1QW508D6QEJXTDG4Y5R3ZARVARY0C5XW7KV8F3T4")).toEqual({
      ok: true,
      chain: "btc",
      id: "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4",
    });
    expect(detectAddress("bc1qW508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")).toEqual({ ok: false });
  });

  it("rejects Bitcoin addresses with a typo", () => {
    expect(detectAddress(BTC_LEGACY.replace("DivfNa", "DivfNb"))).toEqual({ ok: false });
    expect(detectAddress(BTC_P2SH.slice(0, -1) + "p")).toEqual({ ok: false });
    expect(detectAddress(BTC_BECH32.slice(0, -1) + "p")).toEqual({ ok: false });
    expect(detectAddress(BTC_TAPROOT.slice(0, -1) + "q")).toEqual({ ok: false });
    // A segwit v0 address with the taproot prefix (so the wrong checksum kind).
    expect(detectAddress(`bc1p${BTC_BECH32.slice(4)}`)).toEqual({ ok: false });
  });

  it("recognises a Solana address", () => {
    expect(detectAddress(SOL_ADDRESS)).toEqual({ ok: true, chain: "sol", id: SOL_ADDRESS });
  });

  it("tells a Bitcoin and a Solana address apart by their decoded length", () => {
    // Both are base58 of 32 to 44 characters.
    expect(BTC_LEGACY.length).toBeGreaterThanOrEqual(32);
    expect(BTC_P2SH).toHaveLength(34);
    expect(detectAddress(BTC_P2SH)).toMatchObject({ chain: "btc" });
    // The other way round: a Solana address that has the shape of a legacy Bitcoin one.
    expect(SOL_LOOKS_LIKE_BTC).toMatch(/^1[1-9A-HJ-NP-Za-km-z]{25,33}$/);
    expect(detectAddress(SOL_LOOKS_LIKE_BTC)).toMatchObject({ ok: true, chain: "sol" });
    // The system program is 32 ones, which also fits the legacy Bitcoin pattern.
    expect(detectAddress(SOL_SYSTEM_PROGRAM)).toMatchObject({ ok: true, chain: "sol" });
  });

  it("does not take a Solana signature, an Ethereum hash or a txid for an address", () => {
    for (const input of [SOL_SIG, ETH_HASH, BTC_TXID]) {
      expect(detectAddress(input), input).toEqual({ ok: false });
    }
  });

  it("rejects input that is not an address", () => {
    for (const input of [
      "",
      "hello",
      ETH_ADDRESS.slice(0, -1),
      `${ETH_ADDRESS}0`,
      `0x${"g".repeat(40)}`,
      SOL_ADDRESS.slice(0, -4),
      `${SOL_ADDRESS}1`,
      "0".repeat(32), // 0 is not base58
      BTC_BECH32.replace("bc1", "tb1"), // testnet
      "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy".slice(0, -1) + "z",
    ]) {
      expect(detectAddress(input), input).toEqual({ ok: false });
    }
  });

  it("extracts the address from an explorer link", () => {
    expect(detectAddress(`https://etherscan.io/address/${ETH_ADDRESS_CHECKSUMMED}`)).toEqual({
      ok: true,
      chain: "eth",
      id: ETH_ADDRESS,
    });
    expect(detectAddress(`etherscan.io/address/${ETH_ADDRESS}#tokentxns`)).toMatchObject({ chain: "eth" });
    expect(detectAddress(`https://solscan.io/account/${SOL_ADDRESS}`)).toEqual({
      ok: true,
      chain: "sol",
      id: SOL_ADDRESS,
    });
    expect(detectAddress(`https://solscan.io/account/${SOL_ADDRESS}?cluster=mainnet-beta`)).toMatchObject({
      chain: "sol",
    });
    for (const link of [
      `https://mempool.space/address/${BTC_BECH32}`,
      `https://mempool.space/nl/address/${BTC_BECH32}`,
      `https://www.blockstream.info/address/${BTC_BECH32}/`,
    ]) {
      expect(detectAddress(link), link).toEqual({ ok: true, chain: "btc", id: BTC_BECH32 });
    }
  });

  it("rejects testnet links, other sites, other pages and the wrong chain", () => {
    for (const link of [
      `https://sepolia.etherscan.io/address/${ETH_ADDRESS}`,
      `https://solscan.io/account/${SOL_ADDRESS}?cluster=devnet`,
      `https://mempool.space/testnet/address/${BTC_BECH32}`,
      `https://example.com/address/${ETH_ADDRESS}`,
      `https://solscan.io/address/${SOL_ADDRESS}`, // Solscan calls them accounts
      `https://etherscan.io/account/${ETH_ADDRESS}`,
      `https://etherscan.io/address/${SOL_ADDRESS}`,
      `https://mempool.space/address/${ETH_ADDRESS}`,
      `https://etherscan.io/token/${ETH_ADDRESS}`,
      `https://etherscan.io/tx/${ETH_ADDRESS}`,
      "https://etherscan.io/address/%E0%A4%A",
    ]) {
      expect(detectAddress(link), link).toEqual({ ok: false });
    }
  });

  it("is not fooled by a transaction link, and a transaction detection ignores address links", () => {
    expect(detectAddress(`https://etherscan.io/tx/${ETH_HASH}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://etherscan.io/address/${ETH_ADDRESS}`)).toEqual({ ok: false });
  });
});

describe("detectPaste", () => {
  it("says whether it is a transaction or an address", () => {
    expect(detectPaste(ETH_HASH)).toEqual({ ok: true, kind: "tx", chain: "eth", id: ETH_HASH });
    expect(detectPaste(BTC_TXID)).toMatchObject({ kind: "tx", chain: "btc" });
    expect(detectPaste(SOL_SIG)).toMatchObject({ kind: "tx", chain: "sol" });
    expect(detectPaste(`https://etherscan.io/tx/${ETH_HASH}`)).toMatchObject({ kind: "tx", chain: "eth" });
    expect(detectPaste(ETH_ADDRESS_CHECKSUMMED)).toEqual({ ok: true, kind: "address", chain: "eth", id: ETH_ADDRESS });
    expect(detectPaste(BTC_P2SH)).toMatchObject({ kind: "address", chain: "btc" });
    expect(detectPaste(SOL_ADDRESS)).toMatchObject({ kind: "address", chain: "sol" });
    expect(detectPaste(`https://solscan.io/account/${SOL_ADDRESS}`)).toMatchObject({ kind: "address", chain: "sol" });
  });

  it("ignores spaces and line breaks in an address too", () => {
    expect(detectPaste(` ${SOL_ADDRESS.slice(0, 20)}\n${SOL_ADDRESS.slice(20)} `)).toMatchObject({
      kind: "address",
      chain: "sol",
    });
  });

  it("rejects what is neither", () => {
    for (const input of ["", "hello", ETH_HASH.slice(0, -1), ETH_ADDRESS.slice(0, -2)]) {
      expect(detectPaste(input), input).toEqual({ ok: false });
    }
  });
});

describe("detectEns", () => {
  it("recognises a .eth name, a subname and an emoji name", () => {
    expect(detectEns("asseldonk.eth")).toEqual({ ok: true, chain: "eth", id: "asseldonk.eth" });
    expect(detectEns("jesse.base.eth")).toMatchObject({ ok: true, id: "jesse.base.eth" });
    expect(detectEns("🦄.eth")).toMatchObject({ ok: true, id: "🦄.eth" });
  });

  it("lowercases and ignores spaces around the name", () => {
    expect(detectEns("ASSELDONK.ETH")).toMatchObject({ ok: true, id: "asseldonk.eth" });
    expect(detectEns("  asseldonk.eth \n")).toMatchObject({ ok: true, id: "asseldonk.eth" });
  });

  it("never closes a space inside the name", () => {
    for (const input of ["foo bar.eth", "foo\nbar.eth", "foo\tbar.eth", "foo .eth bar.eth"]) {
      expect(detectEns(input), input).toEqual({ ok: false });
      expect(detectPaste(input), input).toEqual({ ok: false });
    }
  });

  it("rejects what is not a .eth name", () => {
    for (const input of ["", ".eth", " .eth ", "eth", "foo.com", "foo.eth.com", "foo.sol", "foo.cb.id", "foo.eth/bar", "https://foo.eth"]) {
      expect(detectEns(input), input).toEqual({ ok: false });
    }
  });

  it("is a name in detectPaste, after a transaction and an address", () => {
    expect(detectPaste(" Asseldonk.eth ")).toEqual({ ok: true, kind: "ens", chain: "eth", id: "asseldonk.eth" });
    expect(detectPaste(ETH_HASH)).toMatchObject({ kind: "tx" });
    expect(detectPaste(ETH_ADDRESS)).toMatchObject({ kind: "address" });
    expect(detectAddress("asseldonk.eth")).toEqual({ ok: false });
    expect(detectTransaction("asseldonk.eth")).toEqual({ ok: false });
  });
});

describe("shortId", () => {
  it("shortens hashes for display", () => {
    expect(shortId("eth", ETH_HASH)).toBe("0x8f2e…c41b");
    expect(shortId("base", ETH_HASH)).toBe("0x8f2e…c41b");
    expect(shortId("sol", "5VERv8NMvzbJ")).toBe("5VER…vzbJ");
    expect(shortId("btc", BTC_TXID)).toBe("9fab…3034");
  });
});

describe("CHAIN_NAME", () => {
  it("names each chain in full, for screen readers", () => {
    expect(CHAIN_NAME).toEqual({
      eth: "Ethereum",
      base: "Base",
      arb: "Arbitrum",
      op: "Optimism",
      sol: "Solana",
      btc: "Bitcoin",
    });
  });
});

describe("L2 explorers", () => {
  it("reads a Basescan, Arbiscan or Optimistic Etherscan link as a transaction on that network", () => {
    for (const [host, chain] of [
      ["basescan.org", "base"],
      ["arbiscan.io", "arb"],
      ["optimistic.etherscan.io", "op"],
    ] as const) {
      expect(detectTransaction(`https://${host}/tx/${ETH_HASH}`)).toEqual({ ok: true, chain, id: ETH_HASH, explorer: true });
      expect(detectPaste(`${host}/tx/${ETH_HASH}?utm=x#eventlog`)).toMatchObject({ kind: "tx", chain, explorer: true });
    }
  });

  it("names the network of an Etherscan link too, but not of a bare hash", () => {
    expect(detectTransaction(`https://etherscan.io/tx/${ETH_HASH}`)).toMatchObject({ chain: "eth", explorer: true });
    expect(detectTransaction(ETH_HASH)).toEqual({ ok: true, chain: "eth", id: ETH_HASH });
  });

  it("keeps testnet explorers invalid", () => {
    for (const host of ["sepolia.basescan.org", "sepolia.arbiscan.io", "sepolia-optimism.etherscan.io", "goerli.basescan.org"]) {
      expect(detectTransaction(`https://${host}/tx/${ETH_HASH}`)).toEqual({ ok: false });
    }
  });

  it("does not take an L2 address link for an Ethereum address", () => {
    for (const host of ["basescan.org", "arbiscan.io", "optimistic.etherscan.io"]) {
      expect(detectAddress(`https://${host}/address/${ETH_ADDRESS}`)).toEqual({ ok: false });
      expect(detectPaste(`https://${host}/address/${ETH_ADDRESS}`)).toEqual({ ok: false });
      expect(detectTransaction(`https://${host}/address/${ETH_ADDRESS}`)).toEqual({ ok: false });
    }
  });

  it("rejects a Bitcoin or Solana id on an L2 explorer", () => {
    expect(detectTransaction(`https://basescan.org/tx/${BTC_TXID}`)).toEqual({ ok: false });
    expect(detectTransaction(`https://arbiscan.io/tx/${SOL_SIG}`)).toEqual({ ok: false });
  });
});

describe("parseNetwork", () => {
  it("reads the chain query, and ignores anything else", () => {
    expect(parseNetwork("base")).toBe("base");
    expect(parseNetwork("eth")).toBe("eth");
    expect(parseNetwork("x")).toBeNull();
    expect(parseNetwork("sol")).toBeNull();
    expect(parseNetwork(["base", "op"])).toBeNull();
    expect(parseNetwork(undefined)).toBeNull();
  });
});
