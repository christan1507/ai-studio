"use client";

import Image from "next/image";
import { memo, useEffect } from "react";
import { animated, useSpring, to, type SpringValue } from "@react-spring/web";
import { HeroGradient } from "@/components/3d/hero-gradient";
import { ScrollLetters } from "@/views/home/scroll-letters";
import {
  heroLetterStyle,
  heroSlidePan,
  templatesLetterStyle,
  heroSliderWidth,
  heroSliderHeight,
  heroTiltFade,
  heroContentFade,
} from "@/utils/showreel/timeline";

export interface HeroCardProps {
  p: SpringValue<number>;
  lines: string[];
  templatesTitle: string;
  images: { stone: string; rotated: string };
  bottomBlock?: {
    leftText: string;
    rightText: string;
    avatars: string[];
  };
  /** Whether the hero is on-screen — gates the shader render loop. */
  active?: boolean;
}

/**
 * Hero card (carousel slot 1). Mesh-gradient shader background, a headline that
 * descends + blurs out on scroll, and a paired image card that floats **over**
 * the headline with a cursor-reactive 3D perspective tilt — then pans + grows to
 * cover the card as it flips into the carousel. All scroll motion is driven by
 * the global spring `p`; the tilt is its own pointer-driven spring.
 */
// `memo` so the stage's visibility re-renders (when an unrelated scene flag
// flips) don't re-render the hero and re-create its springs.
export const HeroCard = memo(({ p, lines, templatesTitle, images, bottomBlock, active = true }: HeroCardProps) => {
  // Cursor-reactive tilt: a spring eased toward the pointer position (mapped
  // from the window). Faded out by `heroTiltFade(p)` as the card flips away.
  const [tilt, tiltApi] = useSpring(() => ({
    rx: 0,
    ry: 0,
    config: { tension: 120, friction: 20 },
  }));

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1; // -1 … 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      tiltApi.start({ rx: -ny * 9, ry: nx * 12 });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [tiltApi]);

  return (
    <div className="relative size-full overflow-hidden rounded-card bg-black">
      <HeroGradient className="absolute inset-0 z-[1]" active={active} />

      {/* Headline — top-left, sized + tracked to match the marquee. Letters
          descend + blur out on scroll (soft, no hard clip); the whole block also
          fades on scroll so the hero copy clears cleanly (no layout shift — it's
          absolutely positioned). Sits BELOW the image card. */}
      <animated.header
        className="pointer-events-none absolute inset-0 z-[3] flex p-[40px] max-sm:p-5"
        style={{ opacity: p.to(heroContentFade) }}
      >
        <h1 className="flex flex-col items-start text-left text-[7vw] font-normal leading-[0.95] tracking-[-0.03em] text-white">
          {lines.map((line, i) => (
            <span key={i} className={i === 1 ? "opacity-40" : undefined}>
              <ScrollLetters text={line} p={p} styleFn={heroLetterStyle} />
            </span>
          ))}
        </h1>
      </animated.header>

      {/* "Browse our templates" — centred + counter-rotated so it reads upright
          once the card flips 90°. Animates in late in phase 1. Sits ABOVE the
          image card (z-[7] > z-[6]) so it stays legible over the green carousel
          face; a drop shadow keeps it readable on the bright image. */}
      <div className="pointer-events-none absolute inset-0 z-[7] flex items-center justify-center">
        <h2 className="text-center text-[3.6vmin] font-normal leading-tight text-white drop-shadow-lg [transform:rotate(-90deg)]">
          <ScrollLetters text={templatesTitle} p={p} styleFn={(prog, i) => templatesLetterStyle(prog, i)} />
        </h2>
      </div>

      {/* Image card — floats OVER the headline (z-[6]) with a cursor-driven 3D
          tilt (perspective parent). Pans left + grows to fully cover the card so
          the hero shader is hidden in the final (carousel) state. */}
      <div className="pointer-events-none absolute inset-0 z-[6] [perspective:1400px]">
        <animated.div
          className="absolute left-1/2 top-1/2 overflow-hidden rounded-slider shadow-2xl will-change-transform"
          style={{
            width: p.to(heroSliderWidth),
            height: p.to(heroSliderHeight),
            transform: to([p, tilt.rx, tilt.ry], (pv, rx, ry) => {
              const f = heroTiltFade(pv);
              return `translate(-50%, -50%) rotateX(${rx * f}deg) rotateY(${ry * f}deg)`;
            }),
          }}
        >
          <animated.div
            className="absolute inset-0"
            style={{ transform: p.to((v) => `translateX(${heroSlidePan(v)}%)`) }}
          >
            <Image src={images.stone} alt="" fill sizes="64vmin" className="object-cover" priority />
          </animated.div>
          <animated.div
            className="absolute left-full top-0 size-full overflow-hidden"
            style={{ transform: p.to((v) => `translateX(${heroSlidePan(v)}%)`) }}
          >
            {/* The card flips 90°, so this image is counter-rotated to read
                upright; scale(1.65) > the card's aspect ratio guarantees it
                covers the rotated frame with no shader/black gap at the edges. */}
            <Image
              src={images.rotated}
              alt=""
              fill
              sizes="66vmin"
              className="object-cover [transform:rotate(-90deg)_scale(1.65)]"
            />
          </animated.div>
        </animated.div>
      </div>

      {/* Bottom Content Block — fades out on scroll with the rest of the hero
          copy (absolutely positioned → no layout shift). */}
      {bottomBlock && (
        <animated.div
          className="pointer-events-none absolute bottom-0 left-0 w-full p-[40px] max-sm:p-5 z-[6] flex flex-col gap-6 max-sm:gap-4 text-white font-light"
          style={{ opacity: p.to(heroContentFade) }}
        >
          <div className="flex flex-col gap-6 max-sm:gap-4 max-w-md pointer-events-auto">
            <p className="opacity-90 leading-relaxed text-[16px] max-sm:text-[14px]">
              {bottomBlock.leftText}
            </p>
            <div className="flex items-center gap-4 max-sm:flex-col max-sm:items-stretch max-sm:gap-3">
              <button className="inline-flex items-center justify-center px-8 py-3.5 max-sm:px-5 max-sm:py-3 rounded-btn bg-white/10 backdrop-blur-md border border-white/20 transition-colors hover:bg-white/20 text-[17px] max-sm:text-[15px] leading-none">
                See Pricing
              </button>
              <button className="inline-flex items-center justify-center px-8 py-3.5 max-sm:px-5 max-sm:py-3 rounded-btn bg-white text-black font-medium transition-colors hover:bg-white/90 text-[17px] max-sm:text-[15px] leading-none">
                Start Journey
              </button>
            </div>
          </div>

          {/* Divider + social-proof row — desktop/tablet only. On a phone the card
              is too narrow for this second row, so it's dropped to keep the hero
              copy + buttons clean (they fade out on scroll anyway). */}
          <div className="w-full h-[1px] bg-white/30 my-2 max-sm:hidden" />

          <div className="flex justify-between items-end w-full max-sm:hidden">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-full py-1.5 pl-2 pr-4 pointer-events-auto">
              <div className="flex -space-x-2">
                {bottomBlock.avatars.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                ))}
              </div>
              <span className="text-[14px] font-medium opacity-90 pr-2">Trusted by 4000+ creatives</span>
            </div>
            <p className="max-w-lg opacity-90 leading-relaxed text-right text-[15px] pointer-events-auto">
              {bottomBlock.rightText}
            </p>
          </div>
        </animated.div>
      )}
    </div>
  );
});
HeroCard.displayName = "HeroCard";
