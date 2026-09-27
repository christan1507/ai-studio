// 📖 Docs: obsidian/frontend/animation-system.md
"use client";

import type { ReactNode } from "react";
import { animated, easings, useSpring } from "@react-spring/web";

import { useLoaderStore } from "@/hooks/use-loader";

const TAGS = {
  div: animated.div,
  main: animated.main,
  header: animated.header,
  section: animated.section,
} as const;

export interface RevealOnLoadProps {
  children: ReactNode;
  /** Element to render (semantic landmark, e.g. "main", "header"). */
  tag?: keyof typeof TAGS;
  /** Stagger delay in ms after the trigger fires. */
  delay?: number;
  /**
   * Which loader signal triggers the fade:
   * - `"ready"` (default) — the moment the loader *starts* lifting.
   * - `"revealed"` — once the loader has *fully* lifted. Use this for entrances
   *   that must be seen fading in on the revealed page (e.g. the header),
   *   otherwise the fade plays behind the still-opaque overlay and looks instant.
   */
  gate?: "ready" | "revealed";
  className?: string;
}

/**
 * Opacity-only entrance gated on the intro loader (`useLoaderStore.ready`).
 *
 * Unlike `<Appear>`, this applies **no** transform or filter — both create a
 * containing block that breaks `position: fixed` descendants (the showreel's
 * fixed aurora + portfolio). Use this to reveal page regions that contain fixed
 * children; reach for `<Appear>` on self-contained blocks that want travel/blur.
 * A list of `delay`s across siblings reads as one staggered page entrance once
 * the loader lifts.
 */
export const RevealOnLoad = ({
  children,
  tag = "div",
  delay = 0,
  gate = "ready",
  className,
}: RevealOnLoadProps) => {
  const active = useLoaderStore((s) => (gate === "revealed" ? s.revealed : s.ready));
  const styles = useSpring({
    from: { opacity: 0 },
    opacity: active ? 1 : 0,
    delay: active ? delay : 0,
    // Long, gentle ease-in-out (NOT a front-loaded ease-out) so the whole fade is
    // perceptible — the region clearly resolves from 0→1 on the revealed page.
    config: { duration: 800, easing: easings.easeInOutCubic },
  });

  const Tag = TAGS[tag];
  return (
    <Tag style={styles} className={className}>
      {children}
    </Tag>
  );
};
