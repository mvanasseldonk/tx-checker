import {
  A_BAR,
  A_BODY,
  D_BAR,
  LAST_O,
  LAST_O_BOX,
  NCOR,
  SETTLED_O,
  SHORE_LEFT,
  SHORE_RIGHT,
  SHORE_WEIGHT,
  SHORE_Y,
  WORD_UNITS_PER_EM,
  WORD_WIDTH,
} from "./glyphs";
import { DEFAULT_MARK, NAME, type MarkKind } from "./config";
import { ringDot } from "./Mark";

/*
 * The lockup: "Ancoro" in Fraunces, drawn in the glyph units of glyphs.ts (2000 to the em, baseline at 0,
 * y down). The wordmark only, no mark before it: the mark is a change to one of its letters.
 *   a  the last "o" is the mark: a ring with its settled dot, the size of the o it replaces.
 *   d  the A's crossbar is a shallow arc, so the A reads as an anchor.
 *   e  the last o has its weight sunk to the foot.
 *   f  the A has no crossbar; it has dropped to the baseline and runs under the whole word.
 */

const TOP = -1460;
const HEIGHT = 1500;
/** F's line hangs below the baseline, so its box is a little taller. */
const SHORE_HEIGHT = SHORE_Y + SHORE_WEIGHT - TOP + 5;

function word(ink: string, kind: MarkKind) {
  if (kind === "d") return <path d={`${D_BAR}${A_BODY}${NCOR}${LAST_O}`} fill={ink} />;
  if (kind === "e") return <path d={`${A_BAR}${A_BODY}${NCOR}${SETTLED_O}`} fill={ink} />;
  if (kind === "f") {
    const line = `M${SHORE_LEFT} ${SHORE_Y}H${SHORE_RIGHT}V${SHORE_Y + SHORE_WEIGHT}H${SHORE_LEFT}Z`;
    return <path d={`${A_BODY}${NCOR}${LAST_O}${line}`} fill={ink} />;
  }
  const { left, right, top, bottom } = LAST_O_BOX;
  const R = (right - left) / 2;
  return (
    <>
      <path d={`${A_BAR}${A_BODY}${NCOR}`} fill={ink} />
      {ringDot(ink, { cx: (left + right) / 2, cy: (top + bottom) / 2, R, sw: 190, dot: 120, gap: 60 })}
    </>
  );
}

/** The lockup's shapes and the box they fill, in glyph units. */
export function LockupArt(kind: MarkKind, ink: string = "currentColor") {
  return { width: WORD_WIDTH, art: word(ink, kind) };
}

/** The height of the lockup's box, in glyph units. */
export function lockupHeight(kind: MarkKind) {
  return kind === "f" ? SHORE_HEIGHT : HEIGHT;
}

/** `size` is the type size the wordmark would have, in px: the letters are as high as that type's. */
export function Lockup({ kind = DEFAULT_MARK, size = 20, className }: { kind?: MarkKind; size?: number; className?: string }) {
  const { width, art } = LockupArt(kind);
  const height = lockupHeight(kind);
  const scale = size / WORD_UNITS_PER_EM;
  return (
    <svg
      role="img"
      aria-label={NAME}
      viewBox={`0 ${TOP} ${width} ${height}`}
      width={Math.round(width * scale * 10) / 10}
      height={Math.round(height * scale * 10) / 10}
      className={className}
    >
      {art}
    </svg>
  );
}

export const LOCKUP_TOP = TOP;
export const LOCKUP_HEIGHT = HEIGHT;
