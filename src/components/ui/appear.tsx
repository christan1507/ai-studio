"use client";

import type { ReactNode } from "react";
import type { Tags } from "@/types/springs";
import { Spring } from "@/components/animation/springs/spring";
import { useLoaderStore } from "@/hooks/use-loader";

export interface AppearProps {
  children: ReactNode;
  tag?: Tags;
  /** Stagger delay in ms, applied once the loader is ready. */
  delay?: number;
  /** Upward travel in px. */
  y?: number;
  /** Initial blur in px (the signature "progressive blur" reveal). */
  blur?: number;
  className?: string;
  /**
   * When false, the reveal plays on its own (mount) instead of waiting for the
   * intro loader. Use for content below the fold that the loader never covers.
   */
  gated?: boolean;
}

/**
 * Blur + opacity entrance reveal, gated on the intro loader (`useLoaderStore`).
 * Every gated child shares the same trigger, so a list of `delay`s reads as one
 * orchestrated stagger once the loader lifts.
 */
export const Appear = ({
  children,
  tag = "div",
  delay = 0,
  y = 24,
  blur = 16,
  className,
  gated = true,
}: AppearProps) => {
  const ready = useLoaderStore((s) => s.ready);
  const enabled = gated ? ready : true;

  return (
    <Spring
      tag={tag}
      enabled={enabled}
      delayIn={delay}
      from={{
        opacity: 0,
        filter: `blur(${blur}px)`,
        transform: `translateY(${y}px)`,
      }}
      to={{ opacity: 1, filter: "blur(0px)", transform: "translateY(0px)" }}
      config={{ tension: 80, friction: 22 }}
      className={className}
    >
      {children}
    </Spring>
  );
};
