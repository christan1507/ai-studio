import type { ReactNode } from "react";

export interface EyebrowProps {
  children: ReactNode;
  /** `light` on dark backgrounds, `dark` on light ones. */
  tone?: "dark" | "light";
  className?: string;
}

/** Small section label: a dot followed by the label text (Figma 396:2955). */
export const Eyebrow = ({
  children,
  tone = "dark",
  className,
}: EyebrowProps) => (
  <p
    className={`flex items-center gap-2.5 text-body ${
      tone === "light" ? "text-white" : "text-foreground"
    } ${className ?? ""}`}
  >
    <span
      className={`size-1.5 shrink-0 rounded-full ${
        tone === "light" ? "bg-white" : "bg-foreground"
      }`}
      aria-hidden="true"
    />
    {children}
  </p>
);
