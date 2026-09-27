---
tags: [meta, changelog]
updated: 2026-06-27
---

# Changelog

Chronological log of notable changes to the project. Newest first.
This is a human-curated log — not a mirror of `git log`.

## 2026-06-29 (Responsive Showreel — tablet & portrait mobile)

- **Made the Showreel responsive for portrait phones + tablets** without touching
  the spring timeline choreography (ADR-0024). The whole experience is `vmin`-sized,
  which collapses to the narrow width in portrait; retuned only the constants that
  read wrong there.
- **New `utils/showreel/geometry.ts`** — single per-layout geometry table
  (`GEO[mobile|tablet|desktop]`, `DESKTOP_GEO`, shared constant `PERSP`): carousel
  card size/radius/fly-back, sphere heading + body scales, and physical `trackVh`.
- **New `hooks/use-showreel-layout.ts`** — SSR-safe orientation/width layout signal
  (shared debounced `useSyncExternalStore`, like `use-window-size`) that also writes
  the `--sr-*` CSS custom properties onto the document root.
- **Two delivery paths from one table:** CSS vars (`--sr-*`, defaulted in
  `globals.css :root`) for JSX-baked sizes + the timeline's pure-string builders (so
  the `p.to()` selectors stay stable — no teleport), and a numeric `geo` param for
  the sphere's two JS-math counter-scales (`blackScreenTransform`, `sphereSceneScale`).
- **Content blocks restacked** (plain responsive utilities, no timeline): hero bottom
  block stacks buttons + drops the social-proof row on phones; CTA copy widens; the
  **site header collapses its link row behind a spring-animated menu toggle** on
  phones (full bar from `sm` up).
- **Shorter scroll track on touch** (`trackVh` 1300/1700/2000) so mobile isn't a
  ~20-screen swipe — `p` is normalised over the track, so the timeline is unchanged.
- Desktop output is byte-identical (geo + CSS vars default to the prior values);
  verified via a Playwright screenshot matrix (iPhone / iPad / desktop) + `yarn build`.

## 2026-06-29 (Remove grid `will-change` — fixes scroll-back lag)

- **Removed `will-change:transform` + `backface-visibility` from the grid tiles.**
  They were added (a prior turn) to chase the flicker, but the flicker's real
  cause was the rAF desync (ADR-0023) — so these layer-promotions were doing
  nothing useful and instead pinned all 14 tiles to persistent GPU layers. During
  the camera flight the perspective scales tiles to many screens wide, so those
  became 14 enormous layers that re-composited on scroll-back = heavy lag (new
  since the flicker-chasing turns). Plain tiles + the synced rAF scroll smoothly
  without the cost.

## 2026-06-29 (THE scroll-flicker fix — unify Lenis + ticker on one rAF)

- **Found the actual root cause of the scroll flicker/jitter: two competing rAF
  loops.** Lenis advanced scroll on its own `requestAnimationFrame`, while the
  `ProgressTrigger` that reads scroll and scrubs the `p` spring ran on the shared
  animation ticker's rAF. Undefined per-frame order → the transforms landed a
  frame off from the scroll, flipping frame to frame = jitter. Fix: `ticker.ts`
  gained `subscribeToTickerDriver` (runs first each frame), and `ScrollLayout`
  now drives `lenis.raf()` through it — so every frame goes **Lenis → read scroll
  → update transforms** in one deterministic tick. Also set the Showreel's
  `ProgressTrigger` to `frameInterval={0}` so progress tracks 1:1 on
  120Hz/ProMotion (the default 10ms throttle ran it at ~60fps while Lenis scrolled
  at 120fps). This supersedes the earlier per-section flicker patches as the real
  cause. See ADR-0023 + [[animation-system]].

## 2026-06-28 (Grid perspective re-raster; crisp header-reveal timing)

- **Parallax-grid flicker — real cause: perspective re-rasterisation.** During the
  camera flight the perspective scales each grid tile up massively; without a
  promoted layer the browser re-rasterises the tile's clipped background at every
  new scale (a shimmer). Added `will-change:transform` to the (memoised) tiles so
  each is pinned to a fixed-resolution GPU texture that's simply scaled. Because
  the grid sits **behind the portfolio** in their overlapping scroll range
  (~2680–3100 virtual vh), that re-raster also dropped frames that read as flicker
  on the **portfolio** composited above it — so this fixes both. Trade-off: tiles
  are a hair softer at the extreme close-up (vs. flickering). Safe in the
  `preserve-3d` rig — the tiles are flat leaf images, nothing to flatten.
- **Header now fades in right as the loader vanishes.** The loader's exit overlay
  was an *overdamped* spring (`tension 70/friction 22`) whose opacity tail settled
  long after it looked gone, so `onRest` (which flips `revealed`) fired late,
  leaving a gap. Switched the overlay to a **duration** config (650ms
  `easeInOutCubic`) so `onRest` fires exactly when the overlay is gone and the nav
  fades in immediately after.

## 2026-06-28 (Header reveal — the actual bug: opacity on a fixed-child wrapper)

- **Root cause found.** The header "appeared instantly" not because of timing but
  because `RevealOnLoad` animated `opacity` on a **wrapper `<div>`** whose only
  child — `SiteHeader`'s `<header>` — is `position: fixed`. Opacity on a wrapper
  around an out-of-flow fixed child is composited separately and **snaps** rather
  than animating frame-by-frame; it was simply masked by the loader before, so
  the snap was never visible. **Fix:** the reveal now lives inside `SiteHeader`
  and animates the **`<nav>` bar** (a normal-flow element) directly — opacity +
  a small `translateY`, gated on `useLoaderStore.revealed`, `easeInOutCubic`
  700ms. Removed the `RevealOnLoad` wrapper from the header in `home.tsx`.
  (`RevealOnLoad` and its `gate` prop remain for non-fixed regions.)

## 2026-06-28 (Header reveal really fixed — gate on loader-fully-lifted)

- **Header still looked instant** after the 700ms-delay attempt: `easeOutCubic` is
  front-loaded, so most of the fade happened *behind* the still-opaque loader and
  the header was ~90% visible by the time the overlay cleared. Real fix: added a
  `revealed` flag to `useLoaderStore`, set at the loader's exit `onRest` (i.e.
  once it has **fully** lifted). `RevealOnLoad` gained a `gate` prop
  (`"ready" | "revealed"`); the header now uses `gate="revealed"` so its fade
  starts from 0 exactly when the loader vanishes, on a non-front-loaded
  `easeInOutCubic` (800ms) with an explicit `from:{opacity:0}`. Result: stage
  uncovers first, then the header clearly fades in.

## 2026-06-28 (Grid flicker — memoise tiles; smoother header reveal)

- **Parallax-grid flicker fixed at the source.** The horizontal cards stopped
  flickering once `Portfolio` was `React.memo`-wrapped (the stage's `setVis`
  re-renders no longer reach it) — but the 14 grid tiles are **inline** in
  `ShowreelStage`, so every `setVis` flip still reconciled them and re-applied
  their static 3D transforms, flashing the tiles as you cross scene boundaries.
  The tiles are now built once in a `useMemo` (`gridTiles`, keyed on the stable
  `s.gridOpacity`), so a re-render leaves them untouched; only `opacity` stays
  live. Reverted the earlier inner-layer wrapper — a single `backface-visibility`
  div per tile is enough now that the elements are stable. (Same principle as
  ADR-0021, extended from interpolations to elements.)
