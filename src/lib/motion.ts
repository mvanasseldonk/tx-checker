import { detectPaste } from "./detect";

/** Inputs longer than this are never a hash, address or explorer link, so they are not even tried. */
const LONGEST_INPUT = 400;

/** Is this text (as typed or pasted) a hash or address that Ancoro can open? */
export function isCheckable(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.length > 0 && trimmed.length <= LONGEST_INPUT && detectPaste(trimmed).ok;
}

/**
 * The text a swapping line is told apart by: what is on screen as a string or a number, null for anything
 * else (markup cannot be compared, so it does not swap unless it is given a key).
 */
export function textKey(content: unknown): string | null {
  return typeof content === "string" || typeof content === "number" ? String(content) : null;
}

/** Did the text change from one render to the next? The first one (`previous` null) does not count. */
export function didChange(previous: string | null, next: string | null): boolean {
  return previous !== null && next !== null && previous !== next;
}

/** When the `index`-th of a row of items starts (ms), `step` apart, after the first `lead`. Late ones all start together. */
export function staggerDelay(index: number, { step = 40, lead = 0, cap = 8 } = {}): number {
  return lead + Math.min(Math.max(index, 0), cap) * step;
}

/** The "no" shake: three small horizontal moves, 300 ms in all. */
export const SHAKE_MS = 300;
export const SHAKE_KEYFRAMES: Keyframe[] = [0, -6, 6, -4, 4, -2, 0].map((x, i, all) => ({
  transform: `translateX(${x}px)`,
  offset: i / (all.length - 1),
}));

/** Should this page move at all? The system setting, or the switch of the motion lab (temporary, S14). */
export function reducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.hasAttribute("data-reduce-motion")
  );
}

/** Shakes an element "no", once, unless motion is reduced. Only transform moves. */
export function shake(element: HTMLElement | null) {
  if (!element || reducedMotion()) return;
  element.animate(SHAKE_KEYFRAMES, { duration: SHAKE_MS, easing: "ease-in-out" });
}
