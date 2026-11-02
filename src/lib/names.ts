import { cacheLife } from "next/cache";

// Contracts people send transactions to most, by lowercase address.
const KNOWN: Record<string, string> = {
  "0x66a9893cc07d91d95644aedd05d03f95e1dba8af": "Uniswap",
  "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": "Uniswap",
  "0xef1c6e67703c7bd7107eed8303fbe6ec2554bf6b": "Uniswap",
  "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap",
  "0xe592427a0aece92de3edee1f18e0157c05861564": "Uniswap",
  "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45": "Uniswap",
  "0x111111125421ca6dc452d289314280a0f8842a65": "1inch",
  "0x1111111254eeb25477b68fb85ed929f73a960582": "1inch",
  "0x881d40237659c251811cec9c364ef91dc08d300c": "MetaMask Swap",
  "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x",
};

/** A contract's name: a well-known one, or the verified name on Etherscan. */
export async function contractName(address: string): Promise<string | null> {
  const known = KNOWN[address.toLowerCase()];
  if (known) return known;
  if (!process.env.ETHERSCAN_API_KEY) return null;
  try {
    return await etherscanName(address.toLowerCase());
  } catch {
    return null;
  }
}

async function etherscanName(address: string): Promise<string | null> {
  "use cache";
  cacheLife("days");
  const url = new URL("https://api.etherscan.io/v2/api");
  url.search = new URLSearchParams({
    chainid: "1",
    module: "contract",
    action: "getsourcecode",
    address,
    apikey: process.env.ETHERSCAN_API_KEY ?? "",
  }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) throw new Error(`Etherscan ${response.status}`);
  const body = (await response.json()) as { status: string; result: { ContractName?: string }[] };
  if (body.status !== "1") throw new Error("Etherscan error");
  return body.result[0]?.ContractName || null;
}
