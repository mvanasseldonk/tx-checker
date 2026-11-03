import { CHAIN_NAME, type Chain } from "@/lib/detect";

/*
 * The chain's mark, as inline SVG: no request, crisp at any size. Drawn from the projects' own artwork,
 * unchanged apart from rounding and the single colour:
 *   Bitcoin   https://bitcoin.org/en/graphics/bitcoin (the circle with the tilted B, as Bitcoin.svg)
 *   Ethereum  https://ethereum.org/en/assets/ (the 2014 diamond, six facets)
 *   Solana    https://solana.com/branding (three slanted bars)
 * Brand guidelines: no distortion (the viewBox keeps each mark's own proportions), no effects, and clear
 * space around it. The header gives every mark at least half its height of room on all sides.
 *
 * Drawn in one colour, the ink colour (currentColor); the PO chose this over the official colours.
 */

const SIZE: Record<Chain, { viewBox: string; width: number; height: number }> = {
  btc: { viewBox: "0 0 64 64", width: 24, height: 24 },
  eth: { viewBox: "0 0 256 417", width: 15, height: 24 },
  sol: { viewBox: "0 0 398 312", width: 28, height: 22 },
};

export function ChainLogo({ chain }: { chain: Chain }) {
  const { viewBox, width, height } = SIZE[chain];
  return (
    <svg
      role="img"
      aria-label={CHAIN_NAME[chain]}
      viewBox={viewBox}
      width={width}
      height={height}
      fill="currentColor"
      className="shrink-0 text-ink"
    >
      {chain === "btc" && <Bitcoin />}
      {chain === "eth" && <Ethereum />}
      {chain === "sol" && <Solana />}
    </svg>
  );
}

function Bitcoin() {
  return (
    <>
      <path d="m63.03 39.74c-4.27 17.14-21.64 27.58-38.78 23.3-17.14-4.27-27.57-21.64-23.3-38.78 4.27-17.15 21.64-27.58 38.78-23.31 17.14 4.28 27.58 21.64 23.3 38.79z" />
      {/* The B is cut out of the disc, in the page's ground colour. */}
      <path fill="var(--color-ground)" d="m46.1 27.44c.64-4.26-2.6-6.55-7.04-8.07l1.44-5.77-3.51-.87-1.4 5.61c-.92-.23-1.87-.45-2.81-.66l1.41-5.65-3.51-.88-1.44 5.77c-.76-.17-1.51-.35-2.24-.53l0-.02-4.84-1.2-.93 3.75s2.6.6 2.55.63c1.42.36 1.68 1.3 1.64 2.04l-1.64 6.57c.1.02.23.06.37.12-.12-.03-.24-.06-.37-.09l-2.3 9.2c-.17.43-.62 1.08-1.61.83.04.05-2.55-.64-2.55-.64l-1.74 4.02 4.57 1.14c.85.21 1.68.44 2.5.65l-1.45 5.83 3.51.88 1.44-5.77c.96.26 1.89.5 2.8.73l-1.43 5.75 3.51.88 1.45-5.82c5.99 1.13 10.49.68 12.38-4.74 1.53-4.36-.08-6.88-3.23-8.52 2.29-.53 4.02-2.04 4.48-5.16zm-8.02 11.25c-1.09 4.36-8.43 2-10.81 1.41l1.93-7.73c2.38.6 10.01 1.77 8.88 6.32zm1.09-11.31c-.99 3.97-7.1 1.95-9.08 1.46l1.75-7.01c1.98.49 8.37 1.42 7.33 5.55z" />
    </>
  );
}

function Ethereum() {
  // Six facets of the diamond, in lighter and darker tones of the ink.
  return (
    <>
      <polygon fillOpacity={0.85} points="128 0 125.2 9.5 125.2 285.2 128 288 255.9 212.3" />
      <polygon fillOpacity={0.5} points="128 0 0 212.3 128 288 128 154.2" />
      <polygon fillOpacity={0.85} points="128 312.2 126.4 314.1 126.4 412.3 128 416.9 256 236.6" />
      <polygon fillOpacity={0.5} points="128 416.9 128 312.2 0 236.6" />
      <polygon points="128 288 255.9 212.3 128 154.2" />
      <polygon fillOpacity={0.9} points="0 212.3 128 288 128 154.2" />
    </>
  );
}

function Solana() {
  return (
    <>
      <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
      <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
      <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
    </>
  );
}
