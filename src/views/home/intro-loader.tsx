// 📖 Docs: obsidian/frontend/animation-system.md
"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { animated, easings, to, useSpring } from "@react-spring/web";

import { useLoaderStore } from "@/hooks/use-loader";
import { useScroll } from "@/hooks/smooth-scroll/use-scroll";

const STAR = "/assets/showreel/star.svg";

export interface IntroLoaderProps {
  /**
   * Minimum time (ms) the loader stays up before it reveals the page. Gives the
   * heavy WebGL scenes underneath time to warm up while the intro plays.
   */
  minDuration?: number;
}

type Phase = "loading" | "exiting" | "done";

/**
 * Immersive intro loader. A full-screen black overlay where a soft violet bloom
 * sits behind the chrome brand star as it spins + scales in from blur. When the
 * load window elapses it flips the global `useLoaderStore.ready` flag (un-gating
 * the staggered page reveal), accelerates the star away and cross-fades the
 * overlay out, then unmounts itself.
 *
 * Minimal by design: just the mark, centred. All motion is spring-based
 * (`@react-spring/web`); scroll is frozen for the duration via the Lenis store.
 * Honours `prefers-reduced-motion` by skipping the spin and shortening the beat.
 */
export const IntroLoader = ({ minDuration = 2600 }: IntroLoaderProps) => {
  const setReady = useLoaderStore((s) => s.setReady);
  const setRevealed = useLoaderStore((s) => s.setRevealed);
  const stopScroll = useScroll((s) => s.stop);
  const startScroll = useScroll((s) => s.start);

  const [phase, setPhase] = useState<Phase>("loading");
  const [reduced, setReduced] = useState(false);
  const exiting = phase !== "loading";

  // Lock scroll while the loader is up; reveal the page + release scroll once
  // the (reduced-motion-aware) load window elapses.
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(media.matches);

    stopScroll();
    const duration = media.matches ? 700 : minDuration;
    const timer = window.setTimeout(() => {
      setReady(true);
      setPhase("exiting");
      startScroll();
    }, duration);

    return () => {
      window.clearTimeout(timer);
      startScroll();
    };
  }, [minDuration, setReady, startScroll, stopScroll]);

  // Continuous spin (skipped under reduced motion); accelerates on exit.
  const { r } = useSpring({
    from: { r: 0 },
    to: { r: reduced ? 0 : 360 },
    loop: !reduced,
    config: { duration: exiting ? 1100 : 4200, easing: easings.linear },
  });

  // Star: scale + fade in from blur, then accelerate up + fade out on exit.
  const star = useSpring({
    from: { o: 0, s: 0.5, b: 22, y: 0 },
    o: exiting ? 0 : 1,
    s: exiting ? 1.55 : 1,
    b: exiting ? 14 : 0,
    y: exiting ? -4 : 0,
    config: { tension: 90, friction: 20 },
  });

  // Violet bloom behind the star — opacity-only (no per-frame scale so the
  // expensive blur layer is rasterised once and just cross-fades; keeps the
  // loader exit smooth instead of re-blurring every frame).
  const bloom = useSpring({
    o: exiting ? 0 : 0.85,
    config: { tension: 60, friction: 24 },
  });

  // Overlay cross-fade + lift. Duration-based (not a spring) so the exit is crisp
  // and `onRest` fires *exactly* when the overlay is gone — an overdamped spring's
  // long opacity tail delayed `revealed` well past the visual disappearance,
  // leaving a gap before the header faded in.
  const overlay = useSpring({
    opacity: exiting ? 0 : 1,
    y: exiting ? -3 : 0,
    config: { duration: exiting ? 650 : 0, easing: easings.easeInOutCubic },
    onRest: () => {
      if (exiting) {
        // Loader has fully lifted → un-gate the header's entrance, then unmount.
        setRevealed(true);
        setPhase("done");
      }
    },
  });

  if (phase === "done") return null;

  return (
    <animated.div
      aria-hidden="true"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-background"
      style={{
        opacity: overlay.opacity,
        transform: overlay.y.to((y) => `translateY(${y}vh)`),
        pointerEvents: exiting ? "none" : "auto",
      }}
    >
      {/* Violet bloom — the brand sphere gradient, blurred into a soft halo. */}
      <animated.div
        className="pointer-events-none absolute size-[78vmin] rounded-full blur-[80px]"
        style={{ backgroundImage: "var(--card-violet)", opacity: bloom.o }}
      />

      <animated.div
        className="relative will-change-transform"
        style={{
          opacity: star.o,
          filter: star.b.to((b) => `blur(${b}px)`),
          transform: to(
            [star.s, star.y, r],
            (s, y, rot) => `translateY(${y}vh) scale(${s}) rotate(${rot}deg)`,
          ),
        }}
      >
        <Image
          src={STAR}
          alt=""
          width={132}
          height={132}
          priority
          className="[filter:drop-shadow(0_0_28px_var(--loader-glow))]"
        />
      </animated.div>
    </animated.div>
  );
};
