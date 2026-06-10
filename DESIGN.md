---
name: ClaimWise
description: AI-powered insurance policy analysis platform
colors:
  ink: "#14213d"
  paper: "#f8fafc"
  midnight: "#020617"
  stone: "#64748b"
  cloud: "#e2e8f0"
  rose: "#ef4444"
  white: "#ffffff"
  teal: "#14b8a6"
  blue: "#0ea5e9"
  yellow: "#eab308"
  orange: "#f97316"
typography:
  display:
    fontFamily: "Instrument Serif, Georgia, serif"
    fontSize: "clamp(2rem, 5vw, 3.5rem)"
    fontWeight: 400
    lineHeight: 1.1
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
    letterSpacing: "0.05em"
rounded:
  sm: "4px"
  md: "6px"
  lg: "10px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
  badge:
    backgroundColor: "{colors.cloud}"
    textColor: "{colors.stone}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
---

# Design System: ClaimWise

## 1. Overview

**Creative North Star: "The Trust Archive"**

ClaimWise is the desk where insurance becomes clear — authoritative in its knowledge but frictionless in its use. The visual system is anchored in confidence and precision: deep navy ink on warm off-white paper, with sharp, readable typography and purposeful white space. This is a tool that respects the gravity of insurance documents while never feeling like the insurance company itself.

The interface rejects the generic SaaS playbook. No purple-to-blue gradients, no glassmorphism, no side-stripe borders, no numbered "01 / 02 / 03" section scaffolding. Instead, it leans on a restrained toolkit — one strong accent, one text hierarchy that works on sight, and a tonal layering system that conveys depth without excessive shadows. The feeling is archival, curated, and quietly powerful.

**Key Characteristics:**
- Authoritative but not bureaucratic — trust through precision, not ornament
- Data-forward: analysis, comparisons, and policy text are the hero
- Calm complexity: generous whitespace, progressive disclosure, clear scanning hierarchies
- Dark mode as a genuine alternative, not an afterthought

## 2. Colors

A restrained palette built around deep navy ink and cool paper, with a single teal accent for interactive signals. No secondary accent — the product communicates through hierarchy, not color variety.

### Primary

