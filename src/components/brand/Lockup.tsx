import { A_BODY, D_BAR, LAST_O, NCOR, WORD_UNITS_PER_EM, WORD_WIDTH } from "./glyphs";
import { NAME } from "./config";

/*
 * The lockup: "Ancoro" in Fraunces, drawn in the glyph units of glyphs.ts (2000 to the em, baseline at 0,
 * y down). The word only, no mark before it: the mark is the A, whose crossbar is a shallow anchor arc.
 */

const TOP = -1460;
const HEIGHT = 1500;

/** The lockup's shapes and the box they fill, in glyph units. */
export function LockupArt(ink: string = "currentColor") {
  return { width: WORD_WIDTH, art: <path d={`${D_BAR}${A_BODY}${NCOR}${LAST_O}`} fill={ink} /> };
}

/** `size` is the type size the wordmark would have, in px: the letters are as high as that type's. */
export function Lockup({ size = 20, className }: { size?: number; className?: string }) {
  const { width, art } = LockupArt();
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
