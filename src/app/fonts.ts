import { Bricolage_Grotesque, Fraunces, Geist_Mono, Instrument_Sans, Instrument_Serif } from "next/font/google";

/*
 * The typefaces. Three pairings can be tried on a preview (see FontSwitch); only A is preloaded.
 * A pairing is a display face (the status word and the amounts) and a text face (everything else).
 * Hashes and addresses are Geist Mono in all of them.
 */

export const mono = Geist_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

// A: soft, characterful serif for the big words, a quiet sans for the small ones.
export const fraunces = Fraunces({
  variable: "--font-fraunces",
  weight: "500",
  subsets: ["latin"],
  display: "swap",
});
export const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  display: "swap",
});

// B: a slender, editorial serif; shares the sans of A.
export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
  preload: false,
});

// C: one lively grotesque for everything.
export const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
  preload: false,
});

export const FONT_VARIABLES = [mono, fraunces, instrumentSans, instrumentSerif, bricolage]
  .map((font) => font.variable)
  .join(" ");
