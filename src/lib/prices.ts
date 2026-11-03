import { cacheLife } from "next/cache";

/** A chain's own coin, or a token on it by contract address (ETH) or mint (SOL). */
export type Coin = "ethereum" | "solana" | "bitcoin" | { platform: "ethereum" | "solana"; address: string };

const API = "https://api.coingecko.com/api/v3";
const TIMEOUT_MS = 2500;

/**
 * The euro price of a coin at a unix time, or now when `at` is null.
 * Returns null when CoinGecko has no price for it or cannot be reached.
 */
export async function eurPrice(coin: Coin, at: number | null): Promise<number | null> {
  try {
    if (at !== null) {
      const past = await pastPrice(coin, at);
      if (past !== null) return past;
    }
    return await currentPrice(coin);
  } catch {
    return null;
  }
}

// Failed requests throw so that they are never cached.
async function get(path: string): Promise<unknown> {
  const key = process.env.COINGECKO_API_KEY;
  const response = await fetch(`${API}${path}`, {
    headers: key ? { "x-cg-demo-api-key": key } : {},
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`CoinGecko ${response.status}`);
  return response.json();
}

async function currentPrice(coin: Coin): Promise<number | null> {
  "use cache";
  cacheLife("minutes");
  if (typeof coin === "string") {
    const body = (await get(`/simple/price?ids=${coin}&vs_currencies=eur`)) as Record<
      string,
      { eur?: number }
    > | null;
    return body?.[coin]?.eur ?? null;
  }
  const body = (await get(
    `/simple/token_price/${coin.platform}?contract_addresses=${coin.address}&vs_currencies=eur`,
  )) as Record<string, { eur?: number }> | null;
  // CoinGecko lowercases Ethereum addresses but keeps the case of Solana mints.
  const key = Object.keys(body ?? {}).find((k) => k.toLowerCase() === coin.address.toLowerCase());
  return key ? (body?.[key]?.eur ?? null) : null;
}

/** The price closest to `at`, from CoinGecko's hourly history around it. */
async function pastPrice(coin: Coin, at: number): Promise<number | null> {
  "use cache";
  cacheLife("max");
  const base =
    typeof coin === "string" ? `/coins/${coin}` : `/coins/${coin.platform}/contract/${coin.address}`;
  const body = (await get(
    `${base}/market_chart/range?vs_currency=eur&from=${at - 3600}&to=${at + 3600}`,
  )) as { prices?: [number, number][] } | null;
  const prices = body?.prices ?? [];
  if (prices.length === 0) return null;
  const closest = prices.reduce((best, point) =>
    Math.abs(point[0] / 1000 - at) < Math.abs(best[0] / 1000 - at) ? point : best,
  );
  return closest[1];
}
