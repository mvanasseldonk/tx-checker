export type Chain = "eth" | "sol" | "btc";

export type Detection =
  | { ok: true; chain: Chain; id: string }
  | { ok: false };

const INVALID: Detection = { ok: false };

const ETH_HASH = /^0x[0-9a-fA-F]{64}$/;
// Without 0x, so a bare Ethereum hash is read as Bitcoin.
const BTC_TXID = /^[0-9a-fA-F]{64}$/;
const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const BASE58 = /^[1-9A-HJ-NP-Za-km-z]+$/;
const SOLANA_SIGNATURE_BYTES = 64;

// Mainnet explorers only: subdomains such as sepolia.etherscan.io are testnets.
const EXPLORERS: Record<string, Chain> = {
  "etherscan.io": "eth",
  "solscan.io": "sol",
  "mempool.space": "btc",
  "blockstream.info": "btc",
};
const SOLSCAN_MAINNET_CLUSTERS = new Set(["mainnet", "mainnet-beta"]);

/**
 * Recognises a pasted Ethereum hash, Bitcoin txid, Solana signature or explorer link.
 * Runs entirely locally, so invalid input never costs an API call.
 */
export function detectTransaction(input: string): Detection {
  const text = input.replace(/\s+/g, "");
  if (looksLikeExplorerUrl(text)) return detectFromExplorerUrl(text);
  return detectId(text);
}

function detectId(id: string): Detection {
  if (ETH_HASH.test(id)) return { ok: true, chain: "eth", id: id.toLowerCase() };
  if (BTC_TXID.test(id)) return { ok: true, chain: "btc", id: id.toLowerCase() };
  if (isSolanaSignature(id)) return { ok: true, chain: "sol", id };
  return INVALID;
}

function looksLikeExplorerUrl(text: string): boolean {
  return /^(https?:\/\/)?(www\.)?[a-z0-9.-]+\.[a-z]{2,}\//i.test(text);
}

function detectFromExplorerUrl(text: string): Detection {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return INVALID;
  }

  const chain = EXPLORERS[url.hostname.toLowerCase().replace(/^www\./, "")];
  // mempool.space may put a language first (/nl/tx/…); /testnet/tx/ and /signet/tx/ never match.
  const match = url.pathname.match(/^\/(?:[a-z]{2}\/)?tx\/([^/]+)\/?$/);
  if (!chain || !match) return INVALID;

  const cluster = url.searchParams.get("cluster");
  if (chain === "sol" && cluster && !SOLSCAN_MAINNET_CLUSTERS.has(cluster)) {
    return INVALID;
  }

  const detection = detectId(decodeURIComponent(match[1]));
  return detection.ok && detection.chain === chain ? detection : INVALID;
}

function isSolanaSignature(id: string): boolean {
  if (id.length < 86 || id.length > 88 || !BASE58.test(id)) return false;
  return base58ByteLength(id) === SOLANA_SIGNATURE_BYTES;
}

function base58ByteLength(text: string): number {
  const base = BigInt(58);
  const byte = BigInt(8);
  const zero = BigInt(0);

  let value = zero;
  for (const char of text) {
    value = value * base + BigInt(BASE58_ALPHABET.indexOf(char));
  }

  let bytes = 0;
  while (value > zero) {
    value >>= byte;
    bytes++;
  }

  // Each leading "1" encodes a leading zero byte.
  const leadingZeros = text.match(/^1*/)![0].length;
  return bytes + leadingZeros;
}

/** Shortens a hash or signature for display, e.g. 0x8f2e…c41b. */
export function shortId(chain: Chain, id: string): string {
  const head = chain === "eth" ? 6 : 4;
  return `${id.slice(0, head)}…${id.slice(-4)}`;
}

export const CHAIN_LABEL: Record<Chain, string> = { eth: "ETH", sol: "SOL", btc: "BTC" };
