"use client";

import { animated, useSpring, easings } from "@react-spring/web";
import { Fragment, memo } from "react";

export interface MarqueeProps {
  items: string[];
}

const Strip = ({ items }: MarqueeProps) => (
  <>
    {items.map((item, i) => (
      <Fragment key={i}>
        <span className="px-[3vw] text-[7vw] tracking-[-0.03em] text-black">
          {item}
        </span>
        <span
          aria-hidden="true"
          className="size-[1.5vw] shrink-0 translate-y-[0.8vw] rounded-full border-2 border-black"
        />
      </Fragment>
    ))}
  </>
);

/**
 * Seamless running strip. The content is rendered twice and translated 0→-50%
 * on an infinite spring loop (25s linear) — the original's CSS `@keyframes
 * marquee` rebuilt spring-side, per the no-CSS-animation rule.
 */
// `memo` so the stage's visibility re-renders don't re-render the marquee (its
// loop spring + interpolation would re-attach and the strip would visibly jump).
export const Marquee = memo(({ items }: MarqueeProps) => {
  const [styles] = useSpring(() => ({
    from: { x: 0 },
    to: { x: -50 },
    loop: true,
    config: { duration: 25000, easing: easings.linear },
  }));

  return (
    <div className="flex w-screen overflow-hidden whitespace-nowrap">
      <animated.div
        className="flex items-center"
        style={{ transform: styles.x.to((x) => `translateX(${x}%)`) }}
      >
        <Strip items={items} />
        <Strip items={items} />
      </animated.div>
    </div>
  );
});
Marquee.displayName = "Marquee";
