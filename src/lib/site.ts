/**
 * Site-wide configuration — the single source of truth for SEO.
 *
 * Consumed by the metadata generator, `robots.ts`, `sitemap.ts`, and the
 * JSON-LD structured-data helper. Update the placeholder values per project.
 */
import { publicEnv } from "@/env";

export const siteConfig = {
  name: "Metaskills Institute",
  /** Used as the homepage `<title>` suffix and the default share title. */
  tagline: "AI Training, Cybersecurity & Algorithmic Trading in Singapore",
  description:
    "Metaskills Institute is the AI Institute for Asia — consulting-led AI training and transformation, customised to each organisation and every learner. Accredited by SSG, IBF-SSG, and ACLP.",
  /**
   * Public origin, no trailing slash. Drives canonical URLs, OG tags, the
   * sitemap, and JSON-LD. Set `NEXT_PUBLIC_SITE_URL` in production.
   */
  url: publicEnv.NEXT_PUBLIC_SITE_URL ?? "https://metaskills.sg",
  twitterHandle: "@metaskills",
  author: "Metaskills Institute",
  /** Browser theme-color (address bar / PWA) — matches the page backdrop. */
  themeColor: "#000000",
} as const;
