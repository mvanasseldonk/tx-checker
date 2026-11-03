import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { DEFAULT_MARK, GROUND, INK, NAME, TAGLINE } from "@/components/brand/config";
import { LOCKUP_HEIGHT, LOCKUP_TOP, LockupArt } from "@/components/brand/Lockup";
import { WORD_UNITS_PER_EM } from "@/components/brand/glyphs";

export const alt = `${NAME} · ${TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const MUTED = "#5b6472";
const SUCCESS = "#0b6b45";
const LOCKUP_SIZE = 150; // the type size the wordmark has, in px

// Read once, at module level, which keeps this image prerendered at build time instead of drawn per request.
const fraunces = await readFile(join(process.cwd(), "src/components/brand/fraunces-medium-latin.ttf"));

/** The share image: the lockup of the default mark, the line, and a settled status circle. */
export default function OpenGraphImage() {
  const { width, art } = LockupArt(DEFAULT_MARK, INK, GROUND);
  const scale = LOCKUP_SIZE / WORD_UNITS_PER_EM;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 96px",
          background: GROUND,
          fontFamily: "Fraunces",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          <svg viewBox={`0 ${LOCKUP_TOP} ${width} ${LOCKUP_HEIGHT}`} width={Math.round(width * scale)} height={Math.round(LOCKUP_HEIGHT * scale)}>
            {art}
          </svg>
          <div style={{ display: "flex", fontSize: 44, color: MUTED, letterSpacing: "-0.02em" }}>{TAGLINE}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            width: 290,
            height: 290,
            borderRadius: 145,
            alignItems: "center",
            justifyContent: "center",
            background: SUCCESS,
            color: "#fff",
            fontSize: 52,
            letterSpacing: "-0.02em",
            boxShadow: "0 36px 60px -30px rgba(16,19,24,0.5)",
          }}
        >
          Success
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Fraunces", data: fraunces, style: "normal", weight: 500 }] },
  );
}
