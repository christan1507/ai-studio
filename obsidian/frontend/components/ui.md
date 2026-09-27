---
tags: [frontend, components, ui, stable]
updated: 2026-06-20
---

# Components Catalog — `components/ui/`

Design-system primitives — stateless, token-driven, reusable across pages. See
[[component-conventions]] for placement rules and [[design-system]] for the
tokens these consume. First introduced with the [[home-page]] build (ADR-0014).

| Component | Type | Purpose |
|-----------|------|---------|
| `Container` | Server | Centred content column — `max-w-content` + responsive gutter (`px-5 md:px-10`). Wrap every section's content. |
| `Eyebrow` | Server | Small section label: a dot + text. `tone="dark" \| "light"` for light/dark backgrounds. |
| `IconArrow` | Server | Inline up-right arrow (↗) SVG, `stroke="currentColor"`. Sized via `className` (`size-*`). |
| `ArrowButton` | **Client** | Dark pill CTA: label + white square whose arrow nudges on hover. Hover motion is spring-driven via `<Hover>` keyed off the anchor ref. Wraps `next/link`. |
| `TextReveal` | **Client** | Word-by-word **blur + opacity** heading reveal built on `TextEngine` — the sanctioned text-animation path. Props: `tag`, `mode` (`once`/`always`/`forward`), `stagger`, `delayIn`. |
| `Appear` | **Client** | Blur + opacity entrance reveal **gated on the intro loader** (`useLoaderStore`). `delay` for stagger, `y`/`blur` to tune, `gated={false}` to play on mount instead. Built on `<Spring enabled>`. |
| `RevealOnLoad` | **Client** | **Opacity-only** region reveal gated on the intro loader. Unlike `Appear` it applies **no** transform/filter (those create a containing block that breaks `position: fixed` descendants — the showreel's fixed aurora/portfolio). `easeInOutCubic` (800ms) fade; `delay` staggers siblings; `tag` renders a semantic landmark (`main`/`header`/…). `gate` chooses the trigger: `"ready"` (loader *starts* lifting, default) or `"revealed"` (loader *fully* lifted, for entrances that must be seen on the revealed page). ⚠️ Wraps children in an opacity `<div>` — do **not** use it around a `position: fixed` child (opacity on a fixed-child wrapper snaps instead of animating; e.g. `SiteHeader` reveals its own normal-flow nav instead). |

## Notes

- `ArrowButton`, `TextReveal` and `Appear` are the client leaves here — the rest
  are Server Components.
- Animating a string spring through a fully-transparent `rgba(...,0)` (e.g. a
  `boxShadow` fade-in) throws react-spring's *"arity of each output must be
  equal"* and mismatches SSR hydration — keep such hovers transform-only or use
  a non-zero alpha at both ends. See [[decisions-log]] ADR-0015.
- `TextReveal` forces value-type matching across `lineIn`/`lineOut`
  (`y: "0%"` / `y: "115%"`, opacity numbers) per the [[text-engine]] gotcha.
- Multi-line forced headings (e.g. "Raw truth." over "Real transformation")
  use stacked `<Inview>` spans rather than `TextReveal`, because the engine
  splits lines by measured layout, not explicit breaks.

## Related

[[components/common]] · [[components/animation-springs]] · [[design-system]] · [[home-page]]
