/**
 * Site-wide configuration — the single source of truth for SEO.
 *
 * Consumed by the metadata generator, `robots.ts`, `sitemap.ts`, and the
 * JSON-LD structured-data helper. Update the placeholder values per project.
 */
import { publicEnv } from "@/env";

export const siteConfig = {
  name: "Superconscious",
  /** Used as the homepage `<title>` suffix and the default share title. */
  tagline: "Prompts that think ahead",
  description:
    "Superconscious is a neural engine that turns intent into action — anticipating your next move before you make it, across every device you already own. One model, every surface: wearable, neural, and beyond.",
  /**
   * Public origin, no trailing slash. Drives canonical URLs, OG tags, the
   * sitemap, and JSON-LD. Set `NEXT_PUBLIC_SITE_URL` in production.
   */
  url: publicEnv.NEXT_PUBLIC_SITE_URL ?? "https://superconscious.ai",
  twitterHandle: "@superconscious",
  author: "Superconscious",
  /** Browser theme-color (address bar / PWA) — matches the page backdrop. */
  themeColor: "#000000",
} as const;
