"use client";

import Image from "next/image";
import { useState } from "react";
import { animated, easings, useSpring } from "@react-spring/web";
import { Hover } from "@/components/animation/springs/hover";
import { useLoaderStore } from "@/hooks/use-loader";
import type { NavLink } from "@/data/mocks/home";

export interface SiteHeaderProps {
  nav: NavLink[];
  logo: string;
  /** Black call-to-action pinned to the right of the bar. */
  cta?: { label: string; href: string };
}

/**
 * Floating, opaque **segmented** nav bar. The header itself is click-through
 * (`pointer-events-none`); only the bar is interactive. Each item is its own
 * container, sitting 1px from the bar edges and from each other (the base shows
 * through as hairlines): a square logo tile (slightly darker), equal-width link
 * tiles, and a black CTA. The logo spins 90° on hover and links fade — both
 * spring-driven (no CSS transitions).
 *
 * Responsive: the full link row only fits from `sm` up. On phones (`max-sm`) the
 * links collapse behind a menu toggle into a spring-animated dropdown beneath the
 * bar (logo + CTA stay in the bar), so the segmented bar never overflows the
 * narrow viewport.
 *
 * Entrance: the visible `<nav>` bar (a normal-flow element) fades + slides in
 * once the intro loader has fully lifted (`useLoaderStore.revealed`). The fade
 * lives here — NOT on a wrapper around the fixed `<header>` — because opacity on
 * a wrapper of a `position: fixed` child gets composited separately and snaps
 * instead of animating.
 */
export const SiteHeader = ({ nav, logo, cta }: SiteHeaderProps) => {
  const revealed = useLoaderStore((s) => s.revealed);
  const reveal = useSpring({
    opacity: revealed ? 1 : 0,
    y: revealed ? 0 : -10,
    config: { duration: 700, easing: easings.easeInOutCubic },
  });

  const [open, setOpen] = useState(false);
  // Mobile dropdown open/close — spring-driven (no CSS transitions per house rules).
  const menu = useSpring({
    opacity: open ? 1 : 0,
    y: open ? 0 : -8,
    config: { tension: 260, friction: 26 },
  });

  return (
    <header className="pointer-events-none fixed left-0 top-[2vmin] z-[100] flex w-full flex-col items-center">
      <animated.nav
        className="pointer-events-auto flex items-stretch gap-[1px] rounded-btn bg-nav-surface p-[1px]"
        style={{
          opacity: reveal.opacity,
          transform: reveal.y.to((y) => `translateY(${y}px)`),
        }}
      >
        <a
          href="#"
          aria-label="Home"
          className="flex h-[40px] w-[40px] items-center justify-center rounded-btn bg-nav-logo"
        >
          <Hover
            tag="span"
            from={{ transform: "rotate(0deg)" }}
            to={{ transform: "rotate(90deg)" }}
            config={{ tension: 200, friction: 18 }}
            className="flex items-center justify-center"
          >
            <Image src={logo} alt="" width={18} height={18} priority />
          </Hover>
        </a>

        {/* Inline link row — visible from `sm` up. */}
        <ul className="hidden items-stretch gap-[1px] sm:flex">
          {nav.map((link) => (
            <li key={link.label} className="flex">
              <a
                href={link.href}
                className="flex h-[40px] w-[88px] items-center justify-center rounded-btn bg-nav-item max-[760px]:w-[66px]"
              >
                <Hover
                  tag="span"
                  from={{ opacity: 1 }}
                  to={{ opacity: 0.55 }}
                  config={{ tension: 300, friction: 26 }}
                  className="block text-[15px] text-nav-ink max-[760px]:text-[13px]"
                >
                  {link.label}
                </Hover>
              </a>
            </li>
          ))}
        </ul>

        {/* Menu toggle — phones only (`max-sm`). */}
        <button
          type="button"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-[40px] w-[40px] items-center justify-center rounded-btn bg-nav-item sm:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="text-nav-ink">
            {open ? (
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            ) : (
              <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            )}
          </svg>
        </button>

        {cta && (
          <a
            href={cta.href}
            className="flex h-[40px] items-center justify-center rounded-btn bg-nav-cta px-[22px] text-[15px] font-medium text-nav-cta-ink max-[760px]:px-[16px] max-[760px]:text-[13px]"
          >
            {cta.label}
          </a>
        )}
      </animated.nav>

      {/* Mobile dropdown — stacked links, beneath the bar. `max-sm` only; kept in
          the DOM so the spring can animate it, but pointer-events gated on `open`
          so the closed (invisible) panel isn't clickable. */}
      <animated.div
        className="pointer-events-none mt-[1vmin] w-[calc(100%-8vmin)] max-w-[420px] overflow-hidden rounded-btn bg-nav-surface p-[1px] sm:hidden"
        style={{
          opacity: menu.opacity,
          transform: menu.y.to((y) => `translateY(${y}px)`),
        }}
      >
        <ul className={`flex flex-col gap-[1px] ${open ? "pointer-events-auto" : ""}`}>
          {nav.map((link) => (
            <li key={link.label} className="flex">
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex h-[44px] w-full items-center justify-center rounded-btn bg-nav-item text-[15px] text-nav-ink"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </animated.div>
    </header>
  );
};
