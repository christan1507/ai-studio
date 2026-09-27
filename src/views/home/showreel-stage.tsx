"use client";

import { animated, useSpring } from "@react-spring/web";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShowreelLayout } from "@/hooks/use-showreel-layout";
import { ProgressTrigger } from "@/components/animation/springs/progress-trigger";
import { FlameBackground } from "@/components/3d/flame-background";
import { TargetStar } from "@/components/3d/target-star";
import { HeroCard } from "@/views/home/hero-card";
import { CatalistCard } from "@/views/home/catalist-card";
import { SphereCard } from "@/views/home/sphere-card";
import { Marquee } from "@/views/home/marquee";
import { Portfolio } from "@/views/home/portfolio";
import { CtaBlock } from "@/views/home/cta-block";
import type { ShowreelContent } from "@/data/mocks/home";
import {
  GRID_ITEMS,
  card1Width,
  card1Height,
  card1Transform,
  card1Opacity,
  sideCardTransform,
  card4Opacity,
  cardZIndex,
  carouselTransform,
  carouselCtaReveal,
  cameraRigTransform,
  gridItemTransform,
  gridItemRadius,
  gridOpacity,
  targetTransform,
  targetRadius,
  targetOpacity,
  finalFrameReveal,
  marqueeOpacity,
  marqueeBlur,
  auroraOpacity,
  stageBackdropOpacity,
  sceneVisibility,
  type SceneVisibility,
} from "@/utils/showreel/timeline";

const A = "/assets/showreel";

export interface ShowreelStageProps {
  content: ShowreelContent;
}

/**
 * The scroll-driven core. ONE spring (`p`, 0→1) is scrubbed by a single
 * `ProgressTrigger` off the tall track; every scene reads `p.to(selector)` from
 * the timeline. A sticky stage pins the 3D scene while the track scrolls:
 * hero → 4-card carousel (cosine z-sorted) → particle sphere → portfolio →
 * camera-flight through a parallax grid to the chrome-star target.
 */
