"use client";

import { animated, type SpringValue } from "@react-spring/web";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import type { PortfolioItem } from "@/data/mocks/home";
import { portfolioTransform, pfTrackTransform } from "@/utils/showreel/timeline";

export interface PortfolioProps {
  p: SpringValue<number>;
  items: PortfolioItem[];
  /** Whether the portfolio is within its scroll range — gates video loading. */
  active: boolean;
}

const PfCard = ({ item, active }: { item: PortfolioItem; active: boolean }) => (
  // `translateZ(0)` + `backface-visibility:hidden` keep each card (and its video)
  // on a stable GPU layer so the horizontal track-pan is a pure composite — no
  // per-frame re-raster flicker as the cards slide.
  <article className="relative flex h-full w-[62vw] shrink-0 flex-col justify-between overflow-hidden rounded-pf bg-pf-card p-[3.5vmin] text-white [backface-visibility:hidden] [transform:translateZ(0)]">
    {/* Each clip is multi-MB; only mount it (so the browser fetches + autoplays)
        once the section is near, keeping it out of the initial page load. */}
    {active && (
      <video
        className="absolute inset-0 z-0 size-full object-cover [backface-visibility:hidden] [transform:translateZ(0)]"
        src={item.video}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
      />
    )}
    {/* All tags on one line: client · year · discipline. */}
    <div className="relative z-[2] flex flex-wrap items-center gap-[1.4vmin] text-[1.7vmin] opacity-90">
      <span>{item.client}</span>
      <span aria-hidden="true" className="opacity-50">·</span>
      <span>{item.year}</span>
      <span aria-hidden="true" className="opacity-50">·</span>
      <span>{item.discipline}</span>
    </div>
    {/* Case title — same scale as the section H1s (hero / final block). */}
    <h3 className="relative z-[2] m-0 max-w-[85%] text-[7vw] font-normal capitalize leading-[0.95] tracking-[-0.03em]">
      {item.title}
    </h3>
  </article>
);

/**
 * Fixed portfolio section. Flies up from below, scrolls its three video cards
 * horizontally, then exits left with a scale-down — all scrubbed by the global
 * scroll spring. The aurora background counter-translates so it stays put while
 * the cards slide over it. Max horizontal pan is measured from the track.
 */
// `memo` so the stage's visibility re-renders don't re-render the portfolio
// (and reconcile its videos) when only an unrelated scene flag flips.
export const Portfolio = memo(({ p, items, active }: PortfolioProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [maxPan, setMaxPan] = useState(0);

  // Stable interpolations — recreating them on the `active`/`maxPan` re-renders
  // would re-attach the transforms and flash the section for a frame.
  const sectionTransform = useMemo(() => p.to(portfolioTransform), [p]);
  const trackTransform = useMemo(
    () => p.to((v) => pfTrackTransform(v, maxPan)),
    [p, maxPan],
  );

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      const vp = el.parentElement;
      if (!vp) return;
      const rightGap = (3 * Math.min(window.innerWidth, window.innerHeight)) / 100;
      const next = Math.max(0, el.scrollWidth - vp.clientWidth + rightGap);
      setMaxPan((prev) => (prev === next ? prev : next));
    };
    const observer = new ResizeObserver(update);
    observer.observe(el);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <animated.section
      className="fixed inset-0 z-40 flex flex-col overflow-hidden pb-[8vmin] pt-[9vmin] text-paper-alt will-change-transform"
      style={{ transform: sectionTransform }}
    >
      {/* No own background: the section sits on the shared pinned aurora behind
          the sticky stage (ADR-0018). No header — just the horizontally
          scrolling cards. */}
      <div className="relative z-[1] min-h-0 flex-1 overflow-hidden">
        <animated.div
          ref={trackRef}
          className="flex h-full gap-[3vmin] pl-[3vmin] will-change-transform"
          style={{ transform: trackTransform }}
        >
          {items.map((item) => (
            <PfCard key={item.title} item={item} active={active} />
          ))}
        </animated.div>
      </div>
    </animated.section>
  );
});
Portfolio.displayName = "Portfolio";
