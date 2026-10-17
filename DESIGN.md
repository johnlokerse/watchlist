---
name: Watchlist
description: A personal movie and series tracker with an Apple-style interface: system type, translucent materials, grouped lists, bottom sheets, and spring-driven motion over artwork-first content.
colors:
  surface: "#071014"
  surface-raised: "#101b20"
  surface-overlay: "#17272d"
  border-subtle: "#26393f"
  border-strong: "#5c696b"
  accent: "#0f9f9a"
  accent-hover: "#14b8ad"
  text-primary: "#f4f0e8"
  text-secondary: "#a9bbb9"
  text-muted: "#7f9090"
  success: "#58c68a"
  warning: "#e7a93c"
  danger: "#d65f4b"
  on-accent: "#071014"
  on-warning: "#071014"
  on-success: "#071014"
  on-danger: "#071014"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.75rem, 1.35rem + 1.2vw, 2.25rem)"
    fontWeight: 760
    lineHeight: 1.05
    letterSpacing: "-0.022em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "clamp(1.375rem, 1.2rem + 0.8vw, 1.875rem)"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.017em"
  title-2:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 680
    lineHeight: 1.2
    letterSpacing: "-0.014em"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: "-0.003em"
  callout:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  caption:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.35
    letterSpacing: "0.002em"
  label:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.07em"
  micro:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, Segoe UI Variable, Segoe UI, Roboto, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 650
    lineHeight: 1.1
    letterSpacing: "0.01em"
rounded:
  chip: "6px"
  control-sm: "9px"
  control: "10px"
  segmented: "11px"
  row: "12px"
  grouped: "14px"
  card: "12px"
  panel: "16px"
  toast: "16px"
  sheet: "22px"
  pill: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.callout}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-secondary:
    backgroundColor: "color-mix(text-primary 8%, transparent)"
    textColor: "{colors.text-primary}"
    typography: "{typography.callout}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  button-destructive:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-danger}"
    typography: "{typography.callout}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  segmented-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.caption}"
    rounded: "8px"
    padding: "0 14px"
    height: "32px"
  segmented-idle:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    typography: "{typography.caption}"
    rounded: "8px"
    padding: "0 14px"
    height: "32px"
  poster-card:
    backgroundColor: "{colors.surface-overlay}"
    textColor: "{colors.text-primary}"
    typography: "{typography.callout}"
    rounded: "{rounded.card}"
  grouped-list:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.grouped}"
    padding: "10px 16px"
    height: "48px"
  field:
    backgroundColor: "color-mix(text-primary 8%, transparent)"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "40px"
  sheet:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sheet}"
  toast:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    typography: "{typography.callout}"
    rounded: "{rounded.toast}"
    padding: "12px 16px"
---

# Design System: Watchlist

## 1. Overview

**Creative North Star: "The Personal Screening Room, in Apple's hands"**

Watchlist is a personal movie and series tracker that should feel like a native Apple app: the system typeface, translucent chrome that content scrolls beneath, iOS-style grouped lists, bottom sheets that follow the finger, and motion that behaves like physical objects. Posters and backdrops carry the atmosphere; the interface stays quiet, legible, and fast.

The reasoning behind the overhaul lives in `docs/apple-design-overhaul-plan.md`. This document is the resulting contract. Tokens are defined in `src/index.css` (`@theme`) and overridden at runtime per theme in `src/utils/themes.ts`; motion lives in `src/design/motion.ts`; primitives live in `src/components/ui`.

**Key Characteristics:**
- System font with size-specific tracking and leading, never a webfont.
- Soft, continuous geometry: 9–16px control and container radii, a 22px sheet, pills for toggles.
- Translucent materials (blur + saturate) for chrome, sheets, popovers, and toasts, always with a solid fallback.
- Grouped inset lists with hairline separators instead of bordered boxes.
- Spring motion defined by damping ratio and response; feedback on pointer-down; 44pt hit areas.
- One accent per theme for selection, focus, and primary action, with a paired `on-*` ink for text on top of it.
- Thirteen themes (dark, light, and true OLED) that share the same semantic roles.

## 2. Colors

Values below are the Default theme. Every theme in `src/utils/themes.ts` supplies the full set, including all `on-*` inks and `border-strong`, so components never hard-code a color.

### Surfaces
- **Surface** (`#071014`): App background (`.app-bg` adds a faint accent glow at the top).
- **Surface Raised** (`#101b20`): Grouped lists, panels, sheets, cards.
- **Surface Overlay** (`#17272d`): Popover menus, poster placeholders, hovered and nested surfaces.
- **Border Subtle** (`#26393f`) / **Border Strong** (`#5c696b`): Subtle for rare outlines; strong is the high-contrast hairline used under `prefers-contrast: more`.

