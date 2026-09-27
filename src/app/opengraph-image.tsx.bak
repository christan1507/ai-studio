import { ImageResponse } from "next/og";

import { BRAND, STAR_PATH, STAR_VIEWBOX } from "@/lib/brand";
import { siteConfig } from "@/lib/site";

// Generated Open Graph / social share card — brand star + wordmark + tagline on
// the dark violet-bloom backdrop. 1200×630 is the canonical OG size.
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          textAlign: "center",
          color: BRAND.paper,
          background: `radial-gradient(70% 90% at 50% 18%, ${BRAND.violetDeep} 0%, ${BRAND.background} 62%)`,
        }}
      >
        <svg width="132" height="132" viewBox={STAR_VIEWBOX}>
          <path d={STAR_PATH} fill={BRAND.paper} />
        </svg>
        <div
          style={{
            display: "flex",
            fontSize: 88,
            fontWeight: 600,
            letterSpacing: "-0.03em",
          }}
        >
          {siteConfig.name}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "rgba(245, 241, 236, 0.62)",
            letterSpacing: "0.02em",
          }}
        >
          {siteConfig.tagline}
        </div>
      </div>
    ),
    { ...size },
  );
}
