"use client";

import { animated, type SpringValue } from "@react-spring/web";
import { memo, useEffect, useState } from "react";
import { useWindowSize } from "@/hooks/use-window-size";
import { ParticleSphere } from "@/components/3d/particle-sphere";
import { ScrollLetters } from "@/views/home/scroll-letters";
import type { ShowreelGeo } from "@/utils/showreel/geometry";
import {
  blackScreenTransform,
  sphereSceneScale,
  starMaskSize,
  sphereLogoTransform,
  sphereLogoOpacity,
  sphereScale,
  sphereDisperse,
  sphereBodyReveal,
  blockLetterStyle,
} from "@/utils/showreel/timeline";

export interface SphereCardProps {
  p: SpringValue<number>;
  /** Active responsive geometry — feeds the optical counter-scales (which match
   *  the `--sr-carousel-r` / `--sr-flyback` the cards use). */
  geo: ShowreelGeo;
  headingTop: string;
  headingBottom: string[];
  /** Supporting paragraphs shown in the open sphere scene. */
  body: string[];
  star: string;
  /** Carousel-face chrome shown while this is a carousel slot. */
  cardLabel: string;
  cardUrl: string;
  cardHeading: string;
  /** Whether the sphere scene is on-screen — gates its render loop. */
  active?: boolean;
}

/**
 * Carousel slot 4 — the "Beyond all limits" sphere scene. A star-masked black
 * panel (300vw) grows to fill the screen, revealing the particle sphere and a
 * white star logo. Block headings rise into focus on scroll. The panel +
 * inner-scene counter-scales keep the masked content optically stable; both
 * depend on the live `vmin`, so they read window size.
 */
// `memo` so the stage's visibility re-renders (when an unrelated scene flag
// flips) don't re-render the sphere and re-create its springs.
export const SphereCard = memo(({
  p,
  geo,
  headingTop,
  headingBottom,
  body,
  star,
  cardLabel,
  cardUrl,
  cardHeading,
  active = true,
}: SphereCardProps) => {
  const { width, height } = useWindowSize();
  // Gate window-derived sizing behind mount so the first client render matches
  // the server (where width/height are 0) — avoids a hydration mismatch on the
  // vmin-dependent counter-scales. vmin=0 yields scale(1), harmless pre-mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const vmin = mounted ? Math.min(width || 1, height || 1) / 100 : 0;

  const maskStyle = {
    WebkitMaskImage: `url(${star})`,
    maskImage: `url(${star})`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
  } as const;

  // Block heading is one shared stagger across all three lines (Beyond/all/limits).
  const topLen = [...headingTop].filter((c) => c !== " ").length;
  const lineLens = headingBottom.map((l) => [...l].filter((c) => c !== " ").length);
  const total = topLen + lineLens.reduce((a, b) => a + b, 0);
  const offsets = [topLen];
  lineLens.slice(0, -1).forEach((len, i) => offsets.push(offsets[i] + len));

  return (
    <div className="size-full">
      {/* Carousel-face: violet mesh gradient + product chrome (top label + url,
          bottom heading), like cards 2/3. Clipped to the card; sits BEHIND the
          star mask + logo, so it shows while card 4 is a carousel slot and is
          covered by the black mask as the sphere opens. The central star is the
          masked panel's logo and is untouched here. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden rounded-card"
        style={{ background: "var(--card-violet)" }}
      >
        <div className="flex size-full flex-col p-[3.2vmin] font-sans text-paper">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-glass-border bg-glass-dark px-[1.8vmin] py-[0.8vmin] text-[1.4vmin] tracking-[0.02em] backdrop-blur-[10px]">
              {cardLabel}
            </span>
            <span className="text-[1.5vmin] tracking-[0.02em] opacity-85">{cardUrl}</span>
          </div>
          <h3 className="mt-auto max-w-[88%] text-[4.4vmin] font-normal leading-[1.05]">
            {cardHeading}
          </h3>
        </div>
      </div>

      {/* The star mask reveals this BLACK panel: it is the dark backdrop under
          the sphere and it covers the green card-4 face behind it. The corner
          aurora (pinned, behind the sticky stage) shows through the star's
          concave corners during the reveal. */}
      <animated.div
        className="absolute left-1/2 top-1/2 h-[300vh] w-[300vw] bg-black"
        style={{
          ...maskStyle,
          WebkitMaskSize: p.to(starMaskSize),
          maskSize: p.to(starMaskSize),
          transform: p.to((v) => blackScreenTransform(v, vmin, geo)),
        }}
      >
        <animated.div
          className="absolute left-1/2 top-1/2 h-screen w-screen"
          style={{
            transform: p.to(
              (v) => `translate(-50%, -50%) scale(${sphereSceneScale(v, vmin, geo)})`,
            ),
          }}
        >
          {/* Sphere shell: shrinks (sphereScale) as it collapses while the star
              logo grows; particles also scatter (sphereDisperse) into the
              portfolio transition. */}
          <animated.div
            className="absolute left-1/2 top-1/2 z-[2] size-full"
            style={{
              transform: p.to((v) => `translate(-50%, -50%) scale(${sphereScale(v)})`),
            }}
          >
            <ParticleSphere
              className="size-full"
              active={active}
              disperse={() => sphereDisperse(p.get())}
            />
          </animated.div>

          <animated.span
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-[3] h-[12vh] w-[12vh] bg-white"
            style={{
              ...maskStyle,
              WebkitMaskSize: "contain",
              maskSize: "contain",
              transform: p.to(sphereLogoTransform),
              opacity: p.to(sphereLogoOpacity),
            }}
          />

          <h2 className="pointer-events-none absolute left-[4vmin] top-[4vmin] z-[4] m-0 whitespace-nowrap text-left text-[var(--sr-heading-1)] font-normal leading-[0.85] text-white">
            <ScrollLetters
              text={headingTop}
              p={p}
              styleFn={blockLetterStyle}
              indexOffset={0}
              totalOverride={total}
            />
          </h2>

          <h2 className="pointer-events-none absolute bottom-[4vmin] right-[4vmin] z-[4] m-0 flex flex-col items-end whitespace-nowrap text-right text-[var(--sr-heading-2)] font-normal leading-[0.85] text-white">
            {headingBottom.map((line, i) => (
              <span key={i}>
                <ScrollLetters
                  text={line}
                  p={p}
                  styleFn={blockLetterStyle}
                  indexOffset={offsets[i]}
                  totalOverride={total}
                />
              </span>
            ))}
          </h2>

          {/* Supporting copy — bottom-left, fades/rises in just after the
              headings land. */}
          <animated.div
            className="pointer-events-none absolute bottom-[5vmin] left-[4vmin] z-[4] flex max-w-[var(--sr-sphere-body-w)] flex-col gap-[1.8vmin] text-left text-[var(--sr-sphere-body-text)] font-light leading-[1.45] text-white"
            style={{
              opacity: p.to(sphereBodyReveal),
              transform: p.to((v) => `translateY(${(1 - sphereBodyReveal(v)) * 2.5}vmin)`),
            }}
          >
            {body.map((para, i) => (
              <p key={i} className="m-0">
                {para}
              </p>
            ))}
          </animated.div>
        </animated.div>
      </animated.div>
    </div>
  );
});
SphereCard.displayName = "SphereCard";
