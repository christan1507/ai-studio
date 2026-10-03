/**
 * Shared HUD primitives.
 *
 * The 3D scene supplies all the colour, so these stay near-monochrome and use
 * blur and opacity for separation. Every interactive element is a real
 * `<button>` with a visible focus ring — the game is fully playable by tapping
 * tiles, and the menus should not be the part that excludes anyone.
 */

import type { ReactNode } from 'react';

export function Panel({
  children,
  className = '',
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): React.ReactElement {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/8 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)] ${className}`}
    >
      {children}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'ghost',
  disabled = false,
  className = '',
  ariaLabel,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly variant?: 'ghost' | 'solid' | 'quiet';
  readonly disabled?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}): React.ReactElement {
  const base =
    'rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition ' +
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ' +
    'disabled:cursor-not-allowed disabled:opacity-35';
  const styles = {
    solid: 'bg-white/90 text-neutral-900 hover:bg-white',
    ghost: 'border border-white/20 bg-white/5 text-white/90 hover:bg-white/15',
    quiet: 'text-white/60 hover:text-white/95',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function IconButton({
  children,
  onClick,
  label,
  active = false,
}: {
  readonly children: ReactNode;
  readonly onClick: () => void;
  readonly label: string;
  readonly active?: boolean;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={
        'grid h-10 w-10 place-items-center rounded-full border transition ' +
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 ' +
        (active
          ? 'border-white/40 bg-white/25 text-white'
          : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/15 hover:text-white')
      }
    >
      {children}
    </button>
  );
}

export function Stars({
  count,
  of = 3,
  size = 'md',
}: {
  readonly count: number;
  readonly of?: number;
  readonly size?: 'sm' | 'md' | 'lg';
}): React.ReactElement {
  const dimension = { sm: 'h-3 w-3', md: 'h-4 w-4', lg: 'h-7 w-7' }[size];
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${count} of ${of} stars`}
    >
      {Array.from({ length: of }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          className={`${dimension} ${index < count ? 'text-white' : 'text-white/20'}`}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M12 2.6l2.6 6.3 6.8.5-5.2 4.4 1.6 6.6L12 16.9l-5.8 3.5 1.6-6.6L2.6 9.4l6.8-.5z" />
        </svg>
      ))}
    </div>
  );
}

export function MicroLabel({
  children,
  className = '',
}: {
  readonly children: ReactNode;
  readonly className?: string;
}): React.ReactElement {
  return <div className={`label-micro text-white/45 ${className}`}>{children}</div>;
}