### Text
- **Text Primary** (`#f4f0e8`), **Text Secondary** (`#a9bbb9`), **Text Muted** (`#7f9090`). Muted is tuned to stay legible on `surface` and `surface-raised`; do not go dimmer.

### Accent and semantic
- **Accent** (`#0f9f9a`) and **Accent Hover** (`#14b8ad`): selection, focus, progress, primary actions, links in tinted/plain buttons.
- **Success** (`#58c68a`), **Warning** (`#e7a93c`, also the star color), **Danger** (`#d65f4b`).
- **On-ink tokens** (`on-accent`, `on-warning`, `on-success`, `on-danger`): the text color to place on each fill, chosen per theme for AA contrast. Dark themes mostly use the surface ink; some themes use white.

### Derived neutrals
Computed from `text-primary` so they adapt to light and dark themes:
- **Fill** (8%): Inputs, segmented track, secondary buttons, steppers.
- **Fill Strong** (16%): Hovered fills, rating-star tracks, grab handles, scrollbar thumbs.
- **Hairline** (9%): Separators and inset outlines.

### Named Rules

**The Signal Rule.** The accent marks current selection, focus, progress, and primary actions. It is not ambient decoration.

**The Ink Rule.** Text on `accent`, `warning`, `success`, or `danger` fills uses the matching `on-*` token, never `text-white`, `text-black`, or a guessed color. The only fixed-white exception is `.material-chip` over artwork.

**The Theme Rule.** Components read semantic tokens only. A new color need becomes a token added to every theme, not a hex in a component.

## 3. Typography

**Font:** the platform system font (`system-ui`, `-apple-system`, `Segoe UI Variable`, `Roboto` fallbacks) with `font-optical-sizing: auto`. No Inter, no webfonts.

**Character:** Hierarchy comes from size-specific tracking and leading, as on Apple platforms: large type is tightened (negative tracking), small type is loosened slightly, and uppercase labels are tracked out.

### Hierarchy
Use the semantic classes in `src/index.css`, not ad hoc font sizes.
- **`.t-display`** (760, fluid 1.75–2.25rem, 1.05, −0.022em): Route titles. `.page-title` is an alias.
- **`.t-title`** (700, fluid 1.375–1.875rem, 1.15, −0.017em): Detail-page and section titles.
- **`.t-title-2`** (680, 1.25rem, 1.2, −0.014em): Sheet and card-group titles.
- **`.t-headline`** (600, 1.0625rem, 1.3, −0.01em): Row titles and prominent labels.
- **`.t-body`** (400, 0.9375rem, 1.47, −0.003em): Descriptions and settings copy; prose stays within 65–75ch.
- **`.t-callout`** (0.875rem, 1.4): Buttons, toasts, secondary body.
- **`.t-caption`** (0.8125rem, 1.35, +0.002em, secondary color): Metadata and helper text.
- **`.t-label`** (700, 0.75rem, +0.07em, uppercase, muted): Section headers above grouped lists. `.section-title` is an alias.
- **`.t-micro`** (650, 0.6875rem, 1.1, +0.01em): Badges and chips over artwork.
- **`.num`**: `tabular-nums` for counts, dates, countdowns, and ratings.

Form fields are 16px on mobile to prevent iOS focus zoom and 15px from 768px up.

### Named Rules

**The Tracking Rule.** Tracking follows size: negative for titles, near zero for body, positive for small caps labels. Don't apply one letter-spacing everywhere.

## 4. Elevation and Materials

Depth comes from translucent materials, inset hairlines, and soft layered shadows rather than heavy borders.

### Materials
- **`.material-chrome`**: `surface` at 72% (78% in light schemes) with `blur(24px) saturate(180%)`. Tab bar, sidebar, sticky toolbars; content scrolls underneath.
- **`.material-sheet`**: `surface-raised` at 94% with `blur(32px) saturate(180%)`, an inset hairline, and `--shadow-sheet`. Sheets, popovers, toasts.
- **`.material-chip`**: `rgb(0 0 0 / .42)` with white text and `blur(12px)`. Small badges over posters.

Fallbacks are mandatory. Under `prefers-reduced-transparency: reduce` the blur is removed and chrome/sheets become the solid `surface` / `surface-raised` (chips go to 82% black). Under `prefers-contrast: more`, chrome and sheets are solid, `hairline` becomes `border-strong`, `fill` strengthens to 14%, and fields get a visible 1px border.

