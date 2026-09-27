/**
 * Showreel geometry — the single source of truth for the few proportional
 * constants that must change between **landscape desktop** and **portrait**
 * phones/tablets.
 *
 * Why this exists: the whole Showreel is sized in `vmin` (= `min(vw, vh)`). On a
 * landscape desktop `vmin` tracks height and the carousel/headings fill the
 * screen; on a portrait phone `vmin` collapses to the narrow width, so the cards
 * and the big sphere headings end up tiny / overflowing. We retune only the
 * handful of constants that read wrong in portrait — everything else in
 * `timeline.ts` is viewport-relative and self-scales (the camera flight, the
 * parallax grid, the target block), so it is deliberately left untouched.
 *
 * Two delivery mechanisms, ONE table (no mirrored sources):
 *  - **CSS custom properties** (`cssVars`) for values baked into JSX `className`
 *    arbitrary values and emitted by the pure-string timeline builders. These are
 *    written onto `document.documentElement` by `useShowreelLayout`, with the
 *    desktop set also declared in `globals.css :root` as the SSR / no-JS default.
 *    Driving geometry through CSS vars means the `p.to(...)` selectors stay
 *    referentially stable (the browser swaps the value live — no react-spring
 *    detach/reattach, so no one-frame "teleport"; see `showreel-stage.tsx`).
 *  - **numeric fields** for the two JS-math islands that compute a *unitless*
 *    counter-scale from a live `vmin`-in-px (`blackScreenTransform`,
 *    `sphereSceneScale` in `timeline.ts`), which CSS `calc` cannot express.
 *
 * `PERSP` is intentionally NOT per-layout: it is baked into the JS counter-scale
 * math, the grid depth scale, AND the literal `[perspective:1500px]` in the CSS,
 * so it stays constant across layouts (portrait is tuned via distances/sizes).
 */

/** Scene perspective (px). Constant across layouts — see file header. */
export const PERSP = 1500;

/** Layout buckets. Landscape (any size) is treated as `desktop`. */
export type ShowreelLayout = "mobile" | "tablet" | "desktop";

export interface ShowreelGeo {
  /** Physical scroll-track height (vh). Lower on touch so the whole experience
   *  isn't a ~20-screen finger marathon. The scroll progress `p` is normalised
   *  over the track by `ProgressTrigger`, so this only changes how much swiping
   *  traverses the (unchanged) timeline — NOT the choreography. */
  trackVh: number;
  /** Side-card visual width (vmin). Hero card uses this as its *height*. */
  cardWVmin: number;
  /** Side-card visual height (vmin). Hero card uses this as its *width*. */
  cardHVmin: number;
  /** Carousel radius — card `translateZ` offset (vmin). */
  carouselRVmin: number;
  /** Carousel fly-back depth (vmin). */
  flybackVmin: number;
  /** Hero full-screen inset: `100vw/vh - heroPad` (vmin, = 2× stage padding). */
  heroPadVmin: number;
  /** Sphere top heading scale (vmin). */
  heading1Vmin: number;
  /** Sphere bottom heading scale (vmin). */
  heading2Vmin: number;
  /** Sphere supporting-copy max-width (vmin). */
  sphereBodyWVmin: number;
  /** Sphere supporting-copy text size (vmin). */
  sphereBodyTextVmin: number;
}

const DESKTOP: ShowreelGeo = {
  trackVh: 2000,
  cardWVmin: 42,
  cardHVmin: 62,
  carouselRVmin: 27,
  flybackVmin: 40,
  heroPadVmin: 8,
  heading1Vmin: 18,
  heading2Vmin: 24,
  sphereBodyWVmin: 52,
  sphereBodyTextVmin: 2.4,
};

// Portrait tablet (~640–1024px). Cards grow toward the narrow width; headings
// shrink so the nowrap sphere titles stop overflowing.
const TABLET: ShowreelGeo = {
  trackVh: 1700,
  cardWVmin: 54,
  cardHVmin: 80,
  carouselRVmin: 35,
  flybackVmin: 52,
  heroPadVmin: 8,
  heading1Vmin: 13,
  heading2Vmin: 16,
  sphereBodyWVmin: 64,
  sphereBodyTextVmin: 3.0,
};

// Portrait phone (<640px). Largest cards relative to the (width-bound) vmin and
// the smallest heading scales.
const MOBILE: ShowreelGeo = {
  trackVh: 1300,
  cardWVmin: 64,
  cardHVmin: 94,
  carouselRVmin: 41,
  flybackVmin: 60,
  heroPadVmin: 8,
  heading1Vmin: 10,
  heading2Vmin: 12,
  sphereBodyWVmin: 82,
  sphereBodyTextVmin: 4.2,
};

export const GEO: Record<ShowreelLayout, ShowreelGeo> = {
  desktop: DESKTOP,
  tablet: TABLET,
  mobile: MOBILE,
};

/** Default geo for timeline fns called without an explicit layout (= desktop, so
 *  desktop output stays byte-identical to before this system existed). */
export const DESKTOP_GEO = DESKTOP;

/** CSS custom-property names driven by the geometry table. Kept here so the hook,
 *  the timeline string builders, and `globals.css` agree on one spelling. */
export const SR_VARS = {
  cardW: "--sr-card-w",
  cardH: "--sr-card-h",
  carouselR: "--sr-carousel-r",
  flyback: "--sr-flyback",
  heroPad: "--sr-hero-pad",
  heading1: "--sr-heading-1",
  heading2: "--sr-heading-2",
  sphereBodyW: "--sr-sphere-body-w",
  sphereBodyText: "--sr-sphere-body-text",
} as const;

/** Build the `--sr-*` → value map for a layout, for the hook to apply. */
export const geoCssVars = (g: ShowreelGeo): Record<string, string> => ({
  [SR_VARS.cardW]: `${g.cardWVmin}vmin`,
  [SR_VARS.cardH]: `${g.cardHVmin}vmin`,
  [SR_VARS.carouselR]: `${g.carouselRVmin}vmin`,
  [SR_VARS.flyback]: `${g.flybackVmin}vmin`,
  [SR_VARS.heroPad]: `${g.heroPadVmin}vmin`,
  [SR_VARS.heading1]: `${g.heading1Vmin}vmin`,
  [SR_VARS.heading2]: `${g.heading2Vmin}vmin`,
  [SR_VARS.sphereBodyW]: `${g.sphereBodyWVmin}vmin`,
  [SR_VARS.sphereBodyText]: `${g.sphereBodyTextVmin}vmin`,
});
