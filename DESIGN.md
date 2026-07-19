---
name: Watchlist
description: A compact personal movie and series database with a restrained cinematic interface.
colors:
  deep-teal-black: "#071014"
  raised-teal-charcoal: "#101b20"
  overlay-teal: "#17272d"
  quiet-border: "#26393f"
  signal-teal: "#0f9f9a"
  signal-teal-hover: "#14b8ad"
  warm-white: "#f4f0e8"
  cool-sage-text: "#a9bbb9"
  muted-sage-text: "#6f8384"
  success: "#58c68a"
  warning: "#e7a93c"
  danger: "#d65f4b"
typography:
  headline:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "2.15rem"
    fontWeight: 760
    lineHeight: 1.05
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "0.8rem"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  segmented-selected:
    backgroundColor: "{colors.signal-teal}"
    textColor: "#000000"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  segmented-idle:
    backgroundColor: "{colors.raised-teal-charcoal}"
    textColor: "{colors.cool-sage-text}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "6px 16px"
  poster-card:
    backgroundColor: "{colors.raised-teal-charcoal}"
    textColor: "{colors.warm-white}"
    typography: "{typography.title}"
    rounded: "{rounded.md}"
    padding: "12px"
  search-field:
    backgroundColor: "{colors.raised-teal-charcoal}"
    textColor: "{colors.warm-white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 40px 10px 36px"
---

# Design System: Watchlist

## 1. Overview

**Creative North Star: "The Personal Screening Room"**

Watchlist combines the concentration of a private screening room with the precision of a personal database. Dark, subtly teal surfaces recede behind poster artwork, while compact controls and clear state changes keep collection management fast.

The interface is restrained rather than theatrical: atmosphere comes from artwork and tonal depth, not oversized decoration. It explicitly rejects a large redesign, a generic streaming-service home screen, and decorative UI that competes with routine tasks.

**Key Characteristics:**
- Compact, information-dense controls with 6–8px geometry.
- Artwork-first cards on quiet, layered surfaces.
- One signal-teal accent reserved for selection, focus, and primary state.
- Familiar navigation, tabs, filters, and responsive structural changes.

## 2. Colors

The default palette is deep teal-black with warm white text and a measured teal signal color; alternate themes preserve the same semantic roles.

### Primary
- **Signal Teal** (`#0f9f9a`): Selected navigation, active tabs, focus, progress, and primary interaction state.
- **Signal Teal Hover** (`#14b8ad`): Hover emphasis for active and actionable elements.

### Neutral
- **Deep Teal Black** (`#071014`): Main application background.
- **Raised Teal Charcoal** (`#101b20`): Navigation, controls, cards, and panels.
- **Overlay Teal** (`#17272d`): Hovered and nested surfaces.
- **Quiet Border** (`#26393f`): One-pixel dividers and component outlines.
- **Warm White** (`#f4f0e8`): Primary text.
- **Cool Sage Text** (`#a9bbb9`): Secondary labels and metadata.
- **Muted Sage Text** (`#6f8384`): Tertiary metadata only when contrast remains sufficient.

### Semantic
- **Success** (`#58c68a`): Completion and positive status.
- **Warning** (`#e7a93c`): Ratings and caution.
- **Danger** (`#d65f4b`): Destructive actions and errors.

### Named Rules

**The Signal Rule.** Use the accent for current selection, focus, progress, and primary actions—not as ambient decoration.

## 3. Typography

**Display Font:** Inter with the system sans-serif stack

**Body Font:** Inter with the system sans-serif stack

**Character:** One practical family keeps controls, metadata, and content titles cohesive. Hierarchy comes from weight and compact size steps rather than contrasting display typography.

### Hierarchy
- **Headline** (760, up to `2.15rem`, `1.05`): Route-level page titles.
- **Title** (700, `1rem`, `1.3`): Card titles and prominent component labels.
- **Body** (400, `1rem`, `1.5`): Settings, descriptions, and supporting copy; prose stays within 65–75ch.
- **Label** (720, `0.8rem`, `0.08em`, uppercase where appropriate): Section labels and compact database headers.

### Named Rules

**The Compact Hierarchy Rule.** Strengthen hierarchy through weight before increasing type size; product controls should never feel promotional.

## 4. Elevation

Depth is a hybrid of tonal layering, precise one-pixel borders, and broad low-opacity ambient shadows. OLED mode intentionally removes resting shadows and uses accent response only on interaction.

### Shadow Vocabulary
- **Panel Ambient** (`0 18px 60px rgb(0 0 0 / 0.18)`): Large controls and grouped panels.
- **Card Ambient** (`0 14px 40px rgb(0 0 0 / 0.16)`): Poster cards at rest.
- **Selected Control** (`0 1px 2px rgb(0 0 0 / 0.15)`): Active segmented controls.

### Named Rules

**The Quiet Depth Rule.** Borders define structure; shadows support separation without becoming visible decoration.

## 5. Components

Components are compact, restrained, and explicit about selected state.

### Buttons
- **Shape:** 6–8px corners with compact vertical padding.
- **Primary:** Signal teal with white text; reserve for selected or primary action state.
- **Hover / Focus:** 150–250ms color transitions and a two-pixel accent focus outline.
- **Secondary / Ghost:** Tonal surface changes with secondary text becoming primary text.

### Chips
- **Style:** One-pixel quiet border, raised surface, 6px corners, and compact semibold labels.
- **State:** Selected chips use a low-opacity accent surface, accent text, and a stronger accent border.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** Raised teal charcoal with overlay teal on interaction.
- **Shadow Strategy:** Broad ambient shadow in standard themes; none at rest in OLED.
- **Border:** One-pixel quiet border, shifting toward accent on hover.
- **Internal Padding:** 8–16px depending on density.

### Inputs / Fields
- **Style:** Raised tonal surface, one-pixel border, 8px corners, compact 14–16px text.
- **Focus:** Accent border plus a visible accent ring.
- **Error / Disabled:** Semantic danger treatment or clearly muted state without removing legibility.

### Navigation
- Desktop uses a collapsible 236px side rail; mobile uses a fixed four-item bottom bar.
- Active destinations use a low-opacity accent surface, accent text, and a subtle border.
- Icons use the same 1.8px rounded-stroke vocabulary.

### Segmented Controls
- Use for mutually exclusive peer views such as Library / Upcoming.
- The selected tab is filled with signal teal and high-contrast dark text; idle tabs remain tonal and quiet.
- Preserve `tablist`, `tab`, and `aria-selected` semantics.

## 6. Do's and Don'ts

### Do:
- **Do** use 6–8px geometry and one-pixel borders consistently.
- **Do** preserve the current compact style when adding or reorganizing product surfaces.
- **Do** let posters and backdrops carry most of the visual atmosphere.
- **Do** maintain WCAG 2.2 AA contrast, visible focus, keyboard operation, and reduced-motion behavior.
- **Do** keep active navigation and selected tabs obvious through both color and structure.

### Don't:
- **Don't** make a large redesign; preserve the current compact style.
- **Don't** imitate a generic streaming-service home screen with oversized promotional rails.
- **Don't** add decorative UI that competes with poster artwork or slows collection management.
- **Don't** use glassmorphism, gradient text, colored side-stripe borders, or arbitrary radii.
- **Don't** use the accent as ambient decoration or on every interactive element.
