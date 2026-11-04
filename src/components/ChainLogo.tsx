import { CHAIN_NAME, type Chain } from "@/lib/detect";

/*
 * The chain's mark, as inline SVG: no request, crisp at any size. Drawn from the projects' own artwork,
 * unchanged apart from rounding and the single colour:
 *   Bitcoin   https://bitcoin.org/en/graphics/bitcoin (the circle with the tilted B, as Bitcoin.svg)
 *   Ethereum  https://ethereum.org/en/assets/ (the 2014 diamond, six facets)
 *   Solana    https://solana.com/branding (three slanted bars)
 *   Base      https://github.com/base/brand-kit, logo/TheSquare/Digital/Base_square_black.svg (the square)
 *   Optimism  https://www.optimism.io/brand, the "OP Mainnet" symbol (the square with the OP mark cut out of it)
 *   Arbitrum  https://github.com/OffchainLabs/arbitrum-docs, public/img/logo.svg (the hexagon with the A cut out of it)
 * Brand guidelines: no distortion (the viewBox keeps each mark's own proportions), no effects, and clear
 * space around it. The header gives every mark at least half its height of room on all sides.
 *
 * Drawn in one colour, the ink colour (currentColor); the PO chose this over the official colours.
 */

const SIZE: Record<Chain, { viewBox: string; width: number; height: number }> = {
  base: { viewBox: "0 0 1280 1280", width: 24, height: 24 },
  op: { viewBox: "841 529 817 817", width: 24, height: 24 },
  arb: { viewBox: "0 0 1080 1218.5", width: 21, height: 24 },
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
      {chain === "base" && <Base />}
      {chain === "op" && <Optimism />}
      {chain === "arb" && <Arbitrum />}
    </svg>
  );
}

function Base() {
  return (
    <path d="M0,101.12c0-34.64,0-51.95,6.53-65.28,6.25-12.76,16.56-23.07,29.32-29.32C49.17,0,66.48,0,101.12,0h1077.76c34.63,0,51.96,0,65.28,6.53,12.75,6.25,23.06,16.56,29.32,29.32,6.52,13.32,6.52,30.64,6.52,65.28v1077.76c0,34.63,0,51.96-6.52,65.28-6.26,12.75-16.57,23.06-29.32,29.32-13.32,6.52-30.65,6.52-65.28,6.52H101.12c-34.64,0-51.95,0-65.28-6.52-12.76-6.26-23.07-16.57-29.32-29.32-6.53-13.32-6.53-30.65-6.53-65.28V101.12Z" />
  );
}

function Optimism() {
  return (
    <>
      <rect x="841" y="529" width="817" height="817" rx="80" />
      {/* The OP mark is cut out of the square, in the page's ground colour. */}
      <path fill="var(--color-ground)" d="M1249.77 576.871c156.99 0 284.3 127.309 284.3 284.304 0 156.995-127.31 284.305-284.3 284.305v152.63c-157 0-284.304-127.31-284.304-284.31 0-156.994 127.304-284.301 284.304-284.301V576.871Zm-1.32 219.963c-30.88 62.008-77.33 108.452-139.34 139.337v2.635c62.01 30.884 108.46 77.334 139.34 139.334h2.64c30.88-62 77.33-108.45 139.33-139.334v-2.635c-62-30.885-108.45-77.329-139.33-139.337h-2.64Z" />
    </>
  );
}

function Arbitrum() {
  return (
    <>
      {/* The A is cut out of the hexagon, in the page's ground colour. */}
      <path d="M41,370.4v477.7c0,30.5,16.3,58.7,42.7,73.9l413.7,238.9c26.4,15.2,58.9,15.2,85.3,0L996.4,922 c26.4-15.2,42.7-43.4,42.7-73.9V370.4c0-30.5-16.3-58.7-42.7-73.9L582.7,57.6c-26.4-15.2-58.9-15.2-85.3,0L83.6,296.5 C57.2,311.7,41,339.9,41,370.4z" />
      <path fill="var(--color-ground)" d="M630.3,701.9l-59,161.8c-1.6,4.5-1.6,9.4,0,13.9L672.8,1156l117.4-67.8L649.3,701.9 C646.1,693,633.5,693,630.3,701.9z" />
      <path fill="var(--color-ground)" d="M748.6,429.8c-3.2-8.9-15.8-8.9-19,0l-59,161.8c-1.6,4.5-1.6,9.4,0,13.9l166.3,455.8l117.4-67.8 L748.6,429.8z" />
      <path d="M540,75.5c2.9,0,5.8,0.8,8.4,2.2l447.7,258.5c5.2,3,8.4,8.6,8.4,14.5v516.9c0,6-3.2,11.5-8.4,14.5 l-447.7,258.5c-2.5,1.5-5.5,2.2-8.4,2.2c-2.9,0-5.8-0.8-8.4-2.2L83.9,882.3c-5.2-3-8.4-8.6-8.4-14.5V350.8c0-6,3.2-11.5,8.4-14.5 L531.6,77.8C534.2,76.3,537.1,75.5,540,75.5 M540,0c-15.9,0-31.9,4.1-46.2,12.4L46.2,270.8c-28.6,16.5-46.2,47-46.2,80v516.9 c0,33,17.6,63.5,46.2,80l447.7,258.5c14.3,8.2,30.2,12.4,46.2,12.4c15.9,0,31.9-4.1,46.2-12.4l447.7-258.5 c28.6-16.5,46.2-47,46.2-80V350.8c0-33-17.6-63.5-46.2-80L586.2,12.4C571.9,4.1,555.9,0,540,0L540,0z" />
      <polygon points="243.9,1061.9 285.1,949.1 368,1018 290.5,1088.8" />
      <path fill="var(--color-ground)" d="M502.3,313.8H388.8c-8.5,0-16.1,5.3-19,13.3l-243.3,667l117.4,67.8l267.9-734.5 C514.3,320.8,509.4,313.8,502.3,313.8z" />
      <path fill="var(--color-ground)" d="M700.9,313.8H587.4c-8.5,0-16.1,5.3-19,13.3l-277.8,761.6l117.4,67.8l302.4-829.1 C712.8,320.8,707.9,313.8,700.9,313.8z" />
    </>
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
