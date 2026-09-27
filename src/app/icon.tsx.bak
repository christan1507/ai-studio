import { ImageResponse } from "next/og";

import { BRAND, STAR_PATH, STAR_VIEWBOX } from "@/lib/brand";

// Generated favicon — the brand star on a dark rounded tile. Doubles as the
// PWA icon referenced by `app/manifest.ts`.
export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 112,
          background: `radial-gradient(60% 60% at 50% 42%, ${BRAND.violetDeep} 0%, ${BRAND.background} 70%)`,
        }}
      >
        <svg width="320" height="320" viewBox={STAR_VIEWBOX}>
          <path d={STAR_PATH} fill={BRAND.paper} />
        </svg>
      </div>
    ),
    { ...size },
  );
}
