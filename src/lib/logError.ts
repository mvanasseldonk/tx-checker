import { BaseError } from "viem";

// The keys of the providers: each one ends up in the URL of a request, so an error that holds the URL holds the key.
const SECRETS = ["ALCHEMY_API_KEY", "HELIUS_API_KEY", "COINGECKO_API_KEY", "ETHERSCAN_API_KEY"] as const;

/** Takes out what must never be logged: any URL (the key is in its path or query), and the keys themselves. */
function scrub(text: string): string {
  let clean = text.replace(/\b[a-z][a-z0-9+.-]*:\/\/\S+/gi, "[url]");
  for (const name of SECRETS) {
    const secret = process.env[name];
    if (secret) clean = clean.split(secret).join("[key]");
  }
  return clean;
}

/**
 * What to log of a failed lookup, in place of the error itself. viem's errors hold the RPC URL (and with
 * it the Alchemy key) in their message, details and `metaMessages`, so only the short message goes out.
 * Any other error goes out as its name and message, without URLs.
 */
export function describeError(error: unknown): string {
  if (error instanceof BaseError) return scrub(`${error.name}: ${error.shortMessage}`);
  if (error instanceof Error) return scrub(`${error.name}: ${error.message}`);
  return "unknown error";
}

/** Logs that a lookup failed, with what is safe to know of why. Never pass the error to `console.error` itself. */
export function logFailure(what: string, error: unknown): void {
  console.error(`${what} failed: ${describeError(error)}`);
}
