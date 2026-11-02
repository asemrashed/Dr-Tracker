# Doctor Tracker: DESIGN.md

Design system for the client. **Read this before building or changing any UI.** Tokens live in `src/app/globals.css` (`@theme`); keep both in sync.

Direction: calm, precise, a little "private bank" quiet. Structure borrowed from Mercury (dark ink frame, tonal fills instead of shadows, one solid action per group, light type weights) and IBM Carbon (hairline dividers, strict 4/8px grid, clear focus). Cobalt blue is the only brand color. No third-party brand assets are used.

## Color

| Token | Value | Use |
|---|---|---|
| `primary-600` | `#0052FF` | The single action color: primary buttons, active nav, links, focus ring |
| `primary-700` / `800` | `#003ECC` / `#0B2F94` | Hover / pressed, text on tints |
| `primary-50` / `100` | `#EEF4FF` / `#DBE7FF` | Tinted backgrounds, avatars, selected rows |
| `ink` | `#16203A` | Headings, body |
| `ink-muted` | `#56627E` | Secondary text (5.8:1 on canvas) |
| `ink-subtle` | `#67738E` | Placeholders, disabled (4.5:1 minimum) |
| `canvas` / `surface` | `#F7F9FC` / `#FFFFFF` | Page background / cards |
| `line` / `line-strong` | `#E4E9F2` / `#C9D2E3` | Hairlines / input borders |
| `night`, `night-raised`, `night-line` | `#0B1220`, `#121A2E`, `#1F2A44` | Sidebar and login brand panel |
| `on-night`, `on-night-muted` | `#E8EDF7`, `#9AA6C0` | Text on night surfaces |
| `success-700`, `warning-700`, `danger-600/700` | see `globals.css` | **Text and small badges only**, never large fills |

Charts: use the `primary` ramp for rankings and series; semantic colors only to mean good/bad. Never rely on color alone: pair with labels or values.

## Typography

- **Plus Jakarta Sans** (variable, via `@fontsource-variable`) for UI and headings. **IBM Plex Mono** for phone numbers, IDs and numeric columns.
- Light weights: body 400, UI labels and headings 500, page titles 600. Nothing above 600.
- Scale: page title 26px, section 18px, body 15px, small 13px, caption 12px. Use `tabular` (tabular-nums) for every number in tables and stat cards.

## Shape, spacing, elevation

- Cards `rounded-card` (12px), inputs `rounded-input` (10px), buttons and chips are pills (`rounded-full`).
- 4/8px grid. Page padding 16px mobile / 32px desktop; max content width 1280px.
- **Elevation is tonal**: separate layers with fill and a 1px `line` border. `shadow-float` only for floating layers (dialogs, drawers, popovers).

## Components

- **Button**: one solid `primary` per group; secondary actions use `tint`; low emphasis uses `ghost`; destructive uses `danger`. All submit buttons use the `loading` prop. Height 44px (36px `sm` only on desktop).
- **Inputs**: label above (never placeholder-only), inline error below with `aria-describedby`, `aria-invalid` styling. Password fields use `PasswordInput` (show/hide).
- **Tables** (Phase 2+): sticky header, hairline row dividers, hover tint, right-aligned numerics, skeleton rows that match the layout, designed empty and error states.
- **Sidebar**: fixed 272px `night` panel on desktop, drawer on mobile. Active item is a solid `primary-600` pill.
- **Dialogs**: Radix-based, focus trapped and restored, Escape closes, `shadow-float`.

## Responsive

Breakpoints: mobile-first, `sm` 640, `lg` 1024 (sidebar appears). Tables collapse to cards below `md`. Tap targets at least 44x44. No horizontal page scroll at 360px.

## Do

- Use the primary color sparingly: it should mean "do this" or "you are here".
- Keep copy short and human. Every empty state explains what to do next.
- Honor `prefers-reduced-motion` (global CSS rule plus `MotionConfig reducedMotion="user"`).

## Don't (anti-slop checklist: run after every screen)

- No gradient text, no rainbow gradients, no glassmorphism.
- No emoji as icons or card art. Icons come from `lucide-react` at one stroke weight.
- No oversized hero-style headlines inside the app shell.
- No unstyled shadcn defaults: every primitive is restyled to these tokens.
- No heavy drop shadows, no bold above 600, no more than one solid primary button in a group.
- No placeholder-only labels, no disabled buttons without an explanation, no blank loading states.

## Usability checklist (based on the Vercel web interface guidelines)

- [ ] Tap targets at least 44px, zoom never disabled
- [ ] Every submit shows a loading state and blocks double submit
- [ ] Inline validation next to the field, errors announced (`role="alert"`)
- [ ] Visible focus ring, full keyboard path, dialogs trap and restore focus
- [ ] Icon-only buttons have `aria-label`
- [ ] Loading, empty and error states exist for every data view
- [ ] Long text truncates cleanly, numbers are tabular
