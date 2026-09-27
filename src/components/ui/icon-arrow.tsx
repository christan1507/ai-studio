export interface IconArrowProps {
  className?: string;
}

/** Up-right arrow (↗) used in pill buttons and inline links. Inherits color. */
export const IconArrow = ({ className }: IconArrowProps) => (
  <svg
    viewBox="0 0 18 18"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path d="M5 13 13 5" />
    <path d="M6.5 5H13v6.5" />
  </svg>
);
