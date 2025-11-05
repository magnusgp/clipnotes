# Design Tokens: ClipNotes SaaS Polish

This reference captures the core tokens introduced during the Design & SaaS Polish feature work. Downstream teams can
use these values to align marketing collateral, future UI surfaces, and theme overrides.

## Typography

| Token | Value | Usage |
|-------|-------|-------|
| `font.body` | `"Inter Variable", system` | Default text across monitoring, settings, metrics views |
| `font.display` | `"Space Grotesk Variable", system` | Hero headings, page titles, highlight numerics |
| `font.mono` | `"JetBrains Mono", system` (fallback) | Latency badges, code samples in docs |

## Color Palette

| Token | Light | Dark | Notes |
|-------|-------|------|-------|
| `surface.canvas` | `#0f1729` | `#050914` | Base background gradient canvas |
| `surface.panel` | `rgba(15, 23, 42, 0.72)` | `rgba(5, 9, 20, 0.78)` | Glass panel backgrounds for cards |
| `border.glass` | `rgba(226, 232, 240, 0.16)` | `rgba(148, 163, 184, 0.18)` | Card outlines and table dividers |
| `accent.primary` | `#34d399` | `#22d3ee` | Buttons, toggles, metric highlights |
| `text.primary` | `#f8fafc` | `#f8fafc` | High-contrast copy |
| `text.secondary` | `rgba(226, 232, 240, 0.72)` | `rgba(148, 163, 184, 0.72)` | Explanatory text, helper labels |

## Spacing & Layout

| Token | Value | Purpose |
|-------|-------|---------|
| `radius.card` | `1rem` | Corner radius for glass cards and tables |
| `radius.button` | `9999px` | Pill buttons (refresh, retry) |
| `gap.section` | `3rem` | Vertical spacing between primary dashboard sections |
| `padding.card` | `1.5rem` | Internal padding for metrics/setting cards |

## Motion

| Token | Value | Notes |
|-------|-------|-------|
| `motion.enter` | `{ opacity: [0, 1], y: [24px, 0] }` with `0.25s` duration | Used for hero, stats, and toast entrance |
| `motion.stagger` | `0.08s` | Applies to metric tiles and sparkline bars |
| `motion.hover` | Scale to `1.02`, shadow accent | Interactive cards/buttons hover feedback |
| `motion.reduced` | `opacity` fade only | Applied automatically when `prefers-reduced-motion` is true |

## Theme Overrides

- Default theme derives from `CLIPNOTES_THEME_DEFAULT` environment variable (defaults to dark).
- Operators can provide `theme_overrides` via `/api/config` to change accent colors and surface opacity. The frontend
  merges overrides at runtime, preserving the tokens above as fallbacks.

## Component Mapping

- **Card** (`frontend/src/components/Card.tsx`): consumes `surface.panel`, `border.glass`, `motion.hover`.
- **Hero** (`frontend/src/components/Hero.tsx`): leverages `font.display`, `accent.primary`, `motion.enter`.
- **ThemeToggle** (`frontend/src/components/ThemeToggle.tsx`): toggles `surface.canvas` gradients and persists
  `font` tokens across modes.
- **Settings Forms** (`frontend/src/components/settings/SettingsForms.tsx`): align inputs with `radius.button`,
  `text.secondary`, and `accent.primary` focus rings.
- **Metrics Tiles** (`frontend/src/components/metrics/StatsTiles.tsx`): animate via `motion.stagger`, display numbers in
  `font.display` for emphasis.

All tokens live in Tailwind config utilities (`frontend/src/styles/globals.css`) and can be imported into future slices.