- **Ink** (#14213d / oklch(0.22 0.038 265)): The primary action color and dark-mode background. Used for button fills, navigation backgrounds, and heavy headings. Reads as near-black dark navy — serious but not cold.
- **Paper** (#f8fafc / oklch(0.97 0.005 240)): The light-mode body background. A cool off-white — never cream or beige. Provides a clean, clinical canvas for insurance data.
- **Midnight** (#020617 / oklch(0.06 0.015 260)): The dark-mode background. A blue-tinted near-black that gives depth without crushing contrast.

### Neutral

- **White** (#ffffff): Card and surface backgrounds in light mode. Used for elevated containers.
- **Stone** (#64748b / oklch(0.55 0.03 255)): Muted body text, secondary labels, placeholder text. Never pure gray — always carries a hint of blue-cast neutrality.
- **Cloud** (#e2e8f0 / oklch(0.87 0.01 250)): Borders, dividers, and disabled-state surfaces. Light enough to stay in the background, defined enough to create structure.
- **Eclipse** (#1e293b / oklch(0.25 0.02 260)): Dark-mode surface backgrounds (cards, sidebars) — a lighter step up from Midnight for container hierarchy.

### Semantic

- **Rose** (#ef4444 / oklch(0.6 0.22 30)): Destructive actions, error states, deletion. Used sparingly — its rarity is its signal strength.
- **Teal** (#14b8a6 / oklch(0.7 0.12 195)): Chart primary color and success/positive signals. Complements Ink without competing for authority.

### Named Rules

**The One Accent Rule.** Teal is the only active accent. Primary actions, links, and success states use it. If something is teal, it's interactive or positive. Rare is the point.

**The No-Warm-Background Rule.** Paper stays cool (blue-cast, not cream). Warmth comes from Instrument Serif headings and human tone in copy, not from the canvas.

## 3. Typography

**Display Font:** Instrument Serif (with Georgia, serif fallback)
**Body Font:** Inter (with system-ui, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (for code, policy numbers, and data values)

**Character:** A restrained editorial pairing. Instrument Serif carries authority and warmth — it's the voice of an expert who doesn't need to shout. Inter is precise, legible, and quietly technical. The contrast between them creates hierarchy without scale gymnastics.

### Hierarchy

- **Display** (Instrument Serif 400, clamp(2rem, 5vw, 3.5rem), 1.1): Hero headings, landing value props, feature headers. Never used for body or navigation.
- **Headline** (Inter 600, 1.25rem / 20px, 1.3): Section titles, dashboard panel headers. The primary heading level for product UI.
- **Title** (Inter 500, 1rem / 16px, 1.4): Card titles, dialog headers, sub-section labels.
- **Body** (Inter 400, 0.875rem / 14px, 1.6): All body copy, table cells, descriptions. Line length capped at 72ch for readability.
- **Label** (Inter 500, 0.75rem / 12px, 1.333, 0.05em letter-spacing): Form labels, badge text, timestamps, metadata. Use uppercase sparingly — only for short labels (≤4 words).

### Named Rules

**The Instrument Rule.** Instrument Serif is reserved for display-scale headings only. Never use it for body copy, navigation, or buttons. Its rarity is what makes it authoritative.

## 4. Elevation

The system uses a hybrid approach: tonal layering for structural hierarchy (light: paper → white, dark: midnight → eclipse) with subtle shadows for interactive states only. Surfaces are flat at rest; shadows appear as a response to hover, focus, or active states.

This avoids the "floating card" problem while preserving tactile feedback on interactive elements.

### Shadow Vocabulary (interactive states only)

- **Hover-raise** (`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08)`): Applied to cards and buttons on hover. A subtle lift that signals affordance without dramatics.
- **Modal-elevation** (`box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12)`): Used for dialogs, dropdowns, and menus. The only cast shadow in the system.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. No shadows on cards, sidebars, or panels in their default state. Shadow is a response, not an aesthetic choice.

## 5. Components

### Buttons

- **Shape:** Gently rounded edges (6px radius)
- **Primary (default):** Ink background, Paper text. Hover: 90% opacity of Ink (a tonal darkening). Focus-visible: 3px ring at ring color. 8px horizontal, 4px vertical internal padding.
- **Primary (hover):** Same as default — the opacity shift creates a subtle "press" feel.
- **Secondary:** Cloud border, Ink text, transparent background. Hover: Cloud background fill.
- **Ghost:** Ink text, no border or background. Hover: Cloud background. Used in navigation and toolbars.
- **Destructive:** Rose background, white text. Hover: Rose at 90%.

All buttons transition on `color, box-shadow` with 150ms ease. Disabled state at 50% opacity with no pointer events.

### Inputs / Fields

- **Style:** Cloud border (1.5px), transparent background, 6px radius. 12px horizontal, 8px vertical padding.
- **Focus:** Ring color 3px ring with 50% opacity, border shifts to Ring value. Smooth 150ms transition.
- **Placeholder:** Stone text. Never muted-gray-to-the-point-of-invisible.
- **Error:** Rose border, Rose-tinted ring. Error message below in Rose at body size.
- **Disabled:** Cloud background at 50% opacity, cursor not-allowed.

### Cards / Containers

- **Corner Style:** Rounded corners (10px radius).
- **Background:** White (light) / Eclipse (dark).
- **Shadow Strategy:** None at rest. Hover-raise shadow on hover for interactive cards only.
- **Border:** Cloud (1px) in light mode; slightly lighter than Eclipse in dark mode.
- **Internal Padding:** 24px (6 on the spacing scale).
- **Card Header:** 24px horizontal, 6px bottom padding with an optional Cloud bottom border.

### Badges / Chips

- **Style:** Cloud background, Stone text, 4px radius. 8px horizontal, 2px vertical padding.
- **Variants:** Default (Cloud), Primary (Ink text on Cloud background), Success (Teal), Destructive (Rose).

### Navigation (Sidebar)

- **Style:** Full-height panel, Paper or Midnight background. 24px internal padding.
- **Items:** Title-weight Inter, Ink text, 8px vertical padding between items. Active state: 4px left border in Ink (but never a side-stripe — the SKILL.md prohibits this). Instead, active items use a Cloud background fill with bold text weight.

## 6. Do's and Don'ts

### Do:

- **Do** use the Ink-Paper-Midnight triad as your primary palette. These three carry 90% of the surface area.
- **Do** reserve Instrument Serif for display headings only. Its presence should feel like a headline in a serious publication.
- **Do** let data breathe. Analysis results, comparison tables, and policy text need generous padding and clear visual hierarchy.
- **Do** use teal for interactive elements — it's the single accent that signals "you can click this."
- **Do** comply with WCAG AA at minimum: body text ≥4.5:1 contrast, large text ≥3:1.
- **Do** honor reduced motion preferences — all animations must degrade gracefully to instant transitions.

### Don't:

- **Don't** use Inter as the only font — the palette calls for the Instrument Serif counterpoint.
- **Don't** use gradient text, glassmorphism, or side-stripe borders. These are explicitly prohibited.
- **Don't** use numbered section markers (01 / 02 / 03) as default scaffolding.
- **Don't** put tiny uppercase tracked eyebrows above every section. One deliberate kicker as a brand system is voice; every-section eyebrows are AI grammar.
- **Don't** create identical card grids (same-sized cards with icon + heading + text, repeated endlessly).
- **Don't** use purple-to-blue gradients, bounce/elastic easing, or cream/beige backgrounds.
- **Don't** wrap everything in cards or nest cards inside cards.
- **Don't** use pure black or pure gray — always tint toward the brand hue.
