import { A_BODY, A_BOX, D_BAR_MARK } from "./glyphs";

/*
 * The mark: the A of the wordmark with the anchor arc for a crossbar, alone, in one colour on a 64 x 64 box
 * (the real Fraunces outline of glyphs.ts). The arc is heavier and deeper than the wordmark's, and the A
 * fills more of the box, so that it still reads as an anchor at 16 px.
 * MarkArt is a plain function that returns plain SVG elements, so that the share image (satori, which has no
 * components inside an svg) can use it as well as the page.
 */
const FIT = 58;

/** The shapes of the mark, on the 64 x 64 box. */
export function MarkArt(ink: string = "currentColor") {
  const scale = FIT / (A_BOX.bottom - A_BOX.top);
  const x = Math.round((32 - (scale * (A_BOX.left + A_BOX.right)) / 2) * 100) / 100;
  const y = Math.round((32 - (scale * (A_BOX.top + A_BOX.bottom)) / 2) * 100) / 100;
  return (
    <g transform={`translate(${x} ${y}) scale(${Math.round(scale * 10000) / 10000})`}>
      <path d={`${D_BAR_MARK}${A_BODY}`} fill={ink} />
    </g>
  );
}

export function Mark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={className}>
      {MarkArt()}
    </svg>
  );
}
