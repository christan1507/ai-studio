---
tags: [frontend, page, stable]
updated: 2026-06-27
---

# Home Page — Showreel ("Prompts that think ahead")

The landing page on route `/`, a **1:1 rebuild** of a vanilla scroll-driven
WebGL showreel on this starter's spring + R3F stack. `HomeView`
(`src/views/home.tsx`) is a Server Component composing the fixed nav and the
scroll stage; all motion/3D lives in client leaves. ADR: [[decisions-log]]
ADR-0016. Replaces the former "Flourish with Laurin" page.

## The model — one scroll, one spring

The whole experience is a single tall scroll **track** (`TRACK_VH = 2000vh`)
with a sticky `h-screen` stage. A **single `ProgressTrigger`** (off the track,
`start="top top"` `end="bottom bottom"`) scrubs **one** spring `p` (0→1) via
imperative `useSpring({ immediate: true })`. Every animated value is a pure
function of `p` in `src/utils/showreel/timeline.ts` (a faithful port of the
original `updateScroll()`), consumed as `p.to(selector)`. The original's
2200vh-physical → 5500vh-virtual scroll compression (`SCROLL_COMPRESS = 0.4`) is
reproduced inside the timeline (`vScroll`, `gp`, phase progresses).

## Scenes (`src/views/home/`)