export const ShowreelStage = ({ content }: ShowreelStageProps) => {
  // Mount client-only. The stage is a wall of react-spring `animated.div`s whose
  // SSR'd values (transforms/opacities) never match the client's first frame —
  // that mismatch makes React discard the server tree and re-render the whole
  // page (a visible flash). It's hidden behind the loader anyway, so deferring
  // its render one tick removes every hydration mismatch with no UX cost.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Active responsive geometry. Drives the `--sr-*` CSS vars (written onto the
  // document root by the hook) consumed by the card/sphere sizing + the timeline
  // string builders; `geo` is passed to the sphere's JS-math counter-scales.
  const { geo } = useShowreelLayout();

  const trackRef = useRef<HTMLDivElement>(null);
  const [{ p }, api] = useSpring(() => ({ p: 0 }));

  // Interpolations are created ONCE and kept stable across re-renders. The
  // visibility `setVis` below re-renders this component a handful of times per
  // scroll; if the `p.to(...)` selectors were created inline they'd be fresh
  // instances every render, and react-spring would detach/reattach them — a
  // one-frame reset where the whole camera-rig (and every grid image under it)
  // visibly "teleports" and snaps back. Memoising keeps each `animated.div`
  // bound to the same value, so a re-render never disturbs the live transforms.
  const s = useMemo(
    () => ({
      aurora: p.to(auroraOpacity),
      backdrop: p.to(stageBackdropOpacity),
      marqueeOpacity: p.to(marqueeOpacity),
      marqueeBlur: p.to((v) => `blur(${marqueeBlur(v)}px)`),
      cameraRig: p.to(cameraRigTransform),
      carousel: p.to(carouselTransform),
      card1Width: p.to(card1Width),
      card1Height: p.to(card1Height),
      card1Transform: p.to(card1Transform),
      card1Opacity: p.to(card1Opacity),
      card4Opacity: p.to(card4Opacity),
      z0: p.to((v) => cardZIndex(v, 0)),
      z1: p.to((v) => cardZIndex(v, 1)),
      z2: p.to((v) => cardZIndex(v, 2)),
      z3: p.to((v) => cardZIndex(v, 3)),
      side90: p.to((v) => sideCardTransform(v, 90)),
      side180: p.to((v) => sideCardTransform(v, 180)),
      side270: p.to((v) => sideCardTransform(v, 270)),
      gridOpacity: p.to(gridOpacity),
      targetRadius: p.to((v) => `${targetRadius(v)}px`),
      targetOpacity: p.to(targetOpacity),
      finalFrame: p.to(finalFrameReveal),
      ctaReveal: p.to(carouselCtaReveal),
      ctaTranslate: p.to((v) => `translateY(${(1 - carouselCtaReveal(v)) * 2.5}vh)`),
    }),
    [p],
  );

  // The 14 parallax-grid tiles are built ONCE. They're inline in this component,
  // which re-renders on every `setVis` flip below; without memoising, React would
  // reconcile all 14 `animated.div`s and re-apply their (static) 3D transforms
  // each time, flashing the tiles for a frame as you scroll past scene
  // boundaries. Only `opacity` is live (the stable `s.gridOpacity`), so the
  // elements never need to change.
  //
  // NO `will-change`/`backface-visibility` layer-promotion here: the real
  // scroll-flicker was the Lenis↔ticker rAF desync (ADR-0023). Promoting these
  // tiles instead pinned each to a persistent GPU layer that the camera flight
  // scales to many screens wide — 14 enormous layers re-compositing on scroll-back
  // = severe lag. Plain tiles + the synced rAF render smoothly without the cost.
  const gridTiles = useMemo(
    () =>
      GRID_ITEMS.map((item, i) => (
        <animated.div
          key={i}
          aria-hidden="true"
          className="absolute left-1/2 top-1/2 z-[-1] overflow-hidden bg-cover bg-center"
          style={{
            width: item.w,
            height: item.h,
            backgroundImage: `url(${item.image})`,
            transform: gridItemTransform(item),
            borderRadius: gridItemRadius(item),
            opacity: s.gridOpacity,
          }}
        />
      )),
    [s.gridOpacity],
  );

  // Which scenes are on-screen. Recomputed every scroll frame but only committed
  // to state when a flag flips, so the (cheap) re-render happens a handful of
  // times per full scroll — not every frame. Each flag gates one canvas's
  // render loop (`frameloop`), so off-screen WebGL scenes stop rendering.
  const [vis, setVis] = useState<SceneVisibility>(() => sceneVisibility(0));
  const visRef = useRef(vis);
  const updateVisibility = (progress: number) => {
    const next = sceneVisibility(progress);
    const prev = visRef.current;
    if (
      next.hero !== prev.hero ||
      next.aurora !== prev.aurora ||
      next.sphere !== prev.sphere ||
      next.target !== prev.target ||
      next.portfolio !== prev.portfolio
    ) {
      visRef.current = next;
      setVis(next);
    }
  };

  // SSR + first client render emit nothing (matches → no hydration mismatch);
  // the effect above then mounts the live stage on the next tick.
  if (!mounted) return null;

  return (
    <>
      {/* Single pinned "northern lights" corner shader shared by the sphere
          scene and the portfolio. It's an OVERLAY (alpha — clear centre, glowing
          corners) sitting above the black sphere panel but below the portfolio
          (z-40) and nav (z-100), so the aurora wraps the corners while the
          sphere/cards show through the clear centre. Fixed → stays put while the
          blocks scroll over it (ADR-0018). */}
      <animated.div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-30"
        style={{ opacity: s.aurora }}
      >
        <FlameBackground className="absolute inset-0" active={vis.aurora} />
      </animated.div>

      <div ref={trackRef} className="relative" style={{ height: `${geo.trackVh}vh` }}>
        <div className="sticky top-0 h-screen overflow-hidden p-[4vmin]">
          {/* White backdrop for phases 1–4; fades to the black page at gp 0.72. */}
          <animated.div
            aria-hidden="true"
            className="absolute inset-0 z-0 bg-white"
            style={{ opacity: s.backdrop }}
          />

          {/* Services marquee — behind the carousel, visible through its gaps. */}
          <animated.div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-1/2 z-[1] w-screen -translate-y-1/2"
            style={{
              opacity: s.marqueeOpacity,
              filter: s.marqueeBlur,
            }}
          >
            <Marquee items={content.marquee} />
          </animated.div>

          {/* 3D scene. */}
          <div className="relative z-[2] flex size-full items-center justify-center [perspective:1500px]">
            <animated.div
              className="absolute inset-0 [transform-style:preserve-3d]"
              style={{ transform: s.cameraRig }}
            >
              <animated.div
                className="relative flex size-full items-center justify-center [transform-style:preserve-3d]"
                style={{ transform: s.carousel }}
              >
                {/* Card 1 — hero */}
                <animated.div
                  className="absolute overflow-hidden"
                  style={{
                    width: s.card1Width,
                    height: s.card1Height,
                    transform: s.card1Transform,
                    zIndex: s.z0,
                    opacity: s.card1Opacity,
                  }}
                >
                  <HeroCard
                    p={p}
                    lines={content.hero.lines}
                    templatesTitle={content.hero.templatesTitle}
                    bottomBlock={content.hero.bottomBlock}
                    images={{ stone: `${A}/stone.jpg`, rotated: `${A}/hero-image-2.png` }}
                    active={vis.hero}
                  />
                </animated.div>

                {/* Card 2 — Catalist (dark) */}
                <animated.div
                  className="absolute h-[var(--sr-card-h)] w-[var(--sr-card-w)]"
                  style={{
                    transform: s.side90,
                    zIndex: s.z1,
                    opacity: s.card1Opacity,
                  }}
                >
                  <CatalistCard variant="dark" content={content.catalistDark} bg={`${A}/card-2.jpg`} />
                </animated.div>

                {/* Card 3 — Catalist (light) */}
                <animated.div
                  className="absolute h-[var(--sr-card-h)] w-[var(--sr-card-w)]"
                  style={{
                    transform: s.side180,
                    zIndex: s.z2,
                    opacity: s.card1Opacity,
                  }}
                >
                  <CatalistCard variant="light" content={content.catalistLight} bg={`${A}/card-3.jpg`} />
                </animated.div>

                {/* Card 4 — sphere. The SphereCard renders the violet card face
                    (so it reads as a real 4th card during the flip); its masked
                    black panel escapes via overflow-visible. */}
                <animated.div
                  className="absolute flex h-[var(--sr-card-h)] w-[var(--sr-card-w)] items-center justify-center [overflow:visible]"
                  style={{
                    transform: s.side270,
                    zIndex: s.z3,
                    opacity: s.card4Opacity,
                  }}
                >
                  <SphereCard
                    p={p}
                    geo={geo}
                    headingTop={content.sphere.headingTop}
                    headingBottom={content.sphere.headingBottom}
                    body={content.sphere.body}
                    star={`${A}/star.svg`}
                    cardLabel={content.sphere.cardLabel}
                    cardUrl={content.sphere.cardUrl}
                    cardHeading={content.sphere.cardHeading}
                    active={vis.sphere}
                  />
                </animated.div>
              </animated.div>

              {/* Parallax grid + target live in the CAMERA-RIG frame (siblings of
                  the carousel, as in the original markup) so they don't inherit
                  the carousel's rotateY/flyback — the camera flight reads true. */}
              {gridTiles}

              {/* Target block — the chrome star we fly into. */}
              <animated.div
                className="absolute left-1/2 top-1/2 z-[-1] h-screen w-screen overflow-hidden bg-ink"
                style={{
                  transform: targetTransform(),
                  borderRadius: s.targetRadius,
                  opacity: s.targetOpacity,
                }}
              >
                <TargetStar className="absolute inset-0" active={vis.target} />
                {/* White margin band — the same ~4vmin white area between the
                    screen edge and the content as the hero stage (its `p-[4vmin]`
                    white backdrop), now with rounded INNER corners like the hero
                    card. It overhangs the block by 4vmin so the rounded *outer*
                    corners are clipped square by the block's overflow (the band
                    still reaches the screen corners), while the inner radius
                    (11−8=3vmin, matching `rounded-card`) stays visible. Visible
                    band = 8−4 = 4vmin. Revealed at the very end (`finalFrameReveal`). */}
                <animated.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-[-4vmin] z-[3] rounded-[11vmin] border-[8vmin] border-white"
                  style={{ opacity: s.finalFrame }}
                />
                <CtaBlock
                  p={p}
                  heading={content.cta.heading}
                  headingFaded={content.cta.headingFaded}
                  sub={content.cta.sub}
                  button={content.cta.button}
                  href={content.cta.href}
                />
              </animated.div>
            </animated.div>
          </div>

          {/* Carousel CTA — pinned under the 4-card carousel (the second block).
              A sibling overlay of the 3D scene (not inside its perspective
              transform), revealed the moment the card snaps vertical. Its bottom
              offset matches the header's top offset (2vmin from the screen edge). */}
          <animated.div
            className="pointer-events-none absolute inset-x-0 bottom-[2vmin] z-[3] flex justify-center px-[4vmin]"
            style={{
              opacity: s.ctaReveal,
              transform: s.ctaTranslate,
            }}
          >
            <a
              href={content.carouselCta.href}
              className="pointer-events-auto inline-flex items-center justify-center rounded-btn bg-ink px-[4.2vmin] py-[2vmin] text-[2.1vmin] leading-none text-paper"
            >
              {content.carouselCta.button}
            </a>
          </animated.div>
        </div>
      </div>

      {/* Fixed portfolio section (driven by the same spring). `active` gates the
          heavy video loading to the portfolio's scroll range. */}
      <Portfolio p={p} items={content.portfolio.items} active={vis.portfolio} />

      {/* Single scroll driver. `frameInterval={0}` updates progress EVERY frame
          so it tracks the scroll 1:1 — the default 10ms throttle drops to ~60fps
          on 120Hz/ProMotion displays while Lenis scrolls at 120fps, which reads
          as jitter. Now scroll (ticker driver) and progress run in the same tick. */}
      <ProgressTrigger
        tag="span"
        trigger={trackRef as React.RefObject<HTMLElement>}
        start="top top"
        end="bottom bottom"
        className="hidden"
        frameInterval={0}
        onChange={({ progress }) => {
          api.start({ p: progress, immediate: true });
          updateVisibility(progress);
        }}
      />
    </>
  );
};
