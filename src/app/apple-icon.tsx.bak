import { ImageResponse } from "next/og";

import { BRAND, STAR_PATH, STAR_VIEWBOX } from "@/lib/brand";

// Generated Apple touch icon — the brand star on a dark tile (iOS applies its
// own rounding/mask, so the background is filled edge-to-edge).
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: `radial-gradient(60% 60% at 50% 42%, ${BRAND.violetDeep} 0%, ${BRAND.background} 72%)`,
        }}
      >
        <svg width="118" height="118" viewBox={STAR_VIEWBOX}>
          <path d={STAR_PATH} fill={BRAND.paper} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