| Component | Notes |
|-----------|-------|
| `IntroLoader` | **Immersive intro** (`views/home/intro-loader.tsx`, `z-200`). Minimal: just the chrome **star** centred, scaling in from blur (violet `--loader-glow` halo) and spinning, over a soft violet `--card-violet` bloom (opacity-only — the blur layer is rasterised once, not re-blurred each frame, so the exit stays smooth). No text. On the load window elapsing it flips `useLoaderStore.ready`, accelerates the star away and **lifts + cross-fades** the overlay out, then unmounts. Spring-only, freezes Lenis scroll, reduced-motion-aware. The exit's `onRest` flips a `revealed` flag; `SiteHeader` fades its nav in on that (self-contained spring) so the fade plays on the fully-revealed page. The **stage is not opacity-gated** — it renders at full opacity *under* the opaque loader so its WebGL scenes warm up (shaders compile, first frames draw) during the intro, and is simply **uncovered** as the loader lifts. Fading the stage in would re-composite the live WebGL surface every frame for ~900ms at the reveal (a visible hitch). The stage also **mounts client-only** (returns `null` until a `mounted` effect fires) to avoid react-spring SSR hydration mismatches — see ADR-0022. |
| `SiteHeader` | Fixed, opaque **segmented** bar (8px, no shadow). Each item is its own tile 1px from the bar edges/neighbours (base shows as hairlines): square logo tile (slightly darker), **equal-width** link tiles, black **CTA** on the right (`home.ts` `headerCta`). Logo spins 90° on `Hover`; links fade on `Hover` (no CSS transitions). Click-through header, interactive bar. **Self-reveals** its `<nav>` bar (opacity + small `translateY`) once `useLoaderStore.revealed` flips — the fade is on the normal-flow nav, **not** a wrapper around the fixed `<header>` (which would snap, not animate). **Responsive:** the full link row shows from `sm` up; on phones the links collapse behind a menu toggle into a spring-animated dropdown beneath the bar (logo + CTA stay in the bar) so the segmented bar never overflows (ADR-0024). |
| `ShowreelStage` | **The orchestrator.** Owns `p` + the `ProgressTrigger`. Renders the fixed **pinned corner aurora** overlay (`FlameBackground`, alpha, `z-30`; ADR-0018), the sticky scene (`[perspective:1500px]` → `camera-rig` → `carousel` of 4 cards, cosine **z-sorted**), the white→dark backdrop, the marquee, a **carousel CTA** button pinned under the cards (sibling overlay of the 3D scene; appears the instant the hero card snaps vertical via `carouselCtaReveal`, sits `bottom-[2vmin]` to mirror the header offset; content `home.ts` `carouselCta`), the parallax grid, the target block, and the fixed `Portfolio`. |
| `HeroCard` | Carousel slot 1. `HeroGradient` shader bg (cursor parallax; tuned for perf — `dpr={1}` + `frameloop="demand"` ~36fps, see [[tech-stack]]); top-left headline sized to the marquee that descends + blurs out on scroll (`ScrollLetters`); a paired image card that **floats over the headline** (`z-[6]`, `[perspective]`) with a **cursor-driven 3D tilt** (`useSpring` + window `pointermove`, faded by `heroTiltFade`) and pans + grows to fully cover the card; rotated "Browse our templates" label (`z-[7]`, **above** the image so it reads over the carousel face). Front face = `stone.jpg` (full colour); the flipped/carousel face = `hero-image-2.png` (green). The headline + bottom content block fade out on scroll via `heroContentFade` (opacity only, absolutely positioned → no layout shift). |
| `CatalistCard` | Slots 2 (dark) & 3 (light) — the "Catalist" product UI mockups, full-bleed image + overlaid chrome. Logo chip = a **white tile with a brand sparkle icon** (no glow). The light card's copy is light (`text-paper`/`text-white`) so it reads on the dark lower half. |
| `SphereCard` | Slot 4. Carousel face = **violet** mesh gradient (`--card-violet`) + product chrome (pill + url + heading, like cards 2/3). A star-masked **black** panel (`300vw`) grows `8→1508vmin`, revealing `ParticleSphere` (boosted bloom, DPR `[2,3]` so the CSS-upscaled scene stays crisp) + a white star logo on black (the panel covers the violet face as it opens); supporting copy (`sphere.body`) fades in bottom-left; the violet corner aurora glows around it. Once open, the sphere **grows** (`sphereScale`) while the **logo shrinks** (`sphereCollapse`); then the particles softly **dissolve** (`sphereDisperse` → `uDisperse`, a live getter so it reassembles on scroll-back) into the portfolio handoff. Block heading rises into focus. Panel + inner-scene **counter-scales** keep the masked content optically stable. |
| `Marquee` | Seamless services strip — content rendered twice, translated 0→-50% on an infinite **react-spring loop** (replaces the source CSS `@keyframes`). |
| `Portfolio` | **Fixed** section — **no header** now, just the horizontally scrolling video cards (max-pan measured from the track); flies up, scrolls, then exits left with scale. Sits on the shared pinned aurora (no background of its own). The fixed section gets generous top/bottom padding (`pt-[9vmin]`/`pb-[8vmin]`) so the shorter cards clear the centred header. Each card: **one tag line** (`client · year · discipline`) at the top and the one-word case **title** at the bottom at the section-H1 scale (`text-[7vw]`, `leading-[0.95]`, `tracking-[-0.03em]`, `capitalize`). The clips are multi-MB, so each `<video>` only mounts (and downloads + autoplays) once the section enters its scroll range — gated by the `portfolio` flag in `sceneVisibility(p)` (`active` prop) to keep them out of the initial page load. Each card + video is pinned to a stable GPU layer (`translateZ(0)` + `backface-visibility:hidden`) so the horizontal pan composites cleanly without re-raster flicker; the component is `React.memo`-wrapped. |
| `CtaBlock` | Call-to-action overlaid on the final chrome-star block (which also carries a **solid white margin band** — a `4vmin` white area (transparent centre) with rounded inner corners like the hero card, matching the hero stage's `p-[4vmin]` white margin; implemented as a `border-[8vmin]` ring overhanging the block by `-4vmin` so the rounded outer corners clip square (band still reaches the screen corners) while the `3vmin` inner radius shows — revealed almost at the very end via `finalFrameReveal`) — two-line `<h2>` (hero-H1 scale `text-[7vw]`; second line `headingFaded` at `opacity-40`, like the hero subtitle) + sub + a real `<a>` button, left-aligned (star sits to the right). Fades + rises in via `ctaReveal(p)` as the camera flies in. Content from `home.ts` `cta`. |

3D scenes (`src/components/3d/`, all R3F): `hero-gradient` (hero card bg +
cursor parallax), `particle-sphere`, `target-star`, and `flame-background`
(restyled to the shared "northern lights" **corner aurora** — alpha overlay
pinned at `z-30` behind the sphere + portfolio; ADR-0018). GLSL ported from the
source; DPR capped `[1,2]`. See [[tech-stack]].

**Performance (ADR-0017).** Five canvases mount at once, so two safeguards keep
scrolling smooth: every `<Canvas>` sizes its buffer from the **layout box**
(`resize={{ offsetSize: true, scroll: false }}`) so CSS-transform zoom can't
balloon the framebuffer; and each scene takes an `active` prop that gates its
`frameloop`, computed by `sceneVisibility(p)` in the timeline and committed (on
flag-flips only) by `ShowreelStage`, so off-screen scenes stop rendering.

## Conventions applied & exceptions

- **Tokens, not values** — colours/surfaces/fonts/radii from `globals.css`
  (ADR-0016). The bespoke proportional sizing is viewport-unit based
  (`vmin`/`vw`/`vh`) via arbitrary utilities, matching the original.
- **Spring-only DOM motion** — `ProgressTrigger` + `useSpring`, `Hover`, and a
  react-spring marquee loop. No CSS transitions/keyframes.
- **Text-engine exception** — the hero title and sphere block heading are
  scroll-scrubbed while pinned (where `TextEngine` viewport triggers can't
  reach), so they use the `ScrollLetters` helper driven by the global `p`. See
  ADR-0016 §4.
- **Server-first** — `HomeView` is server; interactivity is in `"use client"`
  leaves. Content flows from `src/data/mocks/home.ts` via props.
- **Assets** — `public/assets/showreel/` (images, videos, `model.glb`,
  `star.svg`); the parallax-grid cards pull from `public/assets/grid-images/`
  (distributed across the 14 items in `GRID_ITEMS`). The 14 grid tiles are built
  **once** in a `useMemo` (`gridTiles`) so the stage's `setVis` re-renders don't
  reconcile them and re-apply their static 3D transforms; only `opacity`
  (`s.gridOpacity`) stays live. The tiles are **plain** (no `will-change`/
  `backface-visibility`): the scroll-flicker was actually the rAF desync
  (ADR-0023), and layer-promoting tiles that the camera flight scales to many
  screens wide created enormous GPU layers that lagged badly on scroll-back. See
  ADR-0021.

## Follow-ups

- Compress the three portfolio videos (large MP4s).
- Remove `next.config.ts` `ignoreBuildErrors` once the `#do-not-modify` spring
  engine's `@types/react` 19 typing is fixed (needs sign-off — ADR-0016 §5).
- ~~Mobile tuning~~ **Done (ADR-0024).** The Showreel is now responsive for
  portrait phones + tablets via a single per-layout geometry table
  (`utils/showreel/geometry.ts`) delivered as `--sr-*` CSS vars + a numeric `geo`
  param, driven by `useShowreelLayout`. Carousel cards/headings retune for portrait,
  content blocks restack (hero bottom block, CTA), the header collapses to a
  spring-animated menu on phones, and the scroll track shortens on touch (`trackVh`).
  Desktop output is byte-identical. See [[design-system]] · [[hooks]] · [[utils]].
- Hero gradient still resizes its buffer during the phase-1 layout shrink
  (bounded, brief) — could be pinned to a fixed resolution if it ever shows up
  in a profile (ADR-0017).

## Related

[[new-page]] · [[design-system]] · [[animation-system]] · [[text-engine]] · [[tech-stack]]
