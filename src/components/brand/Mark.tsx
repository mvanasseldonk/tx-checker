import { DEFAULT_MARK, type MarkKind } from "./config";

/*
 * The mark, three ways, in one colour on a 64 x 64 box: `ink` for the shapes, `cut` for what is cut out of
 * a shape (only B has any, and it is the ground colour of the page).
 *   a  Settled: the status ring with a dot that has come to rest at its foot.
 *   b  Anchor: a disc with an anchor cut out of it.
 *   c  Plumb line: an anchor line drops through the ring and rests in its centre.
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

/** C: the ring, and a line that drops from its rim to a weight hanging low in it. */
function plumb(ink: string) {
  return (
    <>
      <circle cx="32" cy="32" r="26.6" fill="none" stroke={ink} strokeWidth="5.8" />
      <path d="M32 6V40" fill="none" stroke={ink} strokeWidth="5.8" />
      <circle cx="32" cy="40" r="8.6" fill={ink} />
    </>
  );
}

function anchor(ink: string, cut: string) {
  return (
    <>
      <circle cx="32" cy="32" r="31" fill={ink} />
      <g fill="none" stroke={cut} strokeWidth="4.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="32" cy="16.6" r="3.6" />
        <path d="M32 20.4V47.5" />
        <path d="M24.2 27H39.8" />
        <path d="M16.4 35.4C17.6 43.4 24 48.6 32 48.6S46.4 43.4 47.6 35.4" />
      </g>
    </>
  );
}

/** The shapes of a mark, on the 64 x 64 box. */
export function MarkArt(kind: MarkKind, ink: string = "currentColor", cut: string = "var(--color-ground)") {
  if (kind === "b") return anchor(ink, cut);
  if (kind === "c") return plumb(ink);
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
