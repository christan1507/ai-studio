/**
 * @fileoverview Showreel layout signal — reports which proportional geometry set
 * the scroll experience should use (`mobile` / `tablet` / `desktop`) and writes
 * the matching `--sr-*` CSS custom properties onto the document root.
 *
 * The buckets key off **orientation + width**, because the Showreel's `vmin`
 * sizing only breaks in *portrait* (where `vmin` collapses to the narrow width):
 *  - landscape (w > h), any size → `desktop` (vmin tracks height, as designed)
 *  - portrait, width < 640 → `mobile`
 *  - portrait, width ≤ 1024 → `tablet`
 *  - otherwise → `desktop`
 *
 * Like `use-window-size.ts`, it reads from a single shared, debounced `resize`
 * store via `useSyncExternalStore`, so it is SSR-safe and tear-free, and it only
 * re-renders consumers when the bucket actually flips (not every resize pixel).
 *
 * The CSS-var write lets the timeline's pure-string builders stay geometry-
 * agnostic (they emit `var(--sr-…)`), so their react-spring `.to()` selectors
 * never change identity — the browser swaps the value live (no teleport).
 */

"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  GEO,
  geoCssVars,
  type ShowreelGeo,
  type ShowreelLayout,
} from "@/utils/showreel/geometry";

/** Debounce on the shared `resize` listener (ms) — matches `use-window-size`. */
const DEBOUNCE_MS = 200;

/** Server / pre-measure default. Desktop is the byte-identical baseline. */
const SERVER_LAYOUT: ShowreelLayout = "desktop";

const computeLayout = (): ShowreelLayout => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w > h) return "desktop"; // landscape → vmin tracks height, original layout
  if (w < 640) return "mobile";
  if (w <= 1024) return "tablet";
  return "desktop"; // large portrait window → treat as desktop
};

let snapshot: ShowreelLayout =
  typeof window !== "undefined" ? computeLayout() : SERVER_LAYOUT;

const listeners = new Set<() => void>();
let bound = false;
let debounceId: ReturnType<typeof setTimeout> | undefined;

const publish = (): void => {
  const next = computeLayout();
  if (next === snapshot) return; // only notify on a real bucket flip
  snapshot = next;
  listeners.forEach((listener) => listener());
};

const handleResize = (): void => {
  if (debounceId) clearTimeout(debounceId);
  debounceId = setTimeout(publish, DEBOUNCE_MS);
};

const subscribe = (listener: () => void): (() => void) => {
  if (!bound) {
    snapshot = computeLayout();
    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("orientationchange", handleResize, { passive: true });
    bound = true;
  }
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (debounceId) clearTimeout(debounceId);
      bound = false;
    }
  };
};

export interface ShowreelLayoutState {
  layout: ShowreelLayout;
  geo: ShowreelGeo;
}

/**
 * Returns the active Showreel layout + its geometry, and (as a side effect)
 * keeps the `--sr-*` CSS custom properties on `document.documentElement` in sync
 * with it. Call from a single consumer (the stage); everything else inherits the
 * CSS vars.
 */
export function useShowreelLayout(): ShowreelLayoutState {
  const layout = useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => SERVER_LAYOUT,
  );

  useEffect(() => {
    const root = document.documentElement;
    const vars = geoCssVars(GEO[layout]);
    for (const [name, value] of Object.entries(vars)) {
      root.style.setProperty(name, value);
    }
  }, [layout]);

  return { layout, geo: GEO[layout] };
}
