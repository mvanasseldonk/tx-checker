import { ANCOR, LAST_O, LAST_O_BOX, WORD_UNITS_PER_EM, WORD_WIDTH } from "./glyphs";
import { DEFAULT_MARK, NAME, type MarkKind } from "./config";
import { MarkArt, ringDot } from "./Mark";

/*
 * The lockup: the mark and "Ancoro" in Fraunces, drawn in the glyph units of glyphs.ts (2000 to the em,
 * baseline at 0, y down).
 *   a  the last "o" is the mark: a ring with its settled dot, the size of the o it replaces.
 *   b, c  the mark, as high as the capital, then the word.
 */

const TOP = -1460;
const HEIGHT = 1500;
const MARK_SIZE = 1500;
const MARK_TOP = -1450;
const MARK_GAP = 400;

function word(ink: string, kind: MarkKind) {
  if (kind !== "a") return <path d={`${ANCOR}${LAST_O}`} fill={ink} />;
  const { left, right, top, bottom } = LAST_O_BOX;
  const R = (right - left) / 2;
  return (
    <>
      <path d={ANCOR} fill={ink} />
      {ringDot(ink, { cx: (left + right) / 2, cy: (top + bottom) / 2, R, sw: 190, dot: 120, gap: 60 })}
    </>
  );
}

/** The lockup's shapes and the box they fill, in glyph units. */
export function LockupArt(kind: MarkKind, ink: string = "currentColor", cut: string = "var(--color-ground)") {
  if (kind === "a") return { width: WORD_WIDTH, art: word(ink, kind) };
  const scale = MARK_SIZE / 64;
  return {
    width: MARK_SIZE + MARK_GAP + WORD_WIDTH,
    art: (
      <>
        <g transform={`translate(0 ${MARK_TOP}) scale(${scale})`}>{MarkArt(kind, ink, cut)}</g>
        <g transform={`translate(${MARK_SIZE + MARK_GAP} 0)`}>{word(ink, kind)}</g>
      </>
    ),
  };
}

/** `size` is the type size the wordmark would have, in px: the letters are as high as that type's. */
export function Lockup({ kind = DEFAULT_MARK, size = 20, className }: { kind?: MarkKind; size?: number; className?: string }) {
  const { width, art } = LockupArt(kind);
  const scale = size / WORD_UNITS_PER_EM;
  return (
    <svg
      role="img"
      aria-label={NAME}
      viewBox={`0 ${TOP} ${width} ${HEIGHT}`}
      width={Math.round(width * scale * 10) / 10}
      height={Math.round(HEIGHT * scale * 10) / 10}
      className={className}
    >
      {art}
    </svg>
  );
}

export const LOCKUP_TOP = TOP;
export const LOCKUP_HEIGHT = HEIGHT;
