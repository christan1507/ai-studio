"use client";

import type { ReactNode } from "react";
import TextEngine from "spring-text-engine";

export interface TextRevealProps {
  children: ReactNode;
  tag?: "h1" | "h2" | "h3" | "p";
  className?: string;
  mode?: "once" | "always" | "forward";
  /** Per-word stagger in ms — keep small for an immersive progressive blur. */
  stagger?: number;
  delayIn?: number;
}

/**
 * Word-by-word blur + opacity reveal built on the text engine — the project's
 * single sanctioned text-animation path. The small word stagger reads as a
 * progressive de-blur sweeping across the line.
 */
export const TextReveal = ({
  children,
  tag = "h2",
  className,
  mode = "once",
  stagger = 45,
  delayIn = 0,
}: TextRevealProps) => (
  <TextEngine
    tag={tag}
    mode={mode}
    delayIn={delayIn}
    wordStagger={stagger}
    wordOut={{ opacity: 0, filter: "blur(10px)" }}
    wordIn={{ opacity: 1, filter: "blur(0px)" }}
    wordConfig={{ tension: 120, friction: 26 }}
    className={className}
  >
    {children}
  </TextEngine>
);
