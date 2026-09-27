import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site";

/**
 * Generated web app manifest (served at `/manifest.webmanifest`). Icons point
 * at the generated `app/icon.tsx` route so the PWA mark stays in sync with the
 * favicon and share images — all derived from the brand star.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: siteConfig.description,
    start_url: "/",
    display: "standalone",
    background_color: siteConfig.themeColor,
    theme_color: siteConfig.themeColor,
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
