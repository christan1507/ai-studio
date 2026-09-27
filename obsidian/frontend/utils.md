---
tags: [frontend, stable]
updated: 2026-05-21
---

# Catalog — Utilities

Pure helper functions in `src/utils/` (no side effects, unless noted).

## `is-bot.ts`

`isBot(): Promise<boolean>` — **server-only**. Reads the `user-agent` header,
returns `true` for crawlers/audit tools. Used to skip heavy animation for bots.
See [[seo-metadata]].

## `scroll-to.ts`

`scrollTo(id?, immediate?)` — programmatic scroll to an element id (string) or a
numeric position. Integrates with the Lenis [[smooth-scroll|scroll store]];
temporarily disables scroll state during the animation. Has `//if lenis` guards so
the Lenis dependency can be stripped if smooth scroll is removed.

## `math.ts`

| Function | Purpose |
|----------|---------|
| `transformRange(value, min, max, newMin, newMax)` | remap a value between ranges (clamped) |
| `lerp(start, end, t)` | linear interpolation |
| `interpolate(from, to, progress)` | interpolate an object of CSS values (numbers, unit strings, **single** transform functions e.g. `scale()`/`translateY(%)`). Used by `useSpringTrigger` scrub. Fixed 2026-06-20 — previously rebuilt transform functions malformed; still single-function only. See [[decisions-log]] ADR-0015. |
| `debounce(...)` | debounce helper (used by `useWindowSize`) |

## `lvh.ts`

CSS-string builders for viewport-height units with fallbacks
(`vh` → `lvh` → `calc(var(--vh) …)`): `heightLvh`, `minHeightLvh`, `marginTopLvh`,
`marginBottomLvh`. Solves mobile-browser viewport-height inconsistencies.

## `animation/coords.ts`

Element-coordinate helpers — `getElementCoords`, `getScrollCoordsFromElement` —
used internally by the scroll/animation system. Marked `@ts-nocheck`. `#do-not-modify`

## `showreel/timeline.ts`

The [[home-page]] Showreel's scroll choreography — a pure port of the original
`updateScroll()`. Every export is a function of one normalised scroll progress
`p` (0→1) returning a CSS value (transform/size/opacity string or number), e.g.
`carouselTransform(p)`, `card1Width(p)`, `starMaskSize(p)`, `cameraRigTransform(p)`,
`portfolioTransform(p)`, `gridOpacity(p)`, plus the `heroLetterStyle` /
`blockLetterStyle` letter selectors and the `GRID_ITEMS` table. A few take a live
`vmin` (px) where a CSS `calc` can't stay unit-only (the sphere counter-scales) —
those also take an optional `geo` (default `DESKTOP_GEO`). The pure-string builders
emit `var(--sr-*)` for the per-layout card geometry. Consumed via `p.to(selector)`.
See [[decisions-log]] ADR-0016, ADR-0024.

## `showreel/geometry.ts`

Single source of truth for the Showreel's **responsive** proportional constants
(ADR-0024). Exports `GEO[mobile|tablet|desktop]` + `DESKTOP_GEO` (carousel card
size/radius/fly-back, sphere heading + body scales, physical `trackVh`), the shared
constant `PERSP` (never per-layout), and `geoCssVars(geo)` → the `--sr-*` map that
`useShowreelLayout` writes onto the document root. The two delivery paths (CSS vars
for pure-string/JSX geometry, numeric `geo` for the JS-math counter-scales) both
read this one table, so the card CSS and the sphere counter-scale can't desync. Keep
`globals.css :root` `--sr-*` in sync with the `DESKTOP` set.

## `seo/generate-page-metadata.ts`

`generateMetadata(props?)` — shared page-`Metadata` builder. `generateViewport()`
— the `Viewport` export (carries `themeColor`). See [[seo-metadata]].

## `seo/structured-data.ts`

`getSiteStructuredData()` — builds the `Organization` + `WebSite` JSON-LD graph
rendered by the root layout. See [[seo-metadata]].

## Adding a util

Keep utilities **pure** and side-effect-free (server-only ones like `isBot` are the
exception — note it clearly). Group by domain under `utils/<domain>/`.

## Related

[[hooks]] · [[seo-metadata]] · [[smooth-scroll]]