- **Header reveal no longer pops.** The header fade ran *behind* the still-opaque
  loader (both started the instant `ready` flipped), so it finished before the
  loader cleared and looked instant. Its `RevealOnLoad` delay is now **700ms** so
  the `easeOutCubic` fade plays on the already-revealed page.

## 2026-06-28 (Fix hydration mismatch + horizontal-card flicker)

- **Fixed the hydration error.** `ShowreelStage`'s react-spring `animated.div`
  values don't match between SSR and the client's first frame, so React was
  discarding the server tree and **regenerating the whole page on the client** (a
  flash, and a source of instability). The stage now **mounts client-only**
  (`mounted` flag → returns `null` until `useEffect` fires); SSR + first client
  render both emit an empty `<main>`, so there's no mismatch. It still mounts
  during the loader, so warm-up is unaffected. See ADR-0022. *(Note: a stale
  `.next` dev cache was also serving the old loader markup — a clean rebuild /
  dev restart is needed to pick up these fixes.)*
- **Portfolio (horizontal video cards) no longer flicker on the pan.** Each card
  and its `<video>` are pinned to a stable GPU layer (`translateZ(0)` +
  `backface-visibility:hidden`) so the horizontal track-pan is a pure composite,
  not a per-frame re-raster. `Portfolio` is now `React.memo`-wrapped too, so the
  stage's visibility re-renders don't reconcile its videos.

## 2026-06-28 (Fix parallax-grid flicker on the camera flight)

- **Parallax-grid tiles no longer flicker during the camera-flight.** As the
  camera flies toward them, each tile's apparent size grows, and the browser was
  re-rasterising its CSS `background-image` at every new scale (the on-scroll
  shimmer). Fix: the background now lives on an **inner flat layer** that's
  promoted to its own GPU surface (`will-change-transform`,
  `backface-visibility:hidden`, `translateZ(0)`) — rasterised once, then smoothly
  GPU-scaled. The **outer** tile keeps its `translateZ`/`scale` 3D position with
  **no** `will-change` (which could flatten its depth and break the flight). The
  target block was left alone — its solid `bg-ink` + WebGL canvas don't re-raster.

## 2026-06-28 (Fix page-reveal hitch — don't fade the WebGL stage)

- **The stage no longer fades in on loader exit.** Previously `RevealOnLoad`
  animated the whole `ShowreelStage` (which contains the live WebGL canvases)
  `opacity 0→1` over 900ms — so at the reveal the compositor re-blended the entire
  WebGL surface every frame *while the canvases were drawing*, causing a ~1s hitch
  right as the loader lifted. Now `home.tsx` renders the stage in a plain `<main>`
  at full opacity: it warms up **under** the opaque loader (shaders compile, first
  frames draw during the intro) and is simply **uncovered** as the loader lifts.
  Only the lightweight **header** still fades ([[home-page]]). The loader's own
  lift + cross-fade remains the reveal transition.

## 2026-06-28 (Hero gradient performance)

- **Hero mesh-gradient shader optimised** (`components/3d/hero-gradient.tsx`) to
  fix the lingering hero lag. Its fragment shader is heavy (2× simplex noise + a
  dozen gaussian blobs + film grain + saturation/vignette) and was running every
  frame at `dpr={[1,2]}` — 4× the pixels on a retina display. Now: **`dpr={1}`**
  (a smooth gradient hides the lower resolution — visually identical, ~4× fewer
  fragment invocations) and **`frameloop="demand"` throttled to ~36fps** via a
  self-driven `invalidate` loop (the gradient breathes slowly, so the cap is
  invisible). `u_time` now derives from `performance.now()` so it stays correct
  under demand rendering. Mouse-ease bumped `0.08→0.12` to compensate for the
  lower frame rate. Other scenes unchanged. See [[tech-stack]].
