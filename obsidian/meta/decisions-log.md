---
tags: [meta, decision]
updated: 2026-06-27
---

# Decisions Log (ADRs)

Architecture Decision Records. Each entry captures a choice, its context, and its
consequences. Use [[templates/adr-note]] for new entries. Newest first.

---

## ADR-0024 — Responsive Showreel geometry (one table, CSS-var + numeric-`geo` delivery)

- **Status:** Accepted
- **Date:** 2026-06-29

**Context.** The Showreel is sized in `vmin` (= `min(vw, vh)`). On landscape
desktop `vmin` tracks height and the layout fills the screen; on a **portrait
phone** `vmin` collapses to the narrow width, so the carousel cards float tiny,
the sphere headings overflow, and the fixed-px content blocks (hero bottom block,
header) don't fit. Mobile was a known follow-up (see [[home-page]]). Targets:
portrait phones (~390–430px) and tablets (portrait + landscape); desktop must not
regress.

**Decision.**
1. **One geometry source.** `utils/showreel/geometry.ts` exports a `GEO[layout]`
   table (`mobile`/`tablet`/`desktop`, + `DESKTOP_GEO`) of the few constants that
   read wrong in portrait — carousel card size, radius, fly-back, sphere heading
   scales + body size, and the physical `trackVh`. **`PERSP` stays constant
   across layouts** (it is baked into the JS counter-scale math, the grid depth
   scale, AND the `[perspective:1500px]` CSS — one number, never threaded). The
   camera-flight, grid, and target block are viewport-relative already and are
   left untouched.
2. **Two delivery mechanisms, no mirrored sources.** (a) **CSS custom properties**
   (`--sr-*`) for the JSX-baked sizes and the timeline's pure-string builders
   (`card1Width`, `carouselTransform`, …): the values live in `globals.css :root`
   as the desktop/SSR default and are overridden on `document.documentElement` by
   `useShowreelLayout`. Driving geometry through CSS vars keeps the `p.to(...)`
   selectors **referentially stable** (the browser swaps the value live — no
   react-spring detach/reattach, so no one-frame "teleport"). (b) A numeric `geo`
   param (default `DESKTOP_GEO`) for the two JS-math islands that compute a
   *unitless* counter-scale from a live `vmin`-in-px (`blackScreenTransform`,
   `sphereSceneScale`), which CSS `calc` cannot express. Both mechanisms read the
   one table, so the card CSS and the sphere counter-scale can never desync.
3. **Layout signal.** `hooks/use-showreel-layout.ts` (modelled on
   `use-window-size.ts`: shared debounced store + `useSyncExternalStore`, SSR-safe)
   buckets by orientation + width (landscape → `desktop`; portrait < 640 →
   `mobile`; portrait ≤ 1024 → `tablet`) and writes the `--sr-*` vars.
4. **Content blocks** (not part of the timeline) restack with plain responsive
   utilities: the hero bottom block stacks its buttons and drops the social-proof
   row on `max-sm`; the CTA copy widens; the header collapses its link row behind
   a spring-animated menu toggle on phones.
5. **Shorter track on touch.** `trackVh` drops to 1300 (mobile) / 1700 (tablet) so
   the experience isn't a ~20-screen swipe marathon. `p` is normalised over the
   track by `ProgressTrigger`, so this changes only how much swiping traverses the
   **unchanged** timeline.

**Consequences.** Desktop output is byte-identical (every `geo` defaults to
desktop, every `--sr-*` defaults to the prior literal). Portrait gets genuinely
larger cards, fitting headings, and a usable header. The sphere scene's
corner-heading framing during its mid-rotation is the same on mobile and desktop
(inherent to the timeline, not a portrait bug). New per-layout values live in one
table — keep `globals.css :root` `--sr-*` in sync with `geometry.ts` `DESKTOP`.
See [[home-page]], [[design-system]], [[hooks]], [[utils]].

---

## ADR-0023 — Lenis runs on the shared ticker (one rAF), not its own loop

- **Status:** Accepted
- **Date:** 2026-06-29

**Context.** Smooth-scrolled, scroll-driven scenes (the portfolio horizontal pan,
the camera-flight grid) flickered/jittered on scroll. Root cause: **two competing
`requestAnimationFrame` loops.** Lenis advanced scroll on its *own* rAF
(`ScrollLayout`), while the `ProgressTrigger` that reads scroll
(`getBoundingClientRect`) and scrubs the `p` spring runs on the shared
[[animation-system|ticker]]'s rAF. Their per-frame order is undefined, so the
transforms landed a frame off from the scroll position — and the offset flipped
frame to frame, which reads as jitter. Compounded on 120Hz/ProMotion displays by
`ProgressTrigger`'s default `frameInterval={10}` (progress updated ~60fps while
Lenis scrolled at 120fps).

**Decision.**
1. **One loop.** `ticker.ts` gained `subscribeToTickerDriver(cb)` — a per-frame
   "driver" slot that runs **before** all (throttled) subscribers, unthrottled.
   `ScrollLayout` drives `lenis.raf(time)` through it instead of a private rAF.
   Order each frame is now deterministic: **Lenis advances → subscribers read the
   fresh scroll → transforms update**, all in the same tick.
2. The Showreel's `ProgressTrigger` uses **`frameInterval={0}`** so progress
   tracks scroll 1:1 on high-refresh displays.

