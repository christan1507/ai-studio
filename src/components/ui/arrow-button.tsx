"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { Hover } from "@/components/animation/springs/hover";

export interface ArrowButtonProps {
  href: string;
  label: string;
  className?: string;
}

/**
 * Dark pill CTA: label + a white square that nudges the arrow on hover
 * (Figma 351:297 / 296:112). Hover motion is spring-driven, keyed off the
 * whole anchor via the Hover `trigger` ref.
 */
export const ArrowButton = ({ href, label, className }: ArrowButtonProps) => {
  const ref = useRef<HTMLAnchorElement>(null);

  return (
    <Link
      ref={ref}
      href={href}
      className={`inline-flex items-center justify-between gap-6 rounded-btn bg-ink py-1 pl-6 pr-1 font-sans text-[16px] font-medium leading-[120%] text-white ${
        className ?? ""
      }`}
    >
      <span>{label}</span>
      <Hover
        tag="span"
        trigger={ref as React.RefObject<HTMLElement>}
        from={{ transform: "translate(0rem, 0rem)" }}
        to={{ transform: "translate(0.15rem, -0.15rem)" }}
        config={{ tension: 320, friction: 22 }}
        className="flex size-10 shrink-0 items-center justify-center rounded-chip bg-white text-ink"
      >
        <Image
          src="/assets/icons/arrow.svg"
          alt=""
          width={16}
          height={16}
          className="size-4"
        />
      </Hover>
    </Link>
  );
};