- Further levers if needed (not taken — they'd alter the look): the three
  `backdrop-blur` glass elements in the hero bottom block composite every frame
  over the animated shader; and the particle sphere still renders at `dpr={[2,3]}`.

## 2026-06-28 (Loader pared back, scroll-glitch fix, smoother reveal)

- **Fixed the parallax-grid "teleport" glitch.** Scrolling through the
  camera-flight section flashed every grid image to a wrong position for a frame
  on each scroll-through. Cause: the stage's visibility `setVis` re-render
  re-created the inline `p.to(...)` interpolations, so react-spring briefly reset
  the camera-rig. All stage interpolations are now memoised (`useMemo`, the `s`
  object), `Portfolio` memoises its transforms, and the spring-owning scenes
  (`HeroCard`, `SphereCard`, `CtaBlock`, `Marquee`) are `React.memo`-wrapped. See
  ADR-0021. This also removes wasted re-renders during the intro reveal.
- **Loader pared back to just the mark.** Removed the wordmark, tagline and the
  count-up percentage — the [[home-page|IntroLoader]] is now only the spinning
  chrome star centred over the bloom. The violet bloom is **opacity-only** now (no
  per-frame scale), so its 80px blur layer is rasterised once instead of
  re-blurred every frame — this is what made the **loader-exit lag** go away.
  `IntroLoader` no longer takes `brand`/`tagline` props.
- **Header/stage reveal is smoother.** [[components/ui|RevealOnLoad]] now fades in
  on a long `easeOutCubic` duration ease (900ms) instead of a quick spring, so the
  header eases up as the loader lifts instead of popping in.

## 2026-06-28 (Build green, immersive loader, brand metadata, cleanup)

- **Production build + lint now pass (`yarn build`, `yarn lint`).** Root cause:
  React 19's stricter JSX types made `animated[tag]`'s `children` resolve to
  `never` across the animation engine (`animated-var-text-tag`, `spring`,
  `spring-trigger`, `hover`, `progress-trigger`). Switched those render sites
  from JSX to `createElement` (identical output, sidesteps the union-children
  inference) and fixed `spring.tsx`'s `tag?: keyof Tags` → `tag?: Tags`. See
  ADR-0019. This was an authorised, type-only touch of the otherwise
  #do-not-modify `springs/` engine.
- **`react-hooks/immutability` disabled for `components/3d/**`** in
  `eslint.config.mjs` — the override ADR-0016 / [[tech-stack]] already documented
  but which was missing from the config. Unblocks the per-frame `useFrame`
  uniform/scene mutations in `target-star.tsx`.
- **Workspace-root build warning fixed** — `turbopack.root` pinned to the app
  dir in `next.config.ts` (a stray `package-lock.json` in the parent folder made
  Next infer the wrong root).
- **Immersive intro loader redesign** ([[home-page]]) — the flat spinning star +
  thin bar is replaced by: a violet `--card-violet` bloom that swells behind the
  chrome star, the star scaling in from blur with a violet halo + accelerating
  exit, a staggered wordmark/tagline, and a footer hairline paired with a
  count-up percentage; the whole stack lifts away on exit. Still spring-only,
  reduced-motion-aware. New token `--loader-glow` in `globals.css`.
- **Brand metadata, favicon & OpenGraph wired to "Superconscious".** `site.ts`
  rewritten (was stale "Flourish with Laurin" placeholder). Favicon, Apple icon,
  OG and Twitter images are now **generated from the brand star + copy** via Next
  file conventions (`app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`,
  `app/twitter-image.tsx`) using `next/og`; `app/manifest.ts` replaces the static
  `manifest.json`. Brand mark geometry centralised in `src/lib/brand.ts`. See
  ADR-0020 and [[seo-metadata]].
- **Performance: portfolio videos deferred.** The three case-study clips (~105 MB
  total) were eagerly downloaded on first load via `autoPlay` with default
  `preload`. They now mount only when the portfolio enters its scroll range (new
  `portfolio` flag in `sceneVisibility`), cutting initial network weight
  dramatically with no visual change.
- **Removed ~33 MB of dead assets** left over from a previous project
  ("Flourish with Laurin"): `public/assets/{hero,problem,stats,why-laurin,`
  `character-flaw,audience,fonts}`, eight social/legacy SVGs in `assets/icons`,
  two stale `showreel` images, and the superseded static favicon set
  (`favicon*`, `android-icon-*`, `apple-icon-180x180.png`, `open-graph.png`,
  `browserconfig.xml`, `manifest.json`, `app/favicon.ico`). Unused **code** that
  is part of the documented starter catalog (skeletons, `is-bot`/`lvh`/`coords`,
  `api-client`, the `ui/` primitives, and the unused `springs/` catalog
  components) was **kept** intentionally — removing it would break the design-
  system docs.

## 2026-06-28 (Install 3D dependencies — dev server fix)

- **Installed the 3D/WebGL stack** that the Showreel components already imported
  but that was missing from `package.json`: `three` `^0.185.0`,
  `@react-three/fiber` `^9.6.1`, `@react-three/drei` `^10.7.7`, and
  `@types/three` `^0.185.0` (dev). The components in `src/components/3d/` (flame
  background, hero gradient, particle sphere, chrome-star GLB via `useGLTF`) and
  the [[tech-stack]] doc already referenced these — the deps just hadn't been
  added, so the dev server returned HTTP 500 (`Module not found:
  '@react-three/drei'`). No components were missing; only the packages.
- Known non-blocking warnings after the fix: a hydration mismatch on the Showreel
  grid-image transform (spring-computed `style` differs slightly server vs.
  client) and a `THREE.Clock` deprecation notice from drei. Neither blocks the
  dev server.

## 2026-06-28 (Final block — solid white margin band)

- **Final block now has a solid white margin band** — a `4vmin` white area
  (transparent centre, content shows through) so there's a real white *area*
  between the screen edge and the content, matching the hero stage's `p-[4vmin]`
  white margin (not a thin outline/ring). **Rounded inner corners** like the hero
  card: rendered as a `border-[8vmin]` ring overhanging the block by `-4vmin` so
  the rounded outer corners clip square (band still reaches the screen corners)
  while the `3vmin` inner radius shows. Revealed almost at the very end via
  `finalFrameReveal`. The `--metal-frame` token is gone (only `--card-violet`
  remains as a raw inline token).

## 2026-06-28 (Final-block frame → continuous gradient band)

- **Final-block frame is now a continuous light/silver band** (the hero card's
  `--metal-frame` gradient rendered as a **gradient ring via `mask` +
  `mask-composite: exclude`**, so it reads as one piece — not a per-edge
  `border-image` or a thin CSS stroke) with **no shadow**. Still revealed almost
  at the very end (`finalFrameReveal`). Replaced the `--frame-glow` outline.

## 2026-06-28 (Drop metallic effect, soft white outline on final block)

- **Removed the hero card's metallic sheen** entirely (it read poorly) — the card
  is just the image again (the cursor-tilt 3D parallax stays).
- **Final block outline is now a soft luminous white ring** (`border-white` +
  `--frame-glow` box-shadow) instead of the metal `border-image` line; still
  revealed almost at the very end via `finalFrameReveal`. The `--metal-frame` /
  `--metal-sheen-*` tokens were removed.

## 2026-06-28 (Stronger hero sheen, metal frame on final block)

- **Hero metallic material reworked** — dropped the brushed-metal frame (+ inset
  wrapper); the specular **sheen is now much stronger** (`mix-blend-screen`, a
  brighter `--metal-sheen-hi` core + new `--metal-sheen-soft` halo, wider streak
  with more tilt travel).
- **Final block gets the white metal frame** — the `--metal-frame` look now lives
  on the target/CTA block as an inset `border-image` ring that **reveals almost at
  the very end** of the camera flight (`finalFrameReveal`, `p7` 0.8→1).

## 2026-06-28 (Hero card metallic material)

- **Hero image card now has a metallic material** — a brushed-chrome **frame**
  (`--metal-frame`, shown as a ~0.5vmin gap around an inset content wrapper) plus
  a **specular sheen** overlay (`--metal-sheen-hi`, `mix-blend-overlay`) whose
  streak angle/position are driven by the card's existing cursor-tilt spring
  (spring-only, no CSS keyframes). New raw tokens in `globals.css`.

## 2026-06-28 (Grid images, catalist logo icons, button centering)

- **Parallax grid images** — the camera-flight grid cards now use the 9 images in
  `public/assets/grid-images/` instead of the single `green-gradient.png`,
  distributed across the 14 items deterministically (SSR-stable) in
  `GRID_ITEMS`/`GridItem.image` (`timeline.ts`); `ShowreelStage` reads `item.image`.
- **Catalist logo chip** — the orange gradient chip is now a **white tile with a
  brand sparkle icon** (inline SVG) and no glow/shadow. The unused `--cc-logo` /
  `--cc-logo-glow` tokens were removed.
- **Catalist light card copy** is now light (`text-cc-light-muted`/`-ink` →
  `text-paper`/`text-white`) so it reads on the dark lower half of the card.
- **Button text vertical centering** — buttons use `inline-flex items-center
  justify-center` + `leading-none` so the label sits dead-centre (hero, carousel
  CTA, final CTA).

## 2026-06-28 (Hero image colour fix, bigger/shorter portfolio cards)

- **Hero image is in colour** — removed the `grayscale` filter on the hero card's
  front image (`stone.jpg`), which had been rendering it black-and-white. The
  flipped/**carousel face is back to `hero-image-2.png`** (green) — reverting the
  previous turn's `stone.jpg` swap (only the front image needed the colour fix).
- **Portfolio cards shorter** so they clear the centred header — section padding
  `pt-[4.5vmin]/pb-[5vmin]` → `pt-[9vmin]/pb-[8vmin]`.
- **Portfolio titles** sized to the section H1 scale (`text-[6vmin]`→`text-[7vw]`,
  matching hero / final block) and shortened to **one word** (`Archin`, `Zumar`,
  `Nova`) in `home.ts`.

## 2026-06-28 (Portfolio strip simplified, white header tiles, CTA two-line)

- **Hero carousel face recoloured** — the flipped/carousel image of the hero card
  now uses the purple `stone.jpg` (same as the hero state) instead of the dark
  green-silhouette `hero-image-2.png`, which read as monochrome in the carousel.
- **Header link tiles are white** (`--nav-item` `#f4f4f4`→`#ffffff`); logo tile
  still the slightly-darker grey.
- **Final CTA** — heading breaks onto two lines with the second (`all limits`)
  semi-transparent (`opacity-40`, like the hero subtitle); `home.ts` `cta` gains
  `headingFaded`. Sub copy narrowed (`max-w-[34vw]`→`26vw`).
- **Portfolio strip simplified** — removed the "Featured Works" header + "See All"
  pill (and the `headingLead`/`headingAccent`/`seeAll` content + props). Cards now
  carry **one tag line** (`client · year · discipline`), the duplicate **watermark
  was dropped** (removed from `PortfolioItem`), and the title is `capitalize`d.

## 2026-06-28 (Greyscale header, bigger type, portfolio H1 titles)

- **Header is now greyscale** — the warm nav tints (`--nav-surface`/`--nav-item`/
  `--nav-logo`/`--nav-cta-ink`) are neutral greys (R=G=B); logo tile still a touch
  darker than the link tiles.
- **Bigger buttons everywhere except the header** — hero, carousel CTA, final
  `CtaBlock`, and portfolio "See All" all bumped up in padding + font.
- **Sphere supporting copy** is opaque (dropped the per-paragraph `opacity-80`),
  wider (`max-w-[36vmin]`→`52vmin`) and larger (`1.9vmin`→`2.4vmin`).
- **Portfolio cards restructured** — the case **title** now uses the hero-H1
  treatment (`text-[6vmin] font-normal leading-[0.95] tracking-[-0.03em]`) at the
  bottom; the **discipline** moved up under a **tags row** that now carries both
  client and year (`client · year`).
- **Final CTA block** — the eyebrow tag removed (and dropped from `home.ts` `cta`
  + `CtaBlockProps`); heading sized to the hero-H1 scale (`text-[7vw]`).

## 2026-06-28 (Header redesign + global button radius)

- **Header is now an opaque, flat, segmented bar** (was a translucent blurred
  pill). Each item is its own tile sitting 1px from the bar edges and from its
  neighbours (the base `--nav-surface` shows through as hairlines): a square logo
  tile (`--nav-logo`, a touch darker), **equal-width** link tiles (`--nav-item`,
  `w-[88px]`), and a black **CTA** (`--nav-cta`/`--nav-cta-ink`) on the right.
  Shadow + backdrop-blur removed; 8px corners. New tokens in `globals.css`; CTA
  content `home.ts` `headerCta`, passed through `home.tsx` → `SiteHeader`.
- **Global 8px button radius** — added `--radius-btn: 8px` (`rounded-btn`) and
  applied it to every button/pill (hero buttons, carousel CTA, final `CtaBlock`,
  portfolio "See All", header tiles). **Arrow glyphs removed** from all of them
  (hero "Start Journey", carousel CTA, `CtaBlock`, and the `seeAll` copy).
- **Carousel CTA** now appears the instant the hero card snaps strictly vertical
  (`carouselCtaReveal` keyed off `phase1` completion, not gp 0.18), its
  description line removed, and it sits `bottom-[2vmin]` — mirroring the header's
  `top-[2vmin]` offset.
- **Hero tweaks** — divider returned to padded (inset) width; left description
  narrowed (`max-w-xl`→`max-w-md`) and right widened (`max-w-sm`→`max-w-lg`) so
  the right copy wraps to two lines.

## 2026-06-28 (Hero polish + carousel CTA + crisper dispersion)

- **Hero copy fades on scroll** without layout shift — `heroContentFade(p)` drives
  the opacity of the headline (`<header>`) and the bottom content block (both
  absolutely positioned, so pure opacity → no reflow). The "think ahead" line is
  more translucent (`opacity-70`→`opacity-40`), and the description paragraphs no
  longer hard-break (`\n` removed in `home.ts`, `whitespace-pre-line` dropped).
- **Bottom-block divider runs full-bleed** under the card (`-mx-[40px]` cancels
  the 40px padding).
- **Hero image card slightly shorter** in the hero state (`heroSliderHeight`
  `70vh`→`62vh`); still grows to fully cover the carousel face.
- **"Browse our templates" reads over the green carousel face** — lifted from
  `z-[2]` to `z-[7]` (above the image card) + `drop-shadow-lg`.
- **Carousel CTA** added under the 4-card carousel (the second block):
  `carouselCtaReveal(p)` fades it in/out with the carousel; content in `home.ts`
  `carouselCta`, rendered as a sibling overlay in `ShowreelStage`.
- **Crisper sphere dispersion.** The fragment shader now reads `uDisperse` and
  tightens each sprite + pulls back the additive bloom as particles scatter
  (`tighten`/`bloomK`), so the scattering shell reads sharp instead of "soapy".
  `uDisperse=0` is unchanged → the intact sphere looks identical.

## 2026-06-27 (Sphere block — supporting copy + sharper particles)

- **Added supporting copy** to the open sphere scene — two paragraphs
  (bottom-left, fade/rise in via `sphereBodyReveal`, after the headings land).
  Copy in `home.ts` `sphere.body`; threaded through `SphereCard`.
- **Crisper particles.** `ParticleSphere` DPR `[1,2]`→`[2,3]`: the scene is
  CSS-scaled up (`sphereScale` ~1.5×) over a layout-sized buffer, so the lower
  cap read soft. The canvas is render-gated, so the extra fragments only cost
  while the sphere is on-screen.

## 2026-06-27 (Hero image card — floats over heading + cursor tilt)

- **The hero image card now floats *over* the headline** (`z-[6]`, above the
  top-left `<h1>`) inside a `[perspective:1400px]` parent, with a **cursor-driven
  3D tilt**: a dedicated `useSpring` ({rx, ry}) eased toward the pointer (window
  `pointermove`), applied as `rotateX/rotateY` and faded out by `heroTiltFade(p)`
  as the card flips into the carousel. Scroll pan/grow behaviour unchanged.

## 2026-06-27 (Sphere card carousel face — violet + chrome)

- **Card 4's carousel face** got product chrome like cards 2/3 — a "Neural Core"
  glass pill + url (top), a heading (bottom) — over a new **violet** mesh
  gradient (was the green-gradient image). New token `--card-violet`; chrome copy
  in `home.ts` `sphere.cardLabel/cardUrl/cardHeading`. The face is rendered
  inside `SphereCard` (clipped, behind the star mask) so it's covered as the
  sphere opens; the central star logo is unchanged.

## 2026-06-27 (CTA block on the final scene)

- **Added a call-to-action** overlaid on the final chrome-star block
  (`views/home/cta-block.tsx`): eyebrow + `<h2>` + sub + a real `<a>` button,
  left-aligned over the violet shader (the star sits right). Fades + rises in via
  `ctaReveal(p)` as the camera arrives. Copy lives in `home.ts` `cta` (added
  `cta` to `ShowreelContent`).

## 2026-06-27 (Sphere choreography + aurora colour)

- **Sphere grows while the star logo shrinks.** In the open sphere state the
  particle shell scales **up** (`sphereScale` → 1.5) to fill the frame while the
  white star logo shrinks back (`sphereLogoTransform` − `sphereCollapse`), gp
  0.52→0.72. (The growth also pushes the canvas past the viewport so dispersed
  particles aren't clipped by the canvas edge.)
- **Particles dissolve into the portfolio transition.** A `uDisperse` uniform in
  `particle-sphere` gently pushes each particle outward (radial + small jitter)
  and fades alpha to ~0, driven by `sphereDisperse(p)` — a long, soft ramp
  (vScroll PS-400→PS+200) overlapping the collapse, so it reads as a dissolve,
  not a hard burst at the scene seam. `disperse` is passed as a **live getter**
  (`() => sphereDisperse(p.get())`) read each frame, so the sphere **reassembles
  on scroll-back** (an unobserved `p.to()` interpolation went stale).
- **Aurora recoloured** from green/teal to violet (`iAuroraDeep`/`iAuroraBright`).

## 2026-06-27 (Art-direction pass 2 — corrections) · ADR-0018 (amended)

Follow-up fixes after review of the first pass:

- **Hero image fully covers the card** — bumped the counter-rotated image to
  `scale(1.65)` and the slider to `66×46vmin`, so no hero shader / black strip
  shows at the rotated card's edges.
- **"Browse our templates" centred** on the card and delayed (animates in late
  in phase 1, after the card has mostly formed).
- **Black backdrop under the sphere restored** — the masked panel is `bg-black`
  again (the first pass made it transparent, which removed the black under the
  sphere and exposed the green card-4 face). Black now covers the green card.
- **Background is a corner "northern lights" shader, not a full-screen mesh.**
  `FlameBackground` was restyled to aurora colours and now renders as an **alpha
  overlay** (clear centre, glowing corners) at `z-30` — above the black sphere
  panel, below the portfolio/nav — so the aurora wraps the screen corners while
  the sphere/cards show through. Shared + pinned across sphere and portfolio.

## 2026-06-27 (Showreel art-direction pass — hero, sphere, backgrounds) · ADR-0018

Ten fixes across the hero, sphere and portfolio scenes:

- **Hero shader no longer jitters** while the card rotates — the hero
  `HeroGradient` debounces its resize so the buffer holds during the
  spring-animated card shrink instead of reallocating each frame.
- **Hero cursor parallax strengthened** (wider influence + snappier easing) so
  the interactive gradient is clearly felt again.
- **Hero headline centred** and resized/tracked to match the marquee
  (`text-[7vw] tracking-[-0.03em]`); it no longer overflows the card.
- **Soft text reveal.** `ScrollLetters` dropped its per-letter `overflow-hidden`
  hard clip (hero + sphere headings); the hero's diagonal `TITLE_MASK` removed.
- **Hero image covers the card.** The slider is centred and grows past the card
  edges, so the final carousel face is the image alone — no hero shader peeking.
- **"Browse our templates"** now animates to completion (the stagger/window were
  retuned so every letter reaches its end state within phase 1).
- **Stronger particle-sphere bloom** — larger sprites + boosted halo/pole glow.
- **Unified, pinned aurora** across the sphere and portfolio: a single fixed
  `HeroGradient` replaces the flame backdrop and the portfolio's fly-in aurora;
  the sphere's masked panel is transparent so the same shader shows through. See
  [[decisions-log]] ADR-0018. `FlameBackground` is retired (file kept, unmounted).

## 2026-06-27 (Showreel WebGL perf — scroll freeze + general lag) · ADR-0017

- **Scroll freeze on the camera-flight fixed.** R3F sized each canvas from its
  *transform-aware* bounding rect, so zooming a scene via CSS 3D transforms
  ballooned its drawing buffer (the hero gradient reached **53 MP**) and
  reallocated it on every Lenis scroll event → the page froze approaching the
  final block. Every `<Canvas>` now uses `resize={{ offsetSize: true, scroll:
  false }}` — buffers track the layout box, constant through the flight. The
  final star is also crisper (full layout resolution, not the shrunk rect).
- **Off-screen 3D scenes now pause.** All five canvases used to run their
  `useFrame` loop every frame regardless of visibility. `timeline.ts` gained
  `sceneVisibility(p)`; `ShowreelStage` commits it to state on flag-flips and
  threads an `active` prop to each scene, toggling `frameloop`. At any scroll
  position only the on-screen scenes render. See [[decisions-log]] ADR-0017.

## 2026-06-27 (Target-star block — chrome star + violet shader restored)

- **Final block rendered blank.** `TargetStar` (the chrome star + violet
  mesh-gradient we fly into) showed only the black `bg-ink` panel — no shader,
  no model. Its root wrapper set `style={{ position: "relative" }}`, which
  overrode the `absolute` from its `className="absolute inset-0"`. With the
  wrapper no longer absolutely positioned, `inset-0` stopped stretching it: the
  div took block width (full) but `auto` height, so the inner `<Canvas>`
  (`height: 100%`) resolved against an auto-height parent and collapsed to a
  **0-px-tall drawing buffer** → nothing drew. Removed the inline `position`
  so the wrapper fills its parent like `flame-background`/`hero-gradient` do.

## 2026-06-26 (Showreel fixes — flight framing, 4th card, hero cursor, hydration)

- **Camera-flight framing fixed.** The parallax grid + target block were nested
  inside the `carousel` (inheriting its `rotateY(-270°)`/flyback), so the final
  zoom-into-star sat wrong in space. Moved them to be siblings of the carousel
  inside `camera-rig` — matching the original markup — so the
  portfolio-horizontal → target-zoom sequence reads true.
- **4th carousel face restored.** `SphereCard`'s wrapper had no background, so
  the sphere card read as invisible during the flip (only 3 cards showed). Gave
  it the green-gradient card face (the original `.card` base); it fades as the
  star mask opens.
- **Hero cursor interactivity restored.** `hero-gradient`'s mouse parallax used
  R3F pointer events, which never hit the clip-space quad. Switched to a window
  `pointermove` listener mapped to canvas pixels (as the original did).
- **Hydration mismatch fixed.** `SphereCard` read `vmin` from `useWindowSize`
  (0 on server, real on client) in its counter-scales. Gated behind a mounted
  flag so the first client render matches the server.

## 2026-06-26 (Showreel rebuild — replaces the Laurin home + theme)

- **Home page fully replaced** with a 1:1 rebuild of the vanilla scroll-driven
  WebGL **Showreel** ("Prompts that think ahead"). The Laurin sections
  (`views/home/*`) and `components/3d/scroll-logo*` were removed; `views/home.tsx`
  now composes `SiteHeader` + `ShowreelStage`. See [[home-page]] and
  [[decisions-log]] ADR-0016.
- **Theme swapped light → dark.** `globals.css` tokens rewritten for the Showreel
  palette (ink/pf-card/cc-search/paper/glass surfaces); fonts swapped to **Zen
  Kaku Gothic New** (`--font-sans`) + **Marck Script** (`--font-script`),
  replacing Onest/Playfair/Neue Plak/Google Sans Flex in `layout.tsx`. Radii are
  now viewport-proportional (`--radius-card: 3vmin`, …). See [[design-system]],
  [[tech-stack]].
- **Three.js / React Three Fiber now in active use.** Four R3F scenes added in
  `components/3d/`: `flame-background` (fixed aurora shader), `hero-gradient`
  (mesh-gradient + mouse), `particle-sphere` (34k-point shader sphere),
  `target-star` (GLB chrome star + procedural env-map). GLSL ported verbatim
  from the source.
- **Single-spring scroll timeline.** `utils/showreel/timeline.ts` is a pure port
  of the original `updateScroll()` — every animated value is a function of one
  normalised scroll progress `p`, scrubbed by a single `ProgressTrigger` →
  imperative `useSpring`, consumed via `p.to(selector)`.
- **Assets** copied to `public/assets/showreel/` (images, 3 portfolio videos,
  `model.glb`, `star.svg`).
- **Tooling:** `eslint.config.mjs` relaxes `react-hooks/immutability` for
  `components/3d/**` (R3F mutates three.js objects each frame by design);
  `next.config.ts` sets `typescript.ignoreBuildErrors` to work around a
  **pre-existing** `@types/react` 19 typing quirk in the `#do-not-modify` spring
  engine (app code stays `tsc`-clean). Both documented in ADR-0016.
- `yarn lint` clean; `yarn build` green; `/` prerenders + serves 200.

## 2026-06-20 (why-laurin polish + logo)

- **Why-Laurin gallery tuned** — **3 cards** (real photos `1/2/3.webp`, 789×612,
  provided; old `card-*.webp` removed), cards **~15% wider** (`lg:w-[42rem]`,
  fixed `h-[58vh]`), the **progress knob removed** (clean line only), and the
  card bottom is now a **progressive glass** (`.card-glass` in `globals.css`
  `@layer components` — three stacked masked `backdrop-blur` layers so the blur
  ramps up toward the text, with `-webkit-` mask prefixes). Track shortened to
  `220vh`. Fixed the card height (`h-[58vh]` instead of an unresolved `h-full`).
- **Header logo replaced** — the supplied square `logo.svg` (viewBox `32×32`)
  replaces the old narrow one (viewBox `21×32`) that rendered shrunk.
- Hero/why images confirmed `object-fit: cover` (already were).

## 2026-06-20 (why-laurin horizontal scroll)

- **Why-Laurin → horizontal-scroll gallery** (replicates the supplied design).
  The section pins (`h-[320vh]` track, sticky `h-screen` stage) and vertical
  scroll progress (off the track, via `ProgressTrigger` → imperative `useSpring`)
  **translates the card row sideways** — ~2 of the 4 cards show at once, the rest
  reveal on scroll. A **progress line + frosted knob** next to the title tracks
  position. Cards are full-bleed `object-cover` images with a **frosted
  (`backdrop-blur`) bottom text panel** (number, title, copy). Row width is
  measured (`scrollWidth − innerWidth`, re-measured on resize) to bound the
  translate. `WhyLaurin` is now a Client Component.

## 2026-06-20 (hero video)

- **Hero billboard now plays the real video** — `public/assets/hero/hero.mp4`
  (provided) replaces the poster-only placeholder. `homeContent.hero.video.src`
  → the mp4 and the `<source>` type → `video/mp4`; poster + autoplay/muted/loop/
  playsInline + scroll parallax unchanged. (Note: the file is ~18 MB / 4K —
  worth compressing for production.)

## 2026-06-20 (circle coverage)

- **Problem circle fully covers + earlier reframe** — bumped the circle's max
  scale (`×130`) so the round shape always covers the whole viewport with margin
  (no top-corner gaps, any viewport height); the reframe now starts revealing at
  ~66% (`remap(progress, 0.62, 0.86)`) while the circle is still finishing, so
  content layers onto the white without waiting for full completion.

## 2026-06-20 (cards, loader, circle polish)

- **Why-Laurin → 4 cards** — added two more differentiators (`card-3`/`card-4`
  assets, downscaled WebP from the Figma source). Cards relaid out image-forward:
  `aspect-[4/5]`, **full-bleed** `object-cover` (never shrunk), a soft
  top/bottom gradient instead of the heavy frosted panel, number + title + copy
  over it. 2×2 on `md`.
- **"Who this is for" eyebrow removed** from the Audience section (intro
  paragraph leads straight into the card grid).
- **Problem circle reworked** — now pinned **below the viewport** (`top-[185vh]`,
  centred) and **scaling the whole time** from the start, but eased
  (`pow(remap(progress,0,0.72), 2.7)`) so it stays hidden/low while the headline
  reads, then the rounded top rises to cover the screen. Reframe staggers in
  after (`0.74→0.94`).
- **Loader polished** — added a **top progress line** (full width, `2rem` inset,
  fill width driven by the counter); the bottom-left label is now a clean
  uppercase tracked brand (dropped the cramped grey caption + the `caption` prop).

## 2026-06-20 (gutter + scene re-pin)

- **Content gutter → 128px on laptop** — `Container` side padding is now
  `px-6 md:px-10 lg:px-32` (24 → 40 → **128px**), and `--container-content`
  raised to `120rem` so wide laptops aren't over-margined by the cap (the gutter
  is the real control). Was a too-narrow 40px before.
- **Problem scene re-pinned (circle at the bottom)** — sticky `h-screen` stage on
  a `h-[240vh]` track. The headline animates **word-by-word on scroll progress**
  (`TextEngine` `mode="progress"` off its own element, `start="top bottom"`
  `end="center center"`). A **circle pinned to the viewport bottom**
  (`bottom-[12vh]`) scales up once you scroll just past the text, into a full
  white cover; the "That's not a character flaw" reframe then **appears on top of
  the white**, element-by-element. Circle + reframe driven by the track's
  `ProgressTrigger` via imperative `useSpring` (`remap` per phase).

## 2026-06-20 (scene un-pinned)

- **Problem scene de-pinned** — dropped the sticky pin entirely; the scene is now
  two normal-flow sections that read as one continuous scroll (no scroll stops):
  (1) a dark section whose headline un-blurs word-by-word as the text scrolls up
  into centre (`TextEngine` off its own element), then a white dot that sits
  centred once the headline clears and **scales into a circle wipe** (`SpringTrigger`
  scrub, `start="center center"` `end="center top"`); (2) the white reframe
  section, content revealing with an `Inview`/`TextReveal` stagger as it scrolls
  in behind the wipe. No `ProgressTrigger`/imperative driver, no sticky.
- **Inline pills removed** from the "You've tried managing it" headline — it's
  now plain text. `problem` data simplified to `{ text }`; `ProblemLine`
  interface deleted. (Pill assets under `public/assets/problem/` now unused.)

## 2026-06-20 (scene timing)

- **Problem scene retimed** — the headline reveal now triggers off **its own
  element** (`start="top bottom"` `end="center center"`), so words un-blur only
  as the text actually scrolls up into view (was firing off the whole track, far
  too early). Track shortened 300vh → **200vh** so "That's not a character flaw"
  appears much sooner — right after the circle fills. The reframe now reveals
  **element-by-element with a stagger** (eyebrow → headline → portrait → subhead),
  each derived from one `rp` spring via `.to()` with a per-element offset, and
  finishes with a short reading dwell before the section ends.

## 2026-06-20 (scene restructure)

- **Problem → reframe merged into one pinned scene** — `CharacterFlaw` is gone as
  a standalone section; its "That's not a character flaw" content now lives
  *inside* the `Problem` sticky panel. Driven off one `ProgressTrigger` (the
  track) with imperative `useSpring` curves: the headline reveals word-by-word as
  the panel **enters** (done by the time it pins), then the circle scales to a
  white cover just after pin, then the reframe un-blurs in **on top of the
  circle** — all in the same section. Track 300vh.
- **"Who this is for" relayouted** — the horizontal hover-list is replaced by a
  3-column **card grid** (reusing `ProofCard`): each state is a bold, clearly
  readable title with a serif-italic index and supporting copy; cards reveal with
  a blur+opacity stagger and tint on hover. `Audience` is a Server Component again
  (no client hover-index state).
- Deleted `src/views/home/character-flaw.tsx`.

## 2026-06-20 (refinements)

- **Problem heading centred** — `TextEngine` lays words out in a flex row, so
  `text-center` alone didn't centre; added `flex flex-wrap justify-center`.
- **Loader padding fixed** — number + label now sit in one bottom-aligned flex
  row with matching `px`/`pb` gutters (was clipped + misaligned).
- **Entrance more immersive** — `Appear` defaults softened and deepened (blur
  16, y 24, gentler spring); hero stagger widened (header → heading → subhead →
  CTA → byline → video).
- **Card hover restyled** — no scale/lift; a soft **colour-tint** shift instead,
  via a new client `src/views/home/proof-card.tsx`. The tint is an
  **opacity-animated overlay** (a number spring) rather than animating
  `backgroundColor` — the latter mismatches on SSR hydration, like `boxShadow`
  (ADR-0015).
- **Circle-wipe gap closed** — the dark Problem track shrank (340vh → 240vh) and
  the circle now expands only in the last leg (`start="center top"`), so it fills
  white right at the end; Character-Flaw overlaps the track tail (`-mt-[48vh]`)
  so its content rises onto the white circle as it completes (no empty-white
  scroll).

## 2026-06-20 (later) — Home page animation & scroll choreography pass

- **Intro loader + gated entrance** — new `Loader` (`src/views/home/loader.tsx`):
  a counter (00→100) bottom-right + label left, locks scroll, then wipes up to
  reveal the page. A Zustand flag (`src/hooks/use-loader.ts`) gates the
  header/hero entrance via the new `Appear` primitive
  (`src/components/ui/appear.tsx`), so text/CTA/byline/video stagger in (blur +
  opacity) only once the loader lifts. A 4.5s safety timeout guarantees scroll
  is never left locked.
- **All reveals are now blur + opacity** — `TextReveal` switched to a word-by-word
  blur de-sweep; `Inview` reveals across hero/proof/character-flaw/why-laurin/cta
  animate `filter: blur()` + opacity.
- **Pinned "Problem" scroll scene** — the dark "You've tried managing it" section
  is now a tall sticky track (`h-[340vh]`). While pinned, scroll progress
  (measured off the track via `SpringTrigger`/`TextEngine` `trigger`) drives a
  word-by-word blur→clear reveal with the inline image pills de-blurring among
  the words, then the bottom circle scales into a full-screen white wipe that
  hands off seamlessly to the (white) Character-Flaw section.
- **Hero image parallax + premium card hovers** — the hero video billboard gets a
  scroll `SpringTrigger` parallax; proof cards get a smooth spring lift + scale on
  hover (`Hover`).
- **Display line-heights raised** — `--text-display`/`--text-headline` line-height
  → 1.12 so the italic-serif descenders are no longer clipped.
- **Fixed `interpolate()` transform bug** (`src/utils/math.ts`) — the util
  rebuilt CSS transform functions malformed (`scale(42()`), so `SpringTrigger`
  scrub never moved transforms. Reconstruction corrected; scrub-driven
  `scale()`/`translateY()` now work. Single-function transforms only (the util
  doesn't handle multi-function strings — compose via nested elements).
- **react-spring gotcha avoided** — animating `boxShadow` through a
  fully-transparent `rgba(...,0)` throws *"arity of each output must be equal"*
  and also mismatches on SSR hydration; the card hover is transform-only as a
  result. See [[decisions-log]] ADR-0015.

## 2026-06-20

- **Home page built — "Flourish with Laurin" landing (Figma "Concept 2", node
  231:177)** — the empty home view now ships a full, responsive marketing page.
  Sections live in `src/views/home/` (feature-co-located): `SiteHeader`, `Hero`,
  `ProofGrid` (bento stats), `Problem` (dark scroll-reveal interlude),
  `CharacterFlaw`, `Audience` (interactive hover list), `CtaBand`, `WhyLaurin`
  (image cards), `SiteFooter`. Content is placeholder data in
  `src/data/mocks/home.ts`, fed through props. New design-system primitives in
  `src/components/ui/`: `Container`, `Eyebrow`, `IconArrow`, `ArrowButton`,
  `TextReveal`. All motion is spring-based (`Inview` / `Spring` / `Hover` +
  `TextEngine`); no CSS transitions. Section assets under
  `public/assets/{hero,stats,problem,character-flaw,audience,why-laurin,icons}/`
  (downscaled to WebP). `yarn lint` + `yarn build` clean; verified at 1440 and
  390 widths. See [[components/ui]], [[home-page]], and [[decisions-log]] ADR-0014.
- **Second font + design tokens added** — `Playfair Display` (italic accent face,
  e.g. "*to sugarcoat it*") loaded via `next/font/google` alongside Onest, bound
  to `--font-serif`. New tokens in `globals.css`: brand colours (`--ink`,
  `--surface`, `--muted`, `--hairline`, `--nav-surface`, `--chip`), a `--text-*`
  type scale (`display`/`headline`/`title`/`lead`/`body`), `--radius-*`, and
  `--container-content`. The Figma display/UI fonts (Neue Plak, Google Sans Flex)
  are commercial / not on Google Fonts — substituted with Onest pending design
  review (flagged in ADR-0014). See [[tech-stack]] and [[design-system]].
- **`globals.css` body + dark-mode change** — the empty-starter `body` rule
  (flex-centred, fixed `100vh`) was replaced with normal document flow
  (`min-height: 100vh`, `overflow-x: hidden`) so a long page scrolls. The
  `prefers-color-scheme: dark` override was removed — the brand page is a fixed
  light design and inverting it read as broken. See [[decisions-log]] ADR-0014.

## 2026-06-07

- **Fixed `<Inview>` standalone reveal + spring resize gating** — `<Inview>`
  never animated unless an external `trigger` ref was passed. The JSX `ref`
  callback wrote `inViewRef.current = node`, but that tuple slot is a *callback
  ref* (`setNode`), so the element was never observed and the `node` stayed
  `null`. Now calls `setInViewNode(node)`. This was also a build-breaking type
  error. Additionally, `<Inview>`, `<Spring>`, and `<Hover>` tracked `width` as a
  hook dependency but never passed it to `isMobileDisabled` — fixed by passing the
  tracked `width`, restoring resize re-evaluation and clearing the
  `react-hooks/exhaustive-deps` warnings. `yarn build` and `yarn lint` are now
  clean. See [[decisions-log]] ADR-0013 and [[components/animation-springs]].

## 2026-06-05

- **Home view emptied** — removed the animation showcase (`src/views/home-showcase.tsx`
  deleted) and reduced `HomeView` to an empty `<main>`. The home view is now the
  blank starting point for new work. Documented the convention — *if the project
  is empty and no other instructions are provided, start developing in the home
  view on route `/`* — in [[ai-agent-guide]] and [[new-page]].

## 2026-05-23

- **README — setup + Vercel deploy steps added** — *Getting started* expanded
  into a four-step flow (clone the template → delete bundled `.git` →
  initialise your own GitHub repo → install & run), with a macOS hint for
  revealing the hidden `.git` folder (`⇧ + ⌘ + .`). Added a *🚀 Deploy to
  Vercel* section covering the CLI flow (`vercel` / `vercel --prod`) and the
  dashboard import path, plus an `env pull` pointer to
  [[environment-variables]].
- **README rewritten to lead with the AI workflow** — root `README.md`
  reorganised so the AI usage guide is the first section: how the three
  `.claude/settings.json` hooks (`SessionStart`, `UserPromptSubmit`, `Stop`)
  enforce the vault workflow automatically, how to write a good request
  against this convention layer, and a cost-expectations note recommending
  **Claude Max (5×)** as the minimum plan (the vault-fan-out + hook
  re-injection on every turn is token-intensive by design). Technical
  *Getting started* and the existing AI-agents entry-point pointer stay
  below.

## 2026-05-22

- **Styling-placement convention added** — to stop `globals.css` accumulating
  hundreds of component-specific classes, styling now follows a strict
  placement order: one-offs are Tailwind utilities, repeated patterns become
  **React components** (not `@layer components` classes), and `@layer
  components` is reserved strictly for pseudo-elements and third-party
  overrides. `globals.css` stays bounded — `@import`, tokens, base resets only.
  No CSS Modules. Codified in [[decisions-log]] ADR-0012; [[design-system]]
  (new *Where a style goes* section) and [[component-conventions]] updated.
- **Semantic-HTML / SEO-markup convention added** — new [[html-semantics]]
  rulebook: landmarks, one `<h1>` + heading outline, native elements over
  `div`s, forms/images/ARIA, JSON-LD over microdata, a `data-*` convention, and
  passing a semantic `tag` to animation components. Codified as AGENTS.md hard
  rule #10; cross-linked from [[component-conventions]] and [[new-page]]. Fixed
  the demo (`home-showcase.tsx`) to a single `<h1>` to follow it.
- **API layer added** — a convention for reaching external services.
  `app/api/<resource>/route.ts` Route Handlers own their logic and read secret
  env vars directly (safe — route files never reach the browser). New: `zod`
  dependency; `src/env.ts` (validated env, public/server split); `src/lib/api/`
  (`handle` wrapper + `ApiError` + `{ data }`/`{ error }` envelope);
  `src/lib/api-client.ts` (typed same-origin fetch); example
  `app/api/contact/route.ts`. Codified as AGENTS.md hard rule #9. See
  [[decisions-log]] ADR-0011 and [[api-architecture]].

## 2026-05-21

- **Asset convention added** — site content assets (images, videos) now live
  under `public/assets/<section>/`, one folder per section; meta/PWA/SEO assets
  stay at the `public/` root. Documented in [[folder-structure]],
  [[component-conventions]], and the [[new-page]] playbook; `public/assets/`
  created with a `.gitkeep`.
- **SEO & performance hardening** — a broad pass on the starter. **SEO:** new
  `src/lib/site.ts` config (single source of truth, fed by `NEXT_PUBLIC_SITE_URL`);
  `metadataBase` is now always set (relative OG/canonical URLs resolve);
  `themeColor` moved to a `viewport` export; added `app/robots.ts`,
  `app/sitemap.ts`, and an `Organization`+`WebSite` JSON-LD helper; OG image
  dimensions corrected to match the asset; dead `keywords`/`other` tags dropped.
  **Performance:** populated `next.config.ts` (`removeConsole` in prod,
  AVIF/WebP, `next/image` breakpoints aligned to the grid, `poweredByHeader:
  false`); fixed a `requestAnimationFrame` leak in `ScrollLayout` (Lenis loop
  never cancelled on unmount); `HomeView` is now a Server Component with the
  animation demo split into the `HomeShowcase` client leaf; added
  `<ReducedMotion>` (honours `prefers-reduced-motion` via react-spring's global
  `skipAnimation`); removed a per-frame `console.log` from the demo; added
  `app/loading.tsx` / `error.tsx` / `not-found.tsx`. See [[decisions-log]]
  ADR-0010, [[seo-metadata]], and [[environment-variables]].
- **Animation engine — lint pass** — cleared all 13 pre-existing ESLint problems
  in the engine (2 errors + 11 warnings), an authorized engine edit (ADR-0009).
  `isMobileDisabled` now takes an optional `viewportWidth` argument, so the
  `active` memos in `<Spring>` / `<Hover>` / `<Inview>` / the trigger hooks
  depend on it genuinely. Added missing `disableOnMobile` effect deps; fixed a
  `trigger.current`-in-cleanup hazard in `<Hover>`; ref-stabilised `<Handle>`'s
  transition effects. **API change:** `useProgressTrigger` now returns `progress`
  as a `RefObject<number>` (read `.current`) instead of a render-time ref read —
  no consumer was affected (`<ProgressTrigger>` discards the return).
- **Animation engine — performance refactor** — fixed load issues that scaled
  with the number of animated components. Added `src/lib/animation/ticker.ts`, a
  single reference-counted `requestAnimationFrame` loop; `useLoop` (and all loop
  hooks) now subscribe to it instead of each starting its own rAF. `useWindowWidth`
  / `Height` / `Size` now share one debounced `resize` listener via a
  `useSyncExternalStore` store (the `debounceDelay` param was dropped — unused).
  `useDynamicInView` rewritten without the per-render `Proxy`/observer churn.
  Fixed a stale-closure bug in `useLoop`. `mode="forward"` scroll listeners made
  `passive`. This was an **authorized edit to `#do-not-modify` engine files** —
  hard rule #2 amended. See [[decisions-log]] ADR-0009 and [[animation-system]].
- **`spring-text-engine` updated** — bumped `^0.1.3` → `^0.1.5` (latest). The
  public API, types, and dependencies are unchanged between these versions
  (verified) — an internal-only patch bump, no code changes required.
- **Adaptive scaling grid added** — a root-font-size scaling system landed in
  `src/components/common/grid/` (`<AdaptiveGrid>` + `useAdaptiveGrid` hook +
  `grid.config.ts`), with `vw` media queries in `globals.css` for scale-down.
  It was dropped into `common/` as a `styled-components` system; ported to the
  project stack — config-driven TS + CSS-only Tailwind, no `styled-components`.
  The unused dropped files (`colors.ts`, `fonts.ts`, `utils.ts`, `index.ts`,
  the `styled-components` `grid.tsx`) were removed. Mounted via `<AdaptiveGrid>`
  in the root layout. See [[components/common]] and [[decisions-log]] ADR-0008.
- **Vault created** — `obsidian/` Obsidian vault initialised as the project's
  second brain. Architecture, frontend, and workflow docs populated. See [[decisions-log]] ADR-0001.
- **Root README rewritten** — replaced `create-next-app` boilerplate with a real
  project README that points into this vault.
- **`generic-layout-prompt.md` moved** — relocated from repo root to
  `obsidian/workflows/` as [[generic-layout-prompt]].
- **Navigation convention resolved** — standard `next/link` confirmed; the unbuilt
  `<AnimLink>` / `useAnimRouter()` convention dropped. See [[decisions-log]] ADR-0005.
- **Docs consolidated into the vault** — `project-specs.md` deleted (decomposed into
  vault notes + new [[environment-variables]]); `text-engine-docs.md` moved in as
  [[text-engine-reference]]. `AGENTS.md` rewritten as a thin shim; `.cursorrules`
  repointed to `@AGENTS.md`. The vault is now the single source of truth.
  See [[decisions-log]] ADR-0006.
- **Vault renamed & restructured** — vault folder `getlayers.io/` → `obsidian/`;
  number prefixes dropped from section folders (`00-meta` → `meta`, etc.). Project
  name standardised to **`next16-claude-starter`** across docs and `package.json`.
- **Components linked to docs** — every file in `src/components/` now carries a
  `// 📖 Docs:` pointer comment to its catalog note, so agents can jump from code
  to docs and back.
- **Vault workflow automated** — added `.claude/settings.json` with `SessionStart`,
  `UserPromptSubmit`, and `Stop` hooks that make agents read the vault first,
  follow the relevant guide, and update docs after every change — with no manual
  reminder. See [[decisions-log]] ADR-0007 and [[ai-agent-guide]].
- **Cookie component replaced** — the `react-cookie-consent`-based `cookie.tsx`
  was replaced by an in-house `Cookie/` component (banner + category preferences
  modal + Zustand store). `react-cookie-consent` removed from dependencies. The
  component shipped using `styled-components` + an external design system; it was
  ported to the project stack — Tailwind v4 tokens and `@react-spring/web` motion.
  Mounted via `<LazyCookie>`. See [[components/common]].
- **Fixed TextEngine spring type mismatch** — the `mode="once"` heading in
  `views/home.tsx` mixed `lineIn={{ y: 0 }}` (number) with `lineOut={{ y: "100%" }}`
  (string), throwing *"Cannot animate between _AnimatedString and _AnimatedValue"*.
  Changed to `y: "0%"`. The buggy pattern in [[text-engine]] / [[text-engine-reference]]
  examples was corrected and a type-matching gotcha note added.

## Project baseline (git history)

| Commit | Description |
|--------|-------------|
| `94b0870` | feat: update starter |
| `5280ef2` | fix: linter errors & build |
| `b2b84e6` | initial — `next16-claude-starter` scaffold |

> [!note]
> The starter shipped with: Next.js 16.2, React 19.2, Tailwind v4, `@react-spring/web`,
> `spring-text-engine`, Lenis, and Zustand. See [[tech-stack]] for the current state.
