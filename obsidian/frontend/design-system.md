---
tags: [frontend, design-system, stable]
updated: 2026-05-22
---

# Design System — Tailwind v4

Styling uses **Tailwind CSS v4**, configured entirely in CSS. There is **no
`tailwind.config.js`**. ADR: [[decisions-log]] ADR-0004.

## Where config lives

`src/app/globals.css` is the single config file:

```css
@import "tailwindcss";

:root {
  --background: #000000; /* dark Showreel theme */
  --foreground: #f5f1ec;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-zen);
  --font-script: var(--font-marck);
}
```

Extra CSS layers can be split into `src/style/index.css` and imported.

## Design tokens

All colours, spacing, font sizes, radii, and shadows are **tokens** declared under
`:root` (raw values) and `@theme inline` (Tailwind bindings).

Once a token is in `@theme`, it becomes a utility automatically:

| Token | Generated utilities |
|-------|--------------------|
| `--color-brand` | `bg-brand`, `text-brand`, `border-brand` |
| `--radius-card` | `rounded-card` |
| `--spacing-section` | `pt-section`, `mt-section`, … |

> [!important] The token rule
> **Never** hardcode hex values, pixel spacing, or named colours in `className` or
> inline styles. If a value doesn't exist as a token, **add it to `globals.css`
> first** — with a comment noting where it came from (e.g. a Figma frame).

## CSS layers

Every custom style goes inside a layer — never outside one:

```css
@layer base {        /* element resets & defaults: h1, p, a … */ }
@layer components {  /* pseudo-elements & 3rd-party overrides only — see below */ }
@layer utilities {   /* single-purpose helpers: .scrollbar-none … */ }
```

## Where a style goes (ADR-0012)

`globals.css` is **not** a place to park component styles — it holds tokens and
base resets and stays a few hundred lines forever. Follow this order; the first
match wins:

| Situation | Goes where |
|-----------|-----------|
| One-off styling | Tailwind utilities in `className` — nothing in CSS |
| Repeated pattern with markup / structure / props | a **React component** in `components/ui/` |
| Repeated *pure-utility* combo, no structure | a Tailwind v4 `@utility` |
| Pseudo-elements, 3rd-party DOM overrides, complex selectors | `@layer components` — the genuine exceptions |
| A new colour / spacing / radius value | a **token** in `:root` + `@theme` |

> [!important] The default answer to "this looks repeated" is a **React
> component**, not a CSS class. An eyebrow label with a `::before` dot is an
> `<Eyebrow>` component — not a `.label-eyebrow` global class. `@layer
> components` is for what utilities and components genuinely *cannot* express.

There are currently **no `@layer components` entries** (the Laurin `.card-glass`
was removed with the home rebuild — ADR-0016). The Showreel's genuine effects are
expressed inline where they're dynamic: the star-SVG `mask-image` + animated
`mask-size` on the sphere panel, and the hero title's diagonal gradient
`mask-image` — both spring/scroll-driven, so they live on the component's
`style`, not in CSS.

There are **no CSS Modules** in this project — utilities + components cover
every case (motion is spring-based, so there are no keyframes to co-locate).

## Current theme state

The theme was rewritten **dark** for the Showreel rebuild (ADR-0016, replacing
the Laurin light theme of ADR-0014). Tokens now cover:

- **Colours** — `--background` (`#000`) / `--foreground` (`#f5f1ec`) plus
  Showreel surfaces/ink: `--ink` (target block), `--pf-card`, `--cc-search`,
  `--paper`/`--paper-alt`, `--nav-ink`, `--cc-light-ink`/`--cc-light-muted`. The
  **header** is an opaque segmented bar in **neutral greys**: `--nav-surface`
  (base/1px-gap), `--nav-item` (link tiles, **white**), `--nav-logo` (logo tile,
  slightly darker grey), `--nav-cta` / `--nav-cta-ink` (black CTA). Translucent layers `--nav-border`/`--glass-dark`/
  `--glass-border`/`--hairline`/`--watermark` → utilities `bg-ink`,
  `text-paper`, `border-glass-border`, … One non-colour token stays raw on
  `:root` for inline use: `--card-violet` (slot-4 sphere card face gradient) and
  `--loader-glow` (the violet halo behind the intro-loader star — the `#9a73f0`
  core stop of `--card-violet`). The final block's white margin band is a plain
  `4vmin border-white` (no token).
- **Radii** — viewport-proportional: `--radius-card` (`3vmin`), `--radius-pf`
  (`2.5vmin`), `--radius-slider` (`1.6vmin`), `--radius-grid`, `--radius-target`
  → `rounded-card`, `rounded-pf`, … plus a fixed `--radius-btn` (`8px`,
  `rounded-btn`) shared by every button/pill + the header.
- **No type-scale tokens** — the Showreel's type is bespoke per element and
  viewport-unit based (`text-[18vmin]`, `text-[5.5vmin]`, …) via arbitrary
  utilities, so the `--text-*` scale was dropped.

Sizing/spacing is viewport-unit based (`vmin`/`vw`/`vh`) to match the original's
proportional layout, used through arbitrary utilities. The AdaptiveGrid root
font-scaling remains (harmless — the layout is vmin-driven, not rem-driven).
No `prefers-color-scheme` block (the design is a fixed dark experience).

### Responsive geometry tokens (`--sr-*`)

Because `vmin` collapses to the narrow width in portrait, the Showreel's
proportional geometry is **responsive** (ADR-0024). The handful of constants that
read wrong on phones/tablets — carousel card size/radius/fly-back, sphere heading +
body scales — are declared as `--sr-*` custom properties under `:root` (the
**desktop / SSR default**) and overridden on `document.documentElement` per layout
by `useShowreelLayout`. The single source of truth is `utils/showreel/geometry.ts`
(`GEO[mobile|tablet|desktop]`); the CSS `:root` defaults must stay in sync with its
`DESKTOP` set. JSX/`timeline.ts` read `var(--sr-*)`; the two sphere counter-scales
(JS math) read a numeric `geo` from the same table. This keeps tokens, not literals,
on the proportional geometry — and keeps the spring selectors stable (the browser
swaps the value live). See [[home-page]], [[utils]], [[hooks]].

## Typography

Two faces, both bound in `@theme inline`:
- **Zen Kaku Gothic New** (`next/font/google`, weights 400/500/700) →
  `--font-zen` → `--font-sans` — all UI/headings.
- **Marck Script** (`next/font/google`, 400) → `--font-marck` → `--font-script`
  — the handwritten accent (`font-script`), e.g. the italic "Works" in the
  portfolio title.

Both load in `src/app/layout.tsx` and expose their variables on `<body>`.

## Styling rules

- Use utilities in JSX `className`; keep class strings short and readable.
- Extract a repeated pattern to a **React component** — not a `@layer
  components` class. See *Where a style goes* above (ADR-0012).
- Mobile-first responsive: `sm:` / `md:` / `lg:` / `xl:` prefixes.
- Dark mode: `dark:` prefix or token overrides in a `prefers-color-scheme` block.
- No inline `style` except for dynamic values (e.g. spring-animated values).

## Related

[[component-conventions]] · [[animation-system]] · [[new-page]]
