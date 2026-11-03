import { isAddress, sha256 } from "viem";

export type Chain = "eth" | "sol" | "btc";

export type Detection =
  | { ok: true; chain: Chain; id: string }
  | { ok: false };

/** What was pasted: a transaction (hash, signature, txid) or an address, on a chain. */
export type Pasted =
  | { ok: true; kind: "tx" | "address"; chain: Chain; id: string }
  | { ok: false };

const INVALID: Detection = { ok: false };

const ETH_HASH = /^0x[0-9a-fA-F]{64}$/;
// Without 0x, so a bare Ethereum hash is read as Bitcoin.
const BTC_TXID = /^[0-9a-fA-F]{64}$/;
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const SOLANA_SIGNATURE_BYTES = 64;

const ETH_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
// Segwit v0 (bc1q, 20 or 32 bytes) and taproot (bc1p, 32 bytes), without the checksum rules.
const BECH32_ADDRESS = /^bc1(?:q(?:[02-9ac-hj-np-z]{38}|[02-9ac-hj-np-z]{58})|p[02-9ac-hj-np-z]{58})$/;
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
const BECH32_GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
// Bech32 (segwit v0) and bech32m (taproot) end in a checksum that differs by this constant.
const BECH32_CONSTANT = 1;
const BECH32M_CONSTANT = 0x2bc830a3;
// The "bc" of "bc1…" in the form the checksum is computed over.
const BECH32_HRP_EXPANDED = [3, 3, 0, 2, 3];
// Legacy (1…) and P2SH (3…) addresses: a version byte, a 20-byte hash and a 4-byte checksum.
const BTC_BASE58_BYTES = 25;
const BTC_BASE58_VERSIONS = [0x00, 0x05];
const SOLANA_ADDRESS_BYTES = 32;

// Mainnet explorers only: subdomains such as sepolia.etherscan.io are testnets.
// `addressPath` is where each one keeps its address pages.
const EXPLORERS: Record<string, { chain: Chain; addressPath: string }> = {
  "etherscan.io": { chain: "eth", addressPath: "address" },
  "solscan.io": { chain: "sol", addressPath: "account" },
  "mempool.space": { chain: "btc", addressPath: "address" },
  "blockstream.info": { chain: "btc", addressPath: "address" },
};
const SOLSCAN_MAINNET_CLUSTERS = new Set(["mainnet", "mainnet-beta"]);

/**
 * Recognises a pasted Ethereum hash, Bitcoin txid, Solana signature or explorer link to one.
 * Runs entirely locally, so invalid input never costs an API call.
 */
export function detectTransaction(input: string): Detection {
  const text = input.replace(/\s+/g, "");
  if (!looksLikeExplorerUrl(text)) return detectId(text);
  const link = parseExplorerLink(text);
  return link?.kind === "tx" ? detectOnChain(detectId(link.value), link.chain) : INVALID;
}

/**
 * Recognises a pasted Ethereum, Bitcoin or Solana address, or an explorer link to one. Addresses
 * are checked as far as can be done locally (checksums, decoded length), so a typo is caught here.
 */
export function detectAddress(input: string): Detection {
  const text = input.replace(/\s+/g, "");
  if (!looksLikeExplorerUrl(text)) return detectAddressId(text);
  const link = parseExplorerLink(text);
  return link?.kind === "address" ? detectOnChain(detectAddressId(link.value), link.chain) : INVALID;
}

/** A transaction or an address, whichever the input is. */
export function detectPaste(input: string): Pasted {
  const tx = detectTransaction(input);
  if (tx.ok) return { ...tx, kind: "tx" };
  const address = detectAddress(input);
  return address.ok ? { ...address, kind: "address" } : { ok: false };
}

function detectId(id: string): Detection {
  if (ETH_HASH.test(id)) return { ok: true, chain: "eth", id: id.toLowerCase() };
  if (BTC_TXID.test(id)) return { ok: true, chain: "btc", id: id.toLowerCase() };
  if (isSolanaSignature(id)) return { ok: true, chain: "sol", id };
  return INVALID;
}

function detectAddressId(id: string): Detection {
  if (ETH_ADDRESS.test(id)) {
    return hasValidEthCase(id) ? { ok: true, chain: "eth", id: id.toLowerCase() } : INVALID;
  }
  // Bech32 is all lowercase or all uppercase; the two are the same address.
  const lower = id.toLowerCase();
  if ((id === lower || id === id.toUpperCase()) && BECH32_ADDRESS.test(lower)) {
    return hasValidBech32Checksum(lower) ? { ok: true, chain: "btc", id: lower } : INVALID;
  }
  if (!BASE58.test(id)) return INVALID;
  // Legacy BTC and Solana addresses look alike: only the decoded length tells them apart.
  const bytes = base58Decode(id);
  if (bytes.length === SOLANA_ADDRESS_BYTES) return { ok: true, chain: "sol", id };
  if (bytes.length === BTC_BASE58_BYTES && hasValidBase58Checksum(bytes)) {
    return { ok: true, chain: "btc", id };
  }
  return INVALID;
}