**Consequences.** Scroll and the transforms it drives are frame-synced — no
jitter. The ticker no longer fully idles (Lenis is a permanent driver), the same
as before when Lenis ran its own always-on rAF — net one loop instead of two.
`ticker.ts` remains the supported extension point (not #do-not-modify). Note: a
residual single-frame gap from react-spring's own flush loop is *consistent* (not
jitter); revisit `Globals.frameLoop='demand'` only if that ever surfaces.

---

## ADR-0022 — The Showreel stage mounts client-only

- **Status:** Accepted
- **Date:** 2026-06-28

**Context.** `ShowreelStage` is a wall of react-spring `animated.div`s whose
`style` carries interpolated transforms/opacities. react-spring's SSR output for
those values does not match the client's first frame (e.g. `opacity:"0"` vs `0`,
full-precision vs rounded transforms), so React reported a **hydration mismatch**
and **discarded the entire server tree to re-render on the client** — a visible
flash, plus instability that surfaced as scroll flicker. The stage is also fully
hidden behind the intro loader at first paint, so its SSR HTML is never seen.

**Decision.** Mount the stage **client-only**: `ShowreelStage` keeps a `mounted`
flag (`useState(false)` + `useEffect(() => setMounted(true), [])`) and returns
`null` until mounted. SSR and the first client render both emit an empty
`<main>` (they match → no hydration mismatch); the effect then renders the live
stage on the next tick — still during the loader, so warm-up is unaffected.

**Consequences.** No hydration mismatch, no whole-tree client regeneration. The
loader (`IntroLoader`) and `SiteHeader` still SSR normally. Trade-off: the
showreel's headings aren't in the SSR HTML — acceptable for a heavy interactive
WebGL experience (brand/title/description are carried by the metadata + JSON-LD,
and Google renders client JS). If a future page needs SSR'd hero copy, render
that copy outside the spring-animated subtree. See [[home-page]].

---

## ADR-0021 — Stable spring interpolations across visibility re-renders

- **Status:** Accepted
- **Date:** 2026-06-28

