import { isAddress, sha256 } from "viem";

/** The Ethereum networks: a 0x hash does not say which one it is on. */
export const EVM_CHAINS = ["eth", "base", "arb", "op"] as const;
export type EvmChain = (typeof EVM_CHAINS)[number];

export type Chain = EvmChain | "sol" | "btc";

/** The chains with address pages: the L2s have transactions only, until addresses come to them. */
export type AddressChain = "eth" | "sol" | "btc";

export function isEvm(chain: Chain): chain is EvmChain {
  return (EVM_CHAINS as readonly string[]).includes(chain);
}

/**
 * `explorer` is set when an EVM explorer link named the network: a bare 0x hash is read as `eth`, but
 * could be on any network.
 */
export type Detection =
  | { ok: true; chain: Chain; id: string; explorer?: true }
  | { ok: false };

export type AddressDetection =
  | { ok: true; chain: AddressChain; id: string }
  | { ok: false };

/** What was pasted: a transaction (hash, signature, txid), an address or an ENS name, on a chain. */
export type Pasted =
  | { ok: true; kind: "tx"; chain: Chain; id: string; explorer?: true }
  | { ok: true; kind: "address" | "ens"; chain: AddressChain; id: string }
  | { ok: false };

const INVALID = { ok: false } as const;

const ENS_SUFFIX = ".eth";

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

/** Mainnet explorers only: subdomains such as sepolia.etherscan.io are testnets. */
const EXPLORERS: Record<string, { chain: Chain; addressPath?: string }> = {
  "etherscan.io": { chain: "eth", addressPath: "address" },
  "basescan.org": { chain: "base" },
  "arbiscan.io": { chain: "arb" },
  "optimistic.etherscan.io": { chain: "op" },
  "solscan.io": { chain: "sol", addressPath: "account" },
  "explorer.solana.com": { chain: "sol" },
  "mempool.space": { chain: "btc", addressPath: "address" },
  "blockstream.info": { chain: "btc", addressPath: "address" },
};

/** Subdomain → chain for Blockscout instances. Testnet subdomains (e.g. eth-sepolia) are not listed. */
const BLOCKSCOUT_CHAINS: Record<string, { chain: Chain }> = {
  "eth.blockscout.com": { chain: "eth" },
  "base.blockscout.com": { chain: "base" },
  "arbitrum.blockscout.com": { chain: "arb" },
  "optimism.blockscout.com": { chain: "op" },
};

/** Coin name → chain for Blockchair URLs: `/bitcoin/transaction/<id>` → btc, `/ethereum/transaction/<id>` → eth. */
const BLOCKCHAIR_CHAINS: Record<string, Chain> = {
  bitcoin: "btc",
  ethereum: "eth",
};
const SOLANA_MAINNET_CLUSTERS = new Set(["mainnet", "mainnet-beta"]);

/**
 * Recognises a pasted Ethereum hash, Bitcoin txid, Solana signature or explorer link to one (Etherscan, Basescan,
 * Arbiscan and Optimistic Etherscan name their network; a bare hash does not).
 * Runs entirely locally, so invalid input never costs an API call.
 */
export function detectTransaction(input: string): Detection {
  const text = input.replace(/\s+/g, "");
  if (!looksLikeExplorerUrl(text)) return detectId(text);
  const link = parseExplorerLink(text);
  if (link?.kind !== "tx") return INVALID;
  const detection = detectOnChain(detectId(link.value), link.chain);
  return detection.ok && isEvm(link.chain) ? { ...detection, chain: link.chain, explorer: true } : detection;
}

/**
 * Recognises a pasted Ethereum, Bitcoin or Solana address, or an explorer link to one. Addresses
 * are checked as far as can be done locally (checksums, decoded length), so a typo is caught here.
 */
export function detectAddress(input: string): AddressDetection {
  const text = input.replace(/\s+/g, "");
  if (!looksLikeExplorerUrl(text)) return detectAddressId(text);
  const link = parseExplorerLink(text);
  return link?.kind === "address" ? detectAddressOnChain(detectAddressId(link.value), link.chain) : INVALID;
}

