"use client";

import { animated, type SpringValue } from "@react-spring/web";
import { memo } from "react";
import { ctaReveal } from "@/utils/showreel/timeline";

export interface CtaBlockProps {
  /** Global scroll spring (0→1). */
  p: SpringValue<number>;
  heading: string;
  /** Second heading line, rendered semi-transparent (like the hero subtitle). */
  headingFaded: string;
  sub: string;
  button: string;
  href: string;
}

/**
 * Call-to-action overlaid on the final chrome-star block. Left-aligned copy (the
 * star sits to the right of the frame) that fades + rises in as the camera flies
 * into the block — driven by the global spring (`ctaReveal`), no CSS transition.
 * Heading uses the hero-H1 scale (`7vw`) and breaks onto two lines, the second
 * one semi-transparent like the hero subtitle.
 */
// `memo`: props are stable, so it mounts once and its interpolations are never
// re-created by the stage's visibility re-renders (avoids a one-frame reset).
export const CtaBlock = memo(({ p, heading, headingFaded, sub, button, href }: CtaBlockProps) => (
  <animated.div
    className="pointer-events-none absolute inset-0 z-[2] flex flex-col items-start justify-center gap-[2.5vmin] p-[9vmin]"
    style={{
      opacity: p.to(ctaReveal),
      transform: p.to((v) => `translateY(${(1 - ctaReveal(v)) * 6}vh)`),
    }}
  >
    <h2 className="m-0 flex max-w-[60vw] max-sm:max-w-[88vw] flex-col items-start text-[7vw] font-normal leading-[0.95] tracking-[-0.03em] text-paper">
      <span>{heading}</span>
      <span className="opacity-40">{headingFaded}</span>
    </h2>
    <p className="m-0 max-w-[26vw] max-sm:max-w-[80vw] text-[2.2vmin] max-sm:text-[3.4vmin] leading-snug text-paper/70">{sub}</p>
    <a
      href={href}
      className="pointer-events-auto mt-[1.5vmin] inline-flex items-center justify-center rounded-btn bg-paper px-[4.6vmin] py-[2.2vmin] text-[2.5vmin] leading-none text-ink"
    >
      {button}
    </a>
  </animated.div>
));
CtaBlock.displayName = "CtaBlock";