**Context.** `ShowreelStage` scrubs one spring `p` and also keeps a small
`SceneVisibility` React state that flips a handful of times per scroll (to gate
each canvas's `frameloop`). Every `setVis` re-render re-ran the inline
`p.to(selector)` calls in the JSX, creating **fresh** `Interpolation` instances.
react-spring detaches the old value and attaches the new one, and for one frame
the element falls back to its base style — so the whole **camera-rig** (and every
parallax grid image under it) visibly "teleported" and snapped back on each
scroll-through. The same pattern caused the marquee to jump and added needless
work during the loader-exit reveal.

**Decision.** Interpolations must be **identity-stable** across re-renders:
- In `ShowreelStage`, all `p.to(...)` selectors are built once in a
  `useMemo(… , [p])` (the `s` object) and the JSX references those.
- `Portfolio` memoises its two `p.to(...)` transforms (`[p, maxPan]`).
- Child scenes that own springs (`HeroCard`, `SphereCard`, `CtaBlock`, `Marquee`)
  are wrapped in `React.memo` so a stage visibility flip doesn't re-render them
  and re-create their springs.

**Consequences.** No more teleport/jump on scroll; fewer re-renders during the
intro reveal (smoother). New rule of thumb: **never create `p.to(...)` inline in
a component that also holds re-rendering state** — memoise it or isolate it
behind `memo`. See [[home-page]] · [[animation-system]].

---

## ADR-0020 — Brand-derived generated icons & share images

- **Status:** Accepted
- **Date:** 2026-06-28

**Context.** The favicon, Apple icon, and OG/Twitter images were a static set of
PNGs (`favicon-*`, `android-icon-*`, `apple-icon-180x180.png`, `open-graph.png`)
left over from a previous project, wired by hand in `generate-page-metadata.ts`
and `manifest.json`. They no longer matched the brand ("Superconscious") and had
to be regenerated by hand whenever copy changed.

**Decision.** Generate every brand image from a single source of truth — the
8-point star geometry in `src/lib/brand.ts` plus `siteConfig` copy — via Next's
metadata **file conventions** rendered with `next/og`:
`app/icon.tsx`, `app/apple-icon.tsx`, `app/opengraph-image.tsx`,
`app/twitter-image.tsx` (re-exports OG), and `app/manifest.ts`.
`generate-page-metadata.ts` no longer hand-wires `icons` / `openGraph.images` /
`twitter.images` — Next injects them from the file conventions. The static PNG
set and `manifest.json` were deleted.

**Consequences.** Brand imagery updates automatically with the star or the copy;
no binary assets to maintain. Trade-off: images render on demand via `next/og`
(cached) instead of being plain static files, and `/favicon.ico` is no longer
served (modern browsers use the `<link rel="icon">` PNG from `app/icon.tsx`). See
[[seo-metadata]].

---

## ADR-0019 — React 19 JSX `children: never` fix in the animation engine

- **Status:** Accepted
- **Date:** 2026-06-28

**Context.** Under React 19's stricter JSX types, rendering the dynamic
`const Tag = animated[tag] as ElementType` proxy as `<Tag>{children}</Tag>` makes
TypeScript intersect `children` across the `ElementType` union down to `never`,
so `yarn build` failed type-checking in five `springs/` files
(`animated-var-text-tag`, `spring`, `spring-trigger`, `hover`, `progress-trigger`).
`spring.tsx` additionally typed `tag?: keyof Tags` (wrong — `Tags` is a string
union) behind a `@ts-expect-error`. `components/3d/**` also failed lint because
the `react-hooks/immutability` override documented in ADR-0016 was missing from
`eslint.config.mjs`.

**Decision.** Render those sites with `createElement(Tag, props, children)`
instead of JSX — byte-identical output, but it avoids the union-children
inference. Fixed `spring.tsx`'s `tag` type to `Tags` and dropped the stale
`@ts-expect-error`. Added the missing `react-hooks/immutability: off` override
for `src/components/3d/**`. The `springs/` engine is normally #do-not-modify;
this was an explicitly authorised, **type-only, behaviour-preserving** change to
unblock the build.

**Consequences.** `yarn build` + `yarn lint` pass on React 19.2 / Next 16.2. No
runtime behaviour change. Future engine edits remain gated on sign-off.

---

## ADR-0018 — Hero recomposition + one pinned aurora for sphere & portfolio

- **Status:** Accepted
- **Date:** 2026-06-27

**Context.** A round of art-direction fixes on the showreel: the hero headline
sat top-left and overflowed; its shader jittered while the card rotated (a
side-effect of ADR-0017's layout-box sizing — the hero card's width/height are
spring-animated, so the buffer reallocated every frame); the scroll text was
hard-clipped; the hero image didn't fully cover the card; and the sphere and
portfolio showed two *different* backgrounds (a flame shader vs. a fly-in
aurora) instead of one continuous backdrop.

**Decision.**
1. **One pinned aurora background.** The portfolio's own fly-in aurora is
   removed and the `Portfolio` section dropped its background, so both blocks
   scroll over one stationary shader driven by `auroraOpacity(p)`.
   > **Amended (same day).** The first cut used a full-screen `HeroGradient`
   > mesh at `z-[-1]` with a *transparent* sphere panel. That broke the reveal
   > (no black under the sphere, the green card-4 face showed through) and the
   > shader read as a centre-bright wash, not corners. Corrected: the sphere
   > panel stays **`bg-black`** (the dark backdrop + it hides the green card);
   > the shared shader is **`FlameBackground` restyled to an aurora**
   > (violet — `iAuroraDeep`/`iAuroraBright`, dark centre, glow at the corners;
   > recoloured from the initial green/teal). It renders as an
   > **alpha overlay** (`transparent` material, clear centre) mounted
   > `fixed … z-30` — above the black sphere panel so the corners paint over it,
   > below the portfolio (`z-40`) and nav (`z-100`). `HeroGradient` is back to
   > hero-only; `FlameBackground` is **not** retired.
2. **Centre the hero.** The headline moved from an absolutely-positioned
   top-left block to a centred flex layer; its size/tracking now match the
   marquee (`text-[7vw] tracking-[-0.03em]`). The image slider is centred and
   grows to slightly exceed the card so it fully covers it (no shader edge) in
   the carousel state.
3. **Soft text reveal.** `ScrollLetters` dropped the per-letter `overflow-hidden`
   (the hard guillotine on scroll) — the existing per-letter blur + opacity give
   a soft exit/entrance. The hero's diagonal `TITLE_MASK` was removed too.
4. **Stabilise the hero shader.** The hero `HeroGradient` adds
   `resize={{ … debounce: { resize: 200 } }}` so its buffer holds during the
   spring-animated card shrink instead of reallocating each frame (kills the
   jitter from ADR-0017 on the one canvas whose *layout* animates).

**Consequences.** Continuous background across the sphere → portfolio stretch;
a cleaner, centred hero. The particle sphere's bloom was also boosted and the
cursor parallax strengthened (tuning, not architecture). Dead timeline exports
(`flameOpacity`, `pfAuroraTransform`) and the `portfolio` visibility flag were
removed. The additive sphere particles now composite over the aurora rather than
black — watch for wash-out on the aurora's bright hotspot.

---

## ADR-0017 — Showreel WebGL performance: layout-box buffers + render-loop gating

- **Status:** Accepted
- **Date:** 2026-06-27

**Context.** The showreel (ADR-0016) mounts **five** R3F canvases at once
(flame bg, hero gradient, particle sphere, target star, portfolio aurora) and
zooms them via CSS 3D transforms. Two pathologies made scrolling — especially
the camera-flight into the final chrome-star block — freeze, and the page lag
generally:

1. **Ballooning drawing buffers.** R3F sizes each canvas from
   `react-use-measure`, which (by default) reads `getBoundingClientRect()` — a
   *transform-aware* rect. As the carousel/flight scales a canvas to several
   screens, its buffer grew to match (the hero gradient hit **10726×5005 ≈
   53 MP**), and R3F re-measured on every scroll event (Lenis fires these
   continuously), reallocating the framebuffer each frame → the scroll freeze.
2. **All five canvases rendering every frame.** Each scene runs its own
   `useFrame` loop continuously even while off-screen (incl. the 34k-particle
   sphere and the chrome GLB + env map), so any given scroll position paid for
   ~5× the GPU work actually visible.

**Decision.**
1. **Size buffers from the layout box, not the transformed rect.** Every
   `<Canvas>` gets `resize={{ offsetSize: true, scroll: false }}`. `offsetSize`
   makes react-use-measure use `offsetWidth/offsetHeight` (transform-independent);
   `scroll: false` drops the per-scroll-event re-measure. Buffers are now
   constant through the transform-only flight → no per-frame reallocation, and
   the final star is *crisper* (full layout resolution instead of the shrunk
   projected rect).
2. **Gate each render loop by scroll position.** `timeline.ts` exports
   `sceneVisibility(p)` → one boolean per canvas, derived from the same
   thresholds as the transforms. `ShowreelStage` recomputes it in the
   `ProgressTrigger` `onChange` and commits to state *only when a flag flips*
   (a handful of re-renders per full scroll, not per frame). Each flag threads to
   its component as `active`, toggling `frameloop={active ? "always" : "never"}`.
   Off-screen scenes stop rendering; a paused scene resumes correctly when it
   re-enters view (verified: the target star mounts paused and renders on
   approach).

**Why not.** IntersectionObserver was rejected — the scenes are positioned by 3D
transforms (and the flame bg is `fixed inset-0`), so IO visibility is unreliable
here; the scroll progress `p` is the deterministic signal. Sharing one WebGL
context across scenes would be a larger rewrite and is out of scope.

**Consequences.** Smooth scroll through the flight; far less GPU work per frame.
`active` defaults to `true`, so the 3D components remain usable standalone. The
hero gradient still resizes during its phase-1 layout shrink (bounded, brief).
Also fixed in the same pass: the target-star wrapper's inline
`position: relative` overrode its `absolute inset-0`, collapsing the canvas to a
0-px-tall buffer (the block rendered blank) — see [[changelog]].

---

## ADR-0016 — Showreel rebuild: theme swap, R3F scenes, single-spring timeline

- **Status:** Accepted
- **Date:** 2026-06-26

**Context.** The brief was to rebuild a vanilla, scroll-driven WebGL showreel
("Prompts that think ahead") 1:1 on this starter's conventions. The source is a
single 2200vh scroll experience: a morphing hero, a 3D CSS carousel of 4 cards,
a 34k-particle Three.js sphere behind an expanding star mask, a fixed portfolio
with horizontal video scroll, and a camera-rig flight through a parallax grid to
a chrome-star GLB — plus four WebGL shaders and a marquee. It conflicts with the
existing light "Laurin" home and several conventions.

**Decision.**
1. **Replace the home page + global theme.** `views/home.tsx` becomes the
   Showreel; all `views/home/*` Laurin sections and `components/3d/scroll-logo*`
   were deleted. `globals.css` tokens were rewritten dark; fonts swapped to **Zen
   Kaku Gothic New** + **Marck Script**. (Chosen over a separate `/showreel`
   route — the brief was to rebuild *this* project.)
2. **WebGL via React Three Fiber, not raw canvas.** `three` + `@react-three/fiber`
   + `@react-three/drei` are in the stack, so each shader/3D scene is an R3F
   component in `components/3d/` driving uniforms in `useFrame`. This keeps DOM
   motion spring-only (ADR-0002 intact) — canvas rendering is orthogonal.
3. **One spring drives the whole timeline.** `utils/showreel/timeline.ts` ports
   the original `updateScroll()` as pure functions of a single normalised scroll
   progress `p` (0→1). A single `ProgressTrigger` off the tall track scrubs `p`
   (imperative `useSpring`, `immediate`); every element reads `p.to(selector)`.
   This is the "one spring, many `.to()`" recipe from [[home-page]] scaled up,
   and sidesteps the `utils/math.ts` single-transform `interpolate` limitation.
4. **Pinned-text exception.** The hero title and the "Beyond all limits" block
   heading are scroll-scrubbed while their card is pinned, where the
   viewport-triggered `TextEngine` cannot advance. They use a small
   `ScrollLetters` helper driven by the global `p` spring instead. This is a
   deliberate, documented exception to the "all text via spring-text-engine"
   rule (the rule still holds for normal-flow reveals). The marquee replaces the
   source's CSS `@keyframes` with a react-spring loop.
5. **Tooling workarounds.** (a) `eslint.config.mjs` disables
   `react-hooks/immutability` for `components/3d/**` — R3F *requires* mutating
   live three.js objects (uniforms, `scene.environment`, transforms) every frame.
   (b) `next.config.ts` sets `typescript.ignoreBuildErrors` to get past a
   **pre-existing** `@types/react` 19 "children expects never" error in the
   `#do-not-modify` spring engine (`animated-var-text-tag.tsx` et al.). App code
   stays `tsc --noEmit`-clean; this masks only the protected engine.

**Consequences.** The project is dark-themed and Showreel-only; re-adding a light
theme means restoring the token block + fonts. GPU cost is real (four canvases) —
DPR is capped `[1,2]` and particle count is a prop (default 34k). **Follow-ups:**
remove `ignoreBuildErrors` once the engine types are fixed with sign-off
(per ADR-0009 the engine is protected); compress the portfolio videos (large).

Post-build fixes (same day): grid + target block moved out of the `carousel` into
the `camera-rig` frame (they were inheriting the carousel rotation — the flight
sat wrong); the sphere card gained the green-gradient face (it was an invisible
4th card during the flip); hero-gradient parallax switched from R3F pointer
events to a window `pointermove` listener (the clip-space quad never raycast-hit);
and `SphereCard` gates its `vmin` counter-scales behind a mount flag to fix a
hydration mismatch.

---

## ADR-0015 — Home page scroll choreography (loader, pinned scene, scrub fix)

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The home page needed a premium motion layer: a gated intro loader,
blur-based reveals, hero parallax, card hovers, and a pinned scroll scene where
the dark interlude reveals text word-by-word and a circle wipes into the next
section — all on the project's spring stack (no GSAP/Framer).

**Decision.**
1. **Loader-gated entrance.** A Zustand flag (`use-loader`) is the single source
   of "intro done". The `Appear` primitive wraps gated content and plays a blur +
   opacity reveal keyed off that flag (via the `Spring` component's `enabled`),
   so above-the-fold content waits for the loader instead of viewport entry.
   Below-the-fold content keeps using `Inview` (viewport-triggered).
2. **Pinned scenes use a tall track + `trigger` ref.** A sticky child pins while
   a tall parent scrolls. Driving `SpringTrigger`/`TextEngine` off the *track*
   ref (`start="top top"`, `end="bottom bottom"`) makes progress advance *during*
   the pin (a sticky element's own rect doesn't move). This is the reusable
   recipe for any pin-and-scrub section.
3. **Circle-wipe handoff.** The expanding white circle ends on the white next
   section placed immediately after the track, so the wipe is seamless without
   compositing the next section into the sticky panel.
4. **`interpolate()` bug fix.** `src/utils/math.ts` rebuilt transform functions
   malformed, so `SpringTrigger` scrub never animated transforms. Fixed (a util,
   not a `#do-not-modify` engine file; only the scrub hook consumes it). Keep
   scrub transforms single-function; compose multiple via nested elements.
5. **No string-color springs on SSR'd nodes.** Animating `boxShadow`
   (`rgba(...,0)`) *or* `backgroundColor` on a server-rendered animated element
   throws react-spring's *"arity of each output must be equal"* and/or mismatches
   SSR hydration (react-spring re-serialises colours client-side). For a hover
   colour shift, animate a **number** instead — an opacity-animated tint overlay
   (see `proof-card.tsx`) — or keep it transform-only.

**Consequences.** Reusable patterns: `Appear` for entrance, the track+trigger
recipe for pinned scrub. Verification must use real wall-clock CDP (Chrome
`--virtual-time-budget` freezes react-spring's rAF loop) — captured in
[[home-page]].

---

## ADR-0014 — Home page build: token system, font substitution, light-only body

- **Status:** Accepted
- **Date:** 2026-06-20

**Context.** The first real page (Figma "Concept 2", node 231:177) had to be
implemented faithfully on the empty starter. Three decisions had project-wide
reach beyond a single section.

**Decision.**
1. **Design-token layer first.** Every Figma value maps to a token in
   `globals.css` (`@theme inline`) before use — brand colours, a `--text-*`
   type scale, `--radius-*`, and `--container-content` — and layout spacing uses
   Tailwind's rem-based numeric scale so it tracks the AdaptiveGrid root scaling.
   No raw hex/px in `className` (hard rule #4). One-off non-token values (a
   capsule `rounded-[7rem]`, card aspect ratios) use rem/ratio arbitrary values,
   never px.
2. **Font substitution.** The design specifies **Neue Plak** (display) and
   **Google Sans Flex** (UI) — both commercial, neither on Google Fonts. They are
   substituted with the project's existing **Onest** for all sans roles; the
   exact **Playfair Display** italic is loaded via `next/font/google` for the
   accent face (`--font-serif`). Flagged for design review — swap Onest for the
   licensed faces (or self-hosted `next/font/local`) when available without
   touching components, which only reference `--font-sans` / `--font-serif`.
3. **Light-only page.** The starter's `prefers-color-scheme: dark` override was
   removed and the `body` rule changed from flex-centred/`100vh` to normal flow.
   The brand page is a fixed light design; auto-inverting it looked broken, and
   the centring rule was scaffolding for the empty view.

**Consequences.** Adding a section means composing tokens + spring primitives;
the type/colour system is reusable for future pages. Re-introducing dark mode
later means restoring a token override block, not rewriting components. Headless
verification note: react-spring's rAF loop freezes under Chrome's
`--virtual-time-budget`, so reveal end-states must be confirmed with real
wall-clock time (CDP) or `prefers-reduced-motion` — captured in [[home-page]].

---

## ADR-0013 — `<Inview>` self-observe fix; spring components honour resize

- **Status:** Accepted
- **Date:** 2026-06-07

**Context.** `<Inview>` only animated when an external `trigger` ref was passed.
Without one it never revealed. Root cause: `useDynamicInView` returns its target
attachment as a **callback ref** (`setNode`) in the first tuple slot, but
`in-view.tsx` destructured it as `inViewRef` and wrote `inViewRef.current = node`
in the JSX `ref` callback — assigning `.current` to a function instead of calling
it. `setNode` never ran, the observed `node` stayed `null`, and with no `trigger`
the observer had nothing to watch (`trigger?.current ?? node` → `null`). With a
`trigger` it worked only because `trigger.current` bypassed the dead `node` path.
TypeScript flagged this at build time (`Property 'current' does not exist on type
'TargetRefCallback'`), so the build was already failing.

Separately, `<Inview>`, `<Spring>`, and `<Hover>` tracked `width`
(`useWindowWidth()`) as a `useMemo`/`useEffect` dependency to re-evaluate mobile
gating on resize, but never passed it to `isMobileDisabled()` — so the value was
genuinely unused (ESLint `react-hooks/exhaustive-deps` warning) **and** resize
re-evaluation silently did nothing; the check always read `window.innerWidth` at
call time.

**Decision.** This is the second authorized edit to the `#do-not-modify` engine
(after ADR-0009). Two corrections:
1. In `in-view.tsx`, call the callback ref — `setInViewNode(node)` — instead of
   assigning `.current`, so the component observes itself when no `trigger` is
   given.
2. Pass the React-tracked `width` into every `isMobileDisabled(value, width)`
   call across `in-view.tsx`, `spring.tsx`, and `hover.tsx`. This is the
   documented second parameter of `isMobileDisabled` and makes the `width`
   dependency meaningful, fixing resize re-evaluation and clearing the lint
   warnings.

**Consequences.** `<Inview>` now works standalone (the common case). `yarn build`
and `yarn lint` are both clean (0 errors, 0 warnings). The springs folder remains
`#do-not-modify` by default — these were explicitly signed-off bug fixes.

---

## ADR-0012 — Styling lives in utilities and components, not `globals.css`

- **Status:** Accepted
- **Date:** 2026-05-22

**Context.** ADR-0004 made design tokens the styling currency and ruled that
"new values must be added to `globals.css` first." Combined with the
design-system guidance to *"extract repeated multi-class patterns to
`@layer components`"*, the path of least resistance for any repeated visual
pattern became a named class in `globals.css`. On an animation-heavy,
multi-section marketing site that grows the file without bound — a single
global stylesheet accumulating hundreds of component-specific classes that are
never deleted when their component is. The fix is a placement rule, not a
file-splitting trick: splitting `globals.css` into many files only spreads the
same bloat.

**Decision.** Styling follows a strict placement order; `globals.css` stays
bounded by design.

- One-off styling → **Tailwind utilities** in `className`. Nothing enters CSS.
- A repeated pattern with markup/structure/props → a **React component**
  (`components/ui/`), *not* a CSS class. This is the default answer to "this
  looks repeated" — e.g. an eyebrow label with a `::before` dot is an
  `<Eyebrow>` component, not a `.label-eyebrow` class.
- A repeated pure-utility combo with no structure → a Tailwind v4 `@utility`.
- `@layer components` is reserved **strictly** for what utilities and
  components genuinely cannot express: pseudo-elements (`::before`/`::after`),
  third-party DOM overrides (`!important` on library markup), complex
  descendant/state selectors.
- `globals.css` only ever holds: `@import`, tokens (`:root` + `@theme`), base
  element resets (`@layer base`), and the narrow `@layer components`
  exceptions above. If it grows past that, something was misplaced.
- CSS Modules were considered and **rejected** — a second styling mechanism
  for the rare bespoke-CSS case is not worth the extra mental model when
  motion is spring-based (no keyframes — ADR-0002) and utilities + components
  cover everything else.

**Consequences.** `globals.css` stays a few-hundred-line file indefinitely.
"Repeated thing" pressure now pushes toward React components — which the
project wants anyway. This **amends ADR-0004**: design *tokens* still go in
`globals.css` first, but component-specific *classes* no longer do.
[[design-system]] and [[component-conventions]] updated to match.

---

## ADR-0011 — API layer: `app/api` route handlers, secrets server-side

- **Status:** Accepted
- **Date:** 2026-05-22

**Context.** The starter had no API layer. It needs a convention for reaching
external services that keeps secret keys off the client and gives endpoints a
consistent shape.

**Decision.** External calls go through Next.js Route Handlers —
`src/app/api/<resource>/route.ts`:
- **The handler owns the work** — business logic, multiple upstream calls,
  filtering, and reading secret env vars all live in `route.ts`. No mandatory
  passthrough service layer; extract shared code only when genuinely reused.
- Secrets are safe in handlers because `route.ts` is never bundled to the
  browser. Secret env vars are **unprefixed**; `NEXT_PUBLIC_` only for
  browser-safe values.
- Every endpoint: validates input with `zod`, returns the `{ data }` /
  `{ error }` envelope via the shared `handle()` wrapper (`src/lib/api/`), runs
  on the Node runtime (not Edge).
- `src/env.ts` validates env with zod — `publicEnv` vs `getServerEnv()`.
- Client Components fetch via `apiFetch` (`src/lib/api-client.ts`), same-origin
  only. Render-time data is read in Server Components.
- Added `zod`. The example endpoint is `app/api/contact/route.ts`.
- Codified as **AGENTS.md hard rule #9**.

**Consequences.** A clear, secret-safe API convention (full note:
[[api-architecture]]). Server Actions were considered for mutations but
deferred — for now everything goes through `app/api`. The choice can be
revisited if forms need progressive enhancement. First server dependency
(`zod`) and first server-only env var (`CONTACT_ENDPOINT`) now exist.

---

## ADR-0010 — SEO & performance hardening

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** A review found gaps that would hurt a production marketing site:
`metadataBase` defaulted to `null` (relative OG/canonical URLs never resolved to
absolute — broken social previews); `themeColor` sat on the deprecated metadata
field; there was no `robots.txt`, `sitemap.xml`, or structured data; the
`next.config.ts` was empty; `ScrollLayout` leaked a `requestAnimationFrame`
loop; the home view was a top-level `"use client"` (violating hard rule #6);
and the animation-heavy starter ignored `prefers-reduced-motion`.

**Decision.**
- **Site config.** `src/lib/site.ts` (`siteConfig`) is the single source of
  truth for SEO, fed by `NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`).
- **Metadata.** `metadataBase` is always set; `themeColor` moved to a
  `generateViewport()` / `viewport` export; dead `keywords` / `other` tags
  dropped; OG dimensions corrected to match the asset.
- **Crawlability.** Added `app/robots.ts`, `app/sitemap.ts`, and a JSON-LD
  `Organization`+`WebSite` helper rendered once in the root layout.
- **App Router files.** Added `loading.tsx` (enables streaming), `error.tsx`,
  `not-found.tsx`.
- **Rendering.** `HomeView` is a Server Component; client-only animation moved
  to the `HomeShowcase` leaf — models hard rule #6 instead of breaking it.
- **Reduced motion.** `<ReducedMotion>` calls react-spring's `useReducedMotion`,
  toggling the global `skipAnimation` — one app-root mount covers every spring
  and `spring-text-engine`. Chosen over per-component handling for its reach.
- **Build config.** `next.config.ts` now sets `removeConsole` (prod),
  AVIF/WebP, `next/image` breakpoints aligned to the adaptive-grid widths, and
  `poweredByHeader: false`. React Compiler is left as a documented opt-in (needs
  `babel-plugin-react-compiler`).
- Fixed the `ScrollLayout` Lenis rAF leak (cancel on unmount).

**Consequences.** Social/SEO metadata is correct in production once
`NEXT_PUBLIC_SITE_URL` is set. The first project env var now exists (see
[[environment-variables]]). `isBot()` stays available but is discouraged — it
opts routes out of static rendering; reduced-motion is the preferred lever (see
[[seo-metadata]]). React Compiler remains opt-in pending a dependency install.

---

## ADR-0009 — Shared animation ticker; authorized engine performance refactor

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** A performance review of the animation engine found load issues that
scale with the number of animated components on a page:
- `useLoop` started a **private `requestAnimationFrame` loop per hook instance** —
  N scroll-driven components meant N rAF loops, none of which ever stopped.
- `useWindowWidth` attached a **separate debounced `resize` listener per call** —
  one per spring component.
- `useDynamicInView` re-created its `IntersectionObserver` **on every render**
  (effect keyed on an unstable `options` object), and a dead `Proxy` branch
  created observers that were never disconnected.
- `useLoop`'s mount-only effect captured a **stale `onRender`**, so prop changes
  after mount were ignored.
All of this lives under `src/hooks/animation/` and `src/components/animation/springs/`
— `#do-not-modify` (ADR-0002).

**Decision.** With explicit user sign-off, apply a one-time performance refactor
to the protected engine, and introduce a shared, unprotected loop primitive:
- New `src/lib/animation/ticker.ts` — a single app-wide, reference-counted rAF
  loop (`subscribeToTicker`). It starts on the first subscriber, stops on the
  last, and throttles each subscriber independently. **Not** `#do-not-modify` —
  it is the supported extension point.
- `useLoop` now subscribes to the ticker and reads `onRender` / `framerate`
  through refs (fixes the stale-closure bug). Public signature unchanged.
- `useDynamicInView` rewritten without the `Proxy`: one observer, re-created only
  when the observed element or options actually change; exposes a callback ref.
- `use-window-size.ts` (not protected) now serves all three hooks from one
  debounced `resize` listener via `useSyncExternalStore`. The unused
  `debounceDelay` parameter was dropped.
- `mode="forward"` `scroll` listeners in `<Spring>` / `<Inview>` made `passive`.
- Hard rule #2 amended: the engine stays protected by default; changes require
  explicit sign-off.

**Consequences.** A page with N animated components now runs **one** rAF loop and
**one** resize listener instead of N of each, with no observer churn. Public
hook/component APIs are unchanged except `useWindowWidth`/`Height`/`Size`, which
no longer take a `debounceDelay` argument (no caller passed one). This **amends
ADR-0002's** do-not-modify scope.

A follow-up pass then cleared all 13 pre-existing ESLint problems in the engine
(also authorized): `isMobileDisabled` gained an optional `viewportWidth`
argument, missing `disableOnMobile` effect deps were added, a
`trigger.current`-in-cleanup hazard in `<Hover>` was fixed, `<Handle>`'s
transition effects were ref-stabilised, and `useProgressTrigger` now returns
`progress` as a `RefObject<number>` (no consumer affected).

---

## ADR-0008 — Adaptive scaling grid via root font-size

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** An adaptive scaling system was dropped into `src/components/common/`
to keep a rem-based design proportional across viewports. It shipped as a
`styled-components` implementation (`createGlobalStyle`, a `css` `media` helper,
`rm`/`em` helpers, plus `colors.ts` / `fonts.ts` / `utils.ts`). `styled-components`
is not a project dependency, and global CSS belongs in `globals.css` per ADR-0004.

**Decision.** Keep only the scaling behaviour; rebuild it to the project stack.
- **Scale down** (viewport ≤ largest breakpoint) — `vw`-based `html { font-size }`
  media queries in `globals.css`, inside `@layer base`.
- **Scale up** (viewport > largest breakpoint) — a `<AdaptiveGrid>` client
  component (`useAdaptiveGrid` hook) sets an inline `html` font-size at runtime,
  reusing the existing `useResizeLoop` render loop.
- Breakpoints live in `grid.config.ts` as typed config; the `globals.css` media
  queries mirror them and must be kept in sync (formula in both files).
- The dropped `styled-components` files were deleted, not committed.

**Consequences.** A rem-based layout now scales as one unit on every viewport.
`styled-components` stays out of the dependency tree. The breakpoint set is
duplicated across `grid.config.ts` and `globals.css` by design — the CSS-only
config rule (ADR-0004) forbids generating the media queries from JS.

---

## ADR-0007 — Automate the vault workflow with Claude Code hooks

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** The "read the vault first, follow the relevant guide, update the docs
after every change" workflow depended on the user reminding the agent each time.
Documentation drifts the moment it relies on memory.

**Decision.** Encode the workflow as Claude Code hooks in `.claude/settings.json`
(committed, team-wide):
- `SessionStart` — injects a pointer to read the vault first.
- `UserPromptSubmit` — on every request, reminds the agent to consult the relevant
  guide and to update docs for any change made.
- `Stop` — at the end of every turn, blocks **once** to confirm the vault was
  updated. A `${TMPDIR}` marker keyed by session id guarantees it blocks at most
  once per turn (no infinite loop).

**Consequences.** The documentation workflow is enforced without user prompting.
`.claude/settings.json` is now a tracked project file. Hooks are reviewable and
disableable via `/hooks`. New hooks take effect on the next session start (or after
opening `/hooks`). See [[ai-agent-guide]].

---

## ADR-0006 — The vault is the single source of truth

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** ADR-0001 left dense spec files (`project-specs.md`, `text-engine-docs.md`)
at the repo root alongside the vault, creating duplication — the same conventions
existed both as terse specs and as expanded vault notes, which would drift.

**Decision.** The vault is the **only** documentation source.
- `project-specs.md` — deleted; its content was already decomposed into the
  `architecture/` and `frontend/` notes (and `environment-variables.md`).
- `text-engine-docs.md` — moved into the vault as [[text-engine-reference]].
- `generic-layout-prompt.md` — moved into the vault (see ADR via [[changelog]]).
- Root keeps only thin shims: `AGENTS.md` carries the breaking-change warning and
  hard rules and points into the vault; `CLAUDE.md` and `.cursorrules` both
  `@`-import `AGENTS.md`.

**Consequences.** No documentation duplication. Agents bootstrap from `AGENTS.md`
and read vault notes on demand. This **amends ADR-0001** — root files no longer
hold canonical spec content.

---

## ADR-0005 — Use standard `next/link` for navigation

- **Status:** Accepted
- **Date:** 2026-05-21

**Context.** Two conflicting conventions existed: `project-specs.md` specified
standard `next/link` / `useRouter`, while `generic-layout-prompt.md` specified
custom `<AnimLink>` / `useAnimRouter()` wrappers. The custom wrappers were never
built.

**Decision.** Use standard Next.js navigation — `<Link>` from `next/link` and
`useRouter` from `next/navigation`. The `AnimLink` / `useAnimRouter` convention is
dropped. See [[routing]].

**Consequences.** `generic-layout-prompt.md` §5 updated to match. No animated-route-
transition layer exists; if one is needed later, revisit with a new ADR.

---

## ADR-0001 — Adopt an Obsidian vault as the project brain

- **Status:** Accepted — amended by ADR-0006
- **Date:** 2026-05-21

**Context.** Project knowledge was scattered across root markdown files
(`project-specs.md`, `text-engine-docs.md`, `AGENTS.md`). New contributors and AI
agents had no structured map of the system.

**Decision.** Introduce `obsidian/` as an Obsidian vault — a linked, navigable
second brain. Root spec files remain as machine-read sources; the vault expands on
them. See [[ai-agent-guide]].

**Consequences.** Docs must now be maintained alongside code. The vault is the
canonical place to *understand* the project; root files stay canonical for *tooling*.

---

## ADR-0002 — All motion is spring-based (`@react-spring/web`)

- **Status:** Accepted (inherited from starter)
- **Date:** Project baseline

**Context.** Marketing sites need rich, interruptible, physically natural motion.
CSS transitions and keyframes are rigid; competing libraries add weight.

**Decision.** Use `@react-spring/web` for every animation. A custom component layer
(`src/components/animation/springs/`) wraps it. CSS transitions, CSS keyframes, and
`framer-motion` are **banned**.

**Consequences.** All animation goes through the [[animation-system]]. The springs
folder is `#do-not-modify`. Text animation is delegated to [[text-engine]].

---

## ADR-0003 — Routes delegate to Views

- **Status:** Accepted (inherited from starter)
- **Date:** Project baseline

**Context.** Mixing routing concerns with page UI makes `app/` files heavy and hard
to test.

**Decision.** `app/**/page.tsx` files only import and render a component from
`src/views/`. All layout/UI logic lives in the view. See [[routing]].

**Consequences.** Every route is a 3-line file. Views are the real page components.

---

## ADR-0004 — Tailwind v4 with CSS-based config

- **Status:** Accepted (inherited from starter)
- **Date:** Project baseline

**Context.** Tailwind v4 removes `tailwind.config.js` in favour of CSS-native config.

**Decision.** All theme tokens live in `globals.css` under `:root` and `@theme inline`.
No JS config file. Raw values in class names are banned. See [[design-system]].

**Consequences.** Design tokens are the only styling currency. New values must be
added to `globals.css` first.