/**
 * A light check for an ENS name, lowercased: `.eth` after at least one label. The real rules (`normalize` of
 * viem) are about 45 kB and run on the server only, which rejects what passes here but is not a name.
 * Only the outer whitespace goes: `foo bar.eth` must never become `foobar.eth`, as the other detections would.
 */
export function detectEns(input: string): AddressDetection {
  const name = input.trim().toLowerCase();
  if (name.length <= ENS_SUFFIX.length || !name.endsWith(ENS_SUFFIX) || /[\s/]/.test(name)) return INVALID;
  return { ok: true, chain: "eth", id: name };
}

/** A transaction, an address or an ENS name, whichever the input is. */
export function detectPaste(input: string): Pasted {
  const tx = detectTransaction(input);
  if (tx.ok) return { ...tx, kind: "tx" };
  const address = detectAddress(input);
  if (address.ok) return { ...address, kind: "address" };
  const ens = detectEns(input);
  return ens.ok ? { ...ens, kind: "ens" } : { ok: false };
}

function detectId(id: string): Detection {
  if (ETH_HASH.test(id)) return { ok: true, chain: "eth", id: id.toLowerCase() };
  if (BTC_TXID.test(id)) return { ok: true, chain: "btc", id: id.toLowerCase() };
  if (isSolanaSignature(id)) return { ok: true, chain: "sol", id };
  return INVALID;
}

function detectAddressId(id: string): AddressDetection {
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
  // A hash is read as Ethereum's: on an L2 explorer it is that network's.
  const same = isEvm(chain) ? detection.ok && detection.chain === "eth" : detection.ok && detection.chain === chain;
  return same ? detection : INVALID;
}

function detectAddressOnChain(detection: AddressDetection, chain: Chain): AddressDetection {
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

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  // Blockchair: coin name is the first path segment (/bitcoin/transaction/<id>).
  if (host === "blockchair.com") {
    const match = url.pathname.match(/^\/([a-z]+)\/(?:transaction)\/([^/]+)\/?$/i);
    if (!match) return null;
    const [, coin, value] = match;
    const chain = BLOCKCHAIR_CHAINS[coin.toLowerCase()];
    if (!chain) return null;
    try {
      return { chain, kind: "tx", value: decodeURIComponent(value) };
    } catch {
      return null;
    }
  }

  const explorer = EXPLORERS[host];

  // Blockscout: subdomain determines chain. Testnet subdomains (e.g. sepolia.eth) aren't in the table.
  const blockscout = BLOCKSCOUT_CHAINS[host];

  // mempool.space may put a language first (/nl/tx/…); /testnet/tx/ and /signet/tx/ never match
  // (those words are longer than two letters).
  const match = url.pathname.match(/^\/(?:[a-z]{2}\/)?([a-z]+)\/([^/]+)\/?$/);
  if (!explorer && !blockscout || !match) return null;

  const cluster = url.searchParams.get("cluster");
  if (explorer && explorer.chain === "sol" && cluster && !SOLANA_MAINNET_CLUSTERS.has(cluster)) return null;

  const [, segment, value] = match;
  const chain = explorer ? explorer.chain : blockscout.chain;
  const addressPath = explorer?.addressPath;
  const kind = segment === "tx" ? "tx" : segment === addressPath ? "address" : null;
  if (!kind) return null;
  try {
    return { chain, kind, value: decodeURIComponent(value) };
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
  const head = isEvm(chain) ? 6 : 4;
  return `${id.slice(0, head)}…${id.slice(-4)}`;
}

/** The chain's name, as a screen reader should hear it (the screen shows its logo). */
export const CHAIN_NAME: Record<Chain, string> = {
  eth: "Ethereum",
  base: "Base",
  arb: "Arbitrum",
  op: "Optimism",
  sol: "Solana",
  btc: "Bitcoin",
};

/** A `chain` query value as the EVM network it names, or null for anything else (it is then ignored). */
export function parseNetwork(value: string | string[] | undefined): EvmChain | null {
  return EVM_CHAINS.find((chain) => chain === value) ?? null;
}
