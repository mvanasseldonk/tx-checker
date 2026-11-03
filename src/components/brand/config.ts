/**
 * The three logo directions for Ancoro, for trying on a preview. The PO picks one; then the other two
 * go: their branches in Mark.tsx and Lockup.tsx, this file's list, MarkSwitch.tsx, the `.mark-variant`
 * rules at the end of globals.css and the `env` line in next.config.ts. What is left is one mark, one
 * lockup and DEFAULT_MARK as the only kind (which the icons and the share image already follow).
 */
export const MARKS = ["a", "b", "c"] as const;
export type MarkKind = (typeof MARKS)[number];

/** The recommendation. The favicon, the app icon and the share image are drawn from this one. */
export const DEFAULT_MARK: MarkKind = "a";

/** True on previews and in development, false on production (set from VERCEL_ENV in next.config.ts). */
export const MARK_PREVIEW = process.env.NEXT_PUBLIC_MARK_PREVIEW === "true";

export const NAME = "Ancoro";
export const TAGLINE = "Did my transaction go through?";

export const INK = "#101318";
export const GROUND = "#f2f3f5";

export function isMark(value: unknown): value is MarkKind {
  return typeof value === "string" && (MARKS as readonly string[]).includes(value);
}

/** Runs in the head, before the first paint: takes `?mark=a|b|c` (remembered) and puts it on <html>. */
export const PICK_MARK = `try{var p=new URLSearchParams(location.search).get("mark");if(p==="a"||p==="b"||p==="c")localStorage.setItem("mark",p);var m=localStorage.getItem("mark");if(m==="a"||m==="b"||m==="c")document.documentElement.dataset.mark=m}catch(e){}`;
