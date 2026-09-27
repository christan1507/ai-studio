import type { ReactNode } from "react";

export interface ContainerProps {
  children: ReactNode;
  className?: string;
}

/** Centered content column — matches Figma 12-col stretch grid with 40px margins. */
export const Container = ({ children, className }: ContainerProps) => (
  <div
    className={`mx-auto w-full max-w-content px-[40px] ${
      className ?? ""
    }`}
  >
    {children}
  </div>
);

