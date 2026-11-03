import { ImageResponse } from "next/og";
import { DEFAULT_MARK, GROUND, INK } from "@/components/brand/config";
import { MarkArt } from "@/components/brand/Mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home screen icon: the default mark, light on an ink square (iOS rounds the corners itself). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: INK }}>
        <svg viewBox="0 0 64 64" width={112} height={112}>
          {MarkArt(DEFAULT_MARK, GROUND, INK)}
        </svg>
      </div>
    ),
    size,
  );
}