### Shadows
- **`--shadow-chip`** (`0 1px 2px rgb(0 0 0 / .2)`): Badges and the selected segment thumb.
- **`--shadow-card`**: Posters and `.app-panel` at rest; warm-tinted and lighter in light schemes.
- **`--shadow-sheet`**: Sheets, menus, toasts.
- Cards lift `-0.5` (2px) and gain a deeper shadow on hover (pointer devices only). True OLED removes resting shadows, paints surfaces pure black with a `#1c1c22` hairline, and answers hover with an accent glow.

### Named Rules

**The Fallback Rule.** Every translucent surface has an opaque equivalent for reduced transparency and increased contrast.

## 5. Motion

Motion is physical, interruptible, and driven by `motion` (Framer Motion) springs from `src/design/motion.ts`.

- **`appleSpring(response, dampingRatio = 1)`** converts Apple's (response, damping ratio) pair to mass/stiffness/damping. Ratio 1 is critically damped (no overshoot); below 1 adds bounce.
- **`spring.default`** (0.3s, 1.0): thumbs, underlines, toggles, toasts, tab panels.
- **`spring.move`** (0.4s, 1.0): larger repositioning and sheet entry.
- **`spring.sheet`** (0.3s, 0.8): sheets and drawers, only after a flick that carried momentum.
- **`spring.snappy`** (0.2s, 1.0): popovers, menus, and desktop dialog exit.
- **`fade`** (150ms ease-out): cross-fades, and the replacement for any slide under reduced motion.
- **`project(velocity)`** predicts where a flick comes to rest; **`rubberband(overshoot, dimension)`** adds progressive resistance past a boundary.

Behaviors:
- **Press feedback** on pointer-down via the `press` utility (`scale(0.97)`, 100ms ease-out). Cards and rows use the same idea (`0.97` / `0.985` / `0.99`).
- **Gestures** track the finger 1:1, rubber-band past limits, decide dismissal from the projected rest position, and hand release velocity to the spring. Users can grab a moving sheet mid-flight.
- **Shared elements** use `layoutId`: the segmented thumb and the tab underline glide rather than jump.
- **Theme switches** cross-fade color properties over 220ms.
- **Reduced motion**: no scale or translate; press becomes a 0.7 opacity dip, hover lifts and card zoom are disabled, bounce dots become fades, spinners slow, sheets cross-fade instead of sliding, and smooth scrolling is turned off.

### Named Rules

**The Spring Rule.** Use a named spring for movement. Never `transition-all`; transition specific properties (`transition-colors`, `transition-[transform,box-shadow]`), and keep CSS easing for color and opacity only.

## 6. Components

All primitives live in `src/components/ui`. Prefer them over hand-rolled markup.

### Buttons (`Button`, `buttonClasses`)
- **Variants:** `primary` (accent fill, `on-accent` ink), `secondary` (neutral fill), `tinted` (accent 15%), `plain` (accent text), `destructive` (danger fill, `on-danger`), `destructive-tinted`.
- **Sizes:** `sm` 32px / 9px radius, `md` 36px / 10px, `lg` 44px / 12px. Semibold, with `press`, `hit-44`, and a 45% opacity disabled state.
- Use `buttonClasses()` when a link or other element must look like a button.

### Segmented Control
- A `tablist` in a 3px-padded `fill` track (11px radius). The selected segment has an accent thumb (`on-accent` text) that glides on `spring.default`. Sizes `sm` / `md`; optional `fill` for equal widths.
- For mutually exclusive peer views (Library / Upcoming). Arrow keys, Home, and End move selection; `aria-selected` is kept in sync.

### Tabs
- Underline tabs with a 2.5px accent indicator (`layoutId`, `spring.default`), 44px tall, horizontally scrollable with an `edge-fade-x` mask when overflowing. `TabPanel` cross-fades with a 10px offset in the direction of travel. Full tab ARIA wiring.

### Sheet
- Under 768px: a bottom sheet (`material-sheet`, 22px top radius, 5×36px grab handle) that tracks the finger, rubber-bands upward, projects a flick to decide dismiss vs. return, and dims a scrim as it moves. From 768px: a centered dialog that scales out of its trigger (`originRef`).
- Focus trap, Escape to close, scroll lock, focus restore, `role="dialog"` with `aria-labelledby`, and `data-autofocus` for the initial target.

### Menu
- Popover on `material-sheet` over `surface-overlay`, 14px radius, 44px items with 10px radius, `spring.snappy` entry, optional separators and a checkmark for selectable (`menuitemradio`) items.

### Toggle
- iOS switch, 44×28px, white knob that stretches while pressed and moves on `spring.default`; `role="switch"`, `hit-44`.

