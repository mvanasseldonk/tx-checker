import { Fraunces, Geist_Mono, Instrument_Sans } from "next/font/google";

// Fraunces, a soft serif with character, for the status word and the amounts; Instrument Sans for the
// small text; Geist Mono for hashes and addresses. Only the weights that are used.
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

export const mono = Geist_Mono({
  variable: "--font-mono-face",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const FONT_VARIABLES = [fraunces, instrumentSans, mono].map((font) => font.variable).join(" ");
