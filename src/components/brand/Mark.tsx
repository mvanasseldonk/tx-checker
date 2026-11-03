import { A_BODY, A_BOX, D_BAR_MARK, LAST_O_BOX, SETTLED_O, SHORE_WEIGHT } from "./glyphs";
import { DEFAULT_MARK, type MarkKind } from "./config";

/*
 * The mark, four ways, in one colour on a 64 x 64 box. Each of d, e and f is a letter of the wordmark
 * (the real Fraunces outlines of glyphs.ts) with one quiet change, alone and centred.
 *   a  Settled: the status ring with a dot that has come to rest at its foot.
 *   d  Anchor A: the crossbar is a shallow arc, so the A reads as an anchor.
 *   e  Settled o: the o with its weight sunk to the foot.
 *   f  Shore line: the A standing on a line that is its crossbar, dropped to the baseline.
 * MarkArt and ringDot are plain functions that return plain SVG elements, so that the share image
 * (satori, which has no components inside an svg) can use them as well as the page.
 */

/** A ring with a dot resting at its foot. (cx, cy) is the centre, R the outer radius, sw the ring's stroke. */
export function ringDot(
  ink: string,
  { cx, cy, R, sw, dot, gap }: { cx: number; cy: number; R: number; sw: number; dot: number; gap: number },
) {
  const inner = R - sw;
  return (
    <>
      <circle cx={cx} cy={cy} r={R - sw / 2} fill="none" stroke={ink} strokeWidth={sw} />
      <circle cx={cx} cy={cy + inner - gap - dot} r={dot} fill={ink} />
    </>
  );
}

/** Glyph shapes centred on the 64 x 64 box and scaled so that `box` fits in `fit` x `fit`. */
function letter(ink: string, d: string, box: { left: number; right: number; top: number; bottom: number }, fit: number) {
  const scale = fit / Math.max(box.right - box.left, box.bottom - box.top);
  const x = 32 - (scale * (box.left + box.right)) / 2;
  const y = 32 - (scale * (box.top + box.bottom)) / 2;
  return (
    <g transform={`translate(${Math.round(x * 100) / 100} ${Math.round(y * 100) / 100}) scale(${Math.round(scale * 10000) / 10000})`}>
      <path d={d} fill={ink} />
    </g>
  );
}

/** The line the A stands on in F: the feet, and a little beyond them on both sides. */
const SHORE_MARK = `M-70 0H1509V${SHORE_WEIGHT}H-70Z`;
const SHORE_MARK_BOX = { left: -70, right: 1509, top: A_BOX.top, bottom: SHORE_WEIGHT };

/** The shapes of a mark, on the 64 x 64 box. */
export function MarkArt(kind: MarkKind, ink: string = "currentColor") {
  if (kind === "d") return letter(ink, `${D_BAR_MARK}${A_BODY}`, A_BOX, 50);
  if (kind === "e") return letter(ink, SETTLED_O, LAST_O_BOX, 54);
  if (kind === "f") return letter(ink, `${A_BODY}${SHORE_MARK}`, SHORE_MARK_BOX, 52);
  return ringDot(ink, { cx: 32, cy: 32, R: 29.5, sw: 7, dot: 7.5, gap: 3.5 });
}

export function Mark({
  kind = DEFAULT_MARK,
  size = 24,
  className,
}: {
  kind?: MarkKind;
  size?: number;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className={className}>
      {MarkArt(kind)}
    </svg>
  );
}