### Toasts (`ToastProvider`)
- `material-sheet` pill, 16px radius, floating above the mobile tab bar and at the bottom on desktop; `role="status"`. Default 5s.
- **Act now, commit later:** destructive actions apply optimistically and show an **Undo** toast. The action commits only when the toast expires (`onExpire`); Undo cancels it. Prefer undo over confirmation dialogs.

### Rating Stars
- Five stars with half steps, stored as **1–10** (one point per half star). Drag to scrub, or use arrows, Home, and End. Filled stars use `warning`; empty tracks use `fill-strong`. Read-only display uses `role="img"` with "x out of 5".

### Stepper
- iOS-style −/+ pair in a `fill` capsule (9px radius), 44pt hit areas, value always clamped to `min`/`max`, `aria-live` value readout, commits per tap.

### Cards and Lists
- **Poster `Card`:** the 2:3 poster is the surface (12px radius, inset hairline, `shadow-card`); title and metadata sit beneath. Overlaid status, countdown, rating, and progress badges use `material-chip`, or `warning` / `accent` fills with their `on-*` ink. Press scales to 0.97.
- **`ListRow`:** 64px minimum, 40px poster thumb, `t-caption` metadata, chevron; press and hover use `fill`.
- **Grouped lists** (`.grouped` + `.grouped-row`): 14px radius, `surface-raised`, inset hairline outline, 48px minimum rows, separators inset 16px from the left. Used for Settings and other stacked controls. Section headers use `.t-label`.
- **`.database-row`** (12px radius) for dense library rows; **`.app-panel`** (16px) and **`.app-panel-soft`** (14px) for standalone panels.

### Inputs (`.field`, `SearchBar`, `Select`)
- Fill background, 10px radius, no border at rest; focus shows an inset 1.5px accent ring. 40px tall on mobile, 36px from 768px.

### Navigation
- Desktop: collapsible side rail on `material-chrome`. Mobile: fixed four-item bottom bar on `material-chrome`, respecting `--safe-area-*` insets. Active destinations use the accent; icons share a 1.8px rounded stroke.

### Utilities
- **`press`**: pointer-down scale feedback. **`hit-44`**: expands the tap target to 44×44 without changing visual size. **`edge-fade-x` / `edge-fade-bottom`**: scroll edge masks instead of hard dividers. **`hairline-top` / `hairline-bottom`**: inset separators. **`scrollbar-none`**: hide scrollbars on scrollers.

## 7. Do's and Don'ts

### Do:
- **Do** use the system font and the `.t-*` classes; let size-specific tracking and leading carry hierarchy.
- **Do** use the radii in the front matter (9–16px for controls and containers, 22px sheets, pills for switches) and inset hairlines rather than heavy borders.
- **Do** build translucent chrome with `.material-chrome` / `.material-sheet` / `.material-chip`, and verify the solid fallbacks for reduced transparency and increased contrast.
- **Do** animate with the named springs in `src/design/motion.ts`, make gestures interruptible, and give velocity to the spring on release.
- **Do** give every tappable element immediate press feedback (`press`) and a 44×44pt hit area (`hit-44`).
- **Do** pair every fill with its `on-*` ink token, and check that new themes supply all of them plus `border-strong`.
- **Do** prefer grouped lists, sheets, and menus over bordered cards, modals, and `<select>` styling hacks.
- **Do** apply optimistic changes with an Undo toast instead of a confirmation dialog.
- **Do** keep WCAG 2.2 AA contrast, visible focus, full keyboard operation, tab/dialog/switch ARIA semantics, and a reduced-motion path for every animation.
- **Do** use `.num` for numerals that change or align.

### Don't:
- **Don't** use Inter or any webfont, or a single letter-spacing for all sizes.
- **Don't** use `transition-all`, linear or default-ease transitions for movement, or hand-tuned cubic-bezier curves in place of a spring.
- **Don't** hard-code `text-white`, `text-black`, or hex colors on fills; use `on-*` and semantic tokens.
- **Don't** use blur without a solid fallback, or stack blurred surfaces on each other.
- **Don't** ship hit targets under 44pt, or feedback that only appears on release.
- **Don't** use the accent as ambient decoration or on every interactive element.
- **Don't** imitate a generic streaming-service home screen with oversized promotional rails, or add decoration that competes with poster artwork.
- **Don't** use gradient text, colored side-stripe borders, or arbitrary radii.
- **Don't** add scale or translate animations that ignore `prefers-reduced-motion`.
- **Don't** use hover-only affordances; guard hover styling with `@media (hover: hover)` and keep touch parity.
