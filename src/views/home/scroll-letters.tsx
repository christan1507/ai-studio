"use client";

import { animated, type SpringValue } from "@react-spring/web";
import { Fragment } from "react";
import type { LetterStyle } from "@/utils/showreel/timeline";

export interface ScrollLettersProps {
  text: string;
  /** Global scroll spring (0→1). */
  p: SpringValue<number>;
  /** Per-letter style as a function of progress, letter index, and count. */
  styleFn: (progress: number, letterIndex: number, total: number) => LetterStyle;
  className?: string;
  /** Share a sequential stagger across multiple lines (offset + global total). */
  indexOffset?: number;
  totalOverride?: number;
}

/**
 * Splits text into per-letter spans, each driven by the global scroll spring.
 * Used for the two headings that are scroll-scrubbed while their card is pinned
 * — where the viewport-triggered TextEngine can't reach (see decisions-log
 * ADR-0016). Spaces are preserved as non-breaking and not counted as letters,
 * matching the original stagger.
 */
export const ScrollLetters = ({
  text,
  p,
  styleFn,
  className,
  indexOffset = 0,
  totalOverride,
}: ScrollLettersProps) => {
  const chars = [...text];
  const total = totalOverride ?? chars.filter((c) => c !== " " && c !== "\n").length;

  let letterIndex = -1;
  return (
    <>
      {chars.map((ch, i) => {
        if (ch === "\n") return <br key={i} />;
        if (ch === " ")
          return <Fragment key={i}>{" "}</Fragment>;
        letterIndex += 1;
        const idx = indexOffset + letterIndex;
        return (
          // No `overflow-hidden` here: a hard clip gives the letters a sharp
          // edge as they translate on scroll. The per-letter blur + opacity in
          // the styleFn already produce a soft reveal/exit, so we let the glyphs
          // move freely and fade rather than be guillotined.
          <span key={i} className="inline-flex align-bottom">
            <animated.span
              className={className}
              style={{
                display: "inline-block",
                willChange: "transform, filter, opacity",
                transform: p.to((v) => styleFn(v, idx, total).transform),
                filter: p.to((v) => styleFn(v, idx, total).filter),
                opacity: p.to((v) => styleFn(v, idx, total).opacity),
              }}
            >
              {ch}
            </animated.span>
          </span>
        );
      })}
    </>
  );
};