function detectOnChain(detection: Detection, chain: Chain): Detection {
  return detection.ok && detection.chain === chain ? detection : INVALID;
}

function looksLikeExplorerUrl(text: string): boolean {
  return /^(https?:\/\/)?(www\.)?[a-z0-9.-]+\.[a-z]{2,}\//i.test(text);
}

type ExplorerLink = { chain: Chain; kind: "tx" | "address"; value: string };

function parseExplorerLink(text: string): ExplorerLink | null {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }

  const explorer = EXPLORERS[url.hostname.toLowerCase().replace(/^www\./, "")];
  // mempool.space may put a language first (/nl/tx/…); /testnet/tx/ and /signet/tx/ never match.
  const match = url.pathname.match(/^\/(?:[a-z]{2}\/)?([a-z]+)\/([^/]+)\/?$/);
  if (!explorer || !match) return null;

  const cluster = url.searchParams.get("cluster");
  if (explorer.chain === "sol" && cluster && !SOLSCAN_MAINNET_CLUSTERS.has(cluster)) return null;

  const [, segment, value] = match;
  const kind = segment === "tx" ? "tx" : segment === explorer.addressPath ? "address" : null;
  if (!kind) return null;
  try {
    return { chain: explorer.chain, kind, value: decodeURIComponent(value) };
  } catch {
    return null;
  }
}

function isSolanaSignature(id: string): boolean {
  if (id.length < 86 || id.length > 88 || !BASE58.test(id)) return false;
  return base58ByteLength(id) === SOLANA_SIGNATURE_BYTES;
}

function base58ByteLength(text: string): number {
  return base58Decode(text).length;
}

function base58Decode(text: string): Uint8Array {
  const base = BigInt(58);
  const byte = BigInt(8);
  const mask = BigInt(0xff);
  const zero = BigInt(0);

  let value = zero;
  for (const char of text) {
    value = value * base + BigInt(BASE58_ALPHABET.indexOf(char));
  }

  const bytes: number[] = [];
  while (value > zero) {
    bytes.unshift(Number(value & mask));
    value >>= byte;
  }

  // Each leading "1" encodes a leading zero byte.
  const leadingZeros = text.match(/^1*/)![0].length;
  return Uint8Array.from([...new Array<number>(leadingZeros).fill(0), ...bytes]);
}

/** A mixed-case Ethereum address carries a checksum in its capitals (EIP-55); one case has none. */
function hasValidEthCase(address: string): boolean {
  const hex = address.slice(2);
  return hex === hex.toLowerCase() || hex === hex.toUpperCase() || isAddress(address);
}

/** Version byte 0 or 5, and a checksum that is the start of the double SHA-256 of the rest. */
function hasValidBase58Checksum(bytes: Uint8Array): boolean {
  if (!BTC_BASE58_VERSIONS.includes(bytes[0])) return false;
  const payload = bytes.slice(0, -4);
  const hash = sha256(sha256(payload, "bytes"), "bytes");
  return bytes.slice(-4).every((byte, i) => byte === hash[i]);
}

/** Bech32 for segwit v0 (bc1q), bech32m for taproot (bc1p), as BIP 173 and 350 describe. */
function hasValidBech32Checksum(address: string): boolean {
  const data = [...address.slice(3)].map((char) => BECH32_CHARSET.indexOf(char));
  let checksum = 1;
  for (const value of [...BECH32_HRP_EXPANDED, ...data]) {
    const top = checksum >>> 25;
    checksum = ((checksum & 0x1ffffff) << 5) ^ value;
    BECH32_GENERATOR.forEach((generator, i) => {
      if ((top >>> i) & 1) checksum ^= generator;
    });
  }
  return checksum === (address[3] === "q" ? BECH32_CONSTANT : BECH32M_CONSTANT);
}

/** Shortens a hash or signature for display, e.g. 0x8f2e…c41b. */
export function shortId(chain: Chain, id: string): string {
  const head = chain === "eth" ? 6 : 4;
  return `${id.slice(0, head)}…${id.slice(-4)}`;
}

export const CHAIN_LABEL: Record<Chain, string> = { eth: "ETH", sol: "SOL", btc: "BTC" };
