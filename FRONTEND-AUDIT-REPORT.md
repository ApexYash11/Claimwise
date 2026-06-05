# ClaimWise Frontend Architecture & Implementation Strategy Report

> **Date:** June 2026
> **Goal:** Premium 2026 SaaS experience — Stripe/Linear/Arc/Notion caliber
> **Constraint:** NOT generic AI startup aesthetics

---

## Table of Contents

1. [Current State Analysis](#1-current-state-analysis)
2. [Tool-by-Tool Evaluation](#2-tool-by-tool-evaluation)
3. [Alternatives Evaluation](#3-alternatives-evaluation)
4. [Scorecard](#4-scorecard)
5. [Ideal Frontend Stack](#5-ideal-frontend-stack)
6. [PHASE 1 — Foundation (1 Day)](#6-phase-1--foundation-1-day)
7. [PHASE 2 — UX Modernization (1 Week)](#7-phase-2--ux-modernization-1-week)
8. [PHASE 3 — Premium Polish](#8-phase-3--premium-polish)
9. [Files to Delete / Deprecate](#9-files-to-delete--deprecate)
10. [Priority Matrix](#10-priority-matrix)

---

## 1. Current State Analysis

### 1.1 Technology Stack

| Layer | Current Choice | Status |
|-------|---------------|--------|
| Framework | Next.js 15.5 (App Router, Turbopack) | ✅ Keep |
| Language | TypeScript 5.x strict | ✅ Keep |
| Styling | Tailwind CSS 3.4 + PostCSS | ✅ Keep |
| Design System | shadcn/ui (New York, neutral base) | ✅ Keep |
| Icons | lucide-react 0.454 | ✅ Keep |
| Charts | recharts 2.15 | ✅ Keep |
| Forms | react-hook-form 7.60 + zod 3.25 | ✅ Keep |
| Auth | @supabase/supabase-js 2.44 | ✅ Keep |
| Theme | next-themes 0.4 | ✅ Keep |
| Toast | sonner 1.7 | ✅ Keep |
| Carousel | embla-carousel-react 8.5 | ✅ Keep |
| Drawer | vaul 0.9 | ✅ Keep |
| Command | cmdk 1.0 (installed but UNUSED) | ⚠️ Integrate |
| Animation | CSS-only (fade-rise, float-soft, glow-pulse) | ❌ Replace |
| Testing | None | ❌ Add |
| Font Sans | Inter | ✅ Keep |
| Font Serif | Merriweather | ❌ Replace |
| Font Mono | JetBrains Mono | ✅ Keep |

### 1.2 Critical Issues Found

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | Zero animation library — CSS-only keyframes feel 2018 | High | `app/globals.css:168-199` |
| 2 | Merriweather font is wrong — newspaper serif, not premium | High | `app/layout.tsx:17-22` |
| 3 | Border radius 0.3rem (~4.8px) is too small for modern UI | Medium | `app/globals.css:44` |
| 4 | All pages are "use client" — zero RSC usage | Medium | All page files |
| 5 | Fake upload progress simulation | Medium | `app/upload/page.tsx:68-76` |
| 6 | confirm()/alert() in analyze page | Medium | `app/analyze/page.tsx:284` |
| 7 | Dead code: styles/globals.css (Tailwind v4 + OKLCH, unimported) | Low | `styles/globals.css` |
| 8 | CMDK installed but not used anywhere | Low | `package.json` |
| 9 | Gradient blobs + grid pattern on hero (generic AI SaaS look) | High | `app/page.tsx:51-54` |
| 10 | No page transitions — instant cuts between routes | Medium | All pages |
| 11 | Dashboard is static — no microinteractions | High | `app/dashboard/page.tsx` |
| 12 | compare page uses hardcoded `bg-gray-50` instead of design tokens | Medium | `app/compare/page.tsx:41,58` |
| 13 | No Playwright or test setup | High | — |
| 14 | `images.unoptimized: true` in next.config | Low | `next.config.mjs` |

---

## 2. Tool-by-Tool Evaluation

### 2.1 Impeccable

**What it solves:** The color system is hand-written HSL variables with no cohesive ramp. Impeccable generates a complete token system from a seed color.

**Pages/components:** None at runtime. Design-time code generation only.

**Files to modify:**
- `app/globals.css` — Replace HSL variable section with generated OKLCH tokens
- `tailwind.config.js` — Update color references to match new tokens

**Dependencies to install:**
- `npx @pbakaus/impeccable` (no install needed — use via npx once)

**Risks:**
- Output is generic without customization
- OKLCH has slightly different perceptual spacing than HSL

**Performance:** Zero runtime cost.

**Effort:** Low (30 min generate + 30 min customize)

**UX Impact:** Medium-High (cohesive color system is foundational)

**Decision: ADOPT SELECTIVELY** — Use one-time to generate initial ramp with a custom seed color (deep navy, not generic teal). Discard generated components. Hand-tune the output: increase radius tokens, add accent-2 color, adjust lightness for better contrast.

---

### 2.2 SkillUI

**What it solves:** Helps reverse-engineer design tokens from Stripe, Linear, and Mercury so ClaimWise can match their spacing, color, and type scales.

**Pages/components:** None. Development-only analysis tool.

**Files to modify:** None (produces a report).

**Dependencies:** `npx skillui <url>` — no install.

**Risks:** Extraction quality varies. Can encourage copying instead of understanding.

**Performance:** None.

**Effort:** Low (15 min per reference site)

**UX Impact:** Low-Medium (informational)

**Decision: USE DURING DEVELOPMENT ONLY** — Run against Stripe landing page, Linear dashboard, Mercury marketing page during Phase 1. Use as reference when tuning tokens. Do not commit results.

---

### 2.3 WebGPU UI

**What it solves:** The hero section has no visual "wow" moment.

**Pages/components:** Hero section ambient background only.

**Files to modify:**
- New: `components/effects/ambient-bg.tsx`
- Modified: `app/page.tsx` — Replace gradient blob divs

**Dependencies:** None (browser API). Would need utility code for WebGL2 fallback.

**Risks:**
- ~60% browser coverage (no Safari, no Firefox stable)
- Significant battery drain on mobile
- High dev complexity

**Performance:** GPU-efficient when supported, but fallback doubles code.

**Effort:** High (2-3 days)

**UX Impact:** Medium (nice-to-have)

**Decision: REJECT.** Browser support gap is too large. A well-crafted CSS gradient with subtle Motion animation achieves 90% of the effect at zero compatibility cost. If GPU is needed, use Three.js with WebGL fallback instead.

---

### 2.4 Awesome Design

**What it solves:** Lack of design inspiration for premium sections (testimonials, feature showcases, comparison tables).

**Pages/components:** None. Reference only.

**Files to modify:** None.

**Risks:** Designs may be outdated. Encourages copy-paste.

**Performance:** None.

**Effort:** Low (browsing time)

**UX Impact:** Low-Medium

**Decision: USE DURING DEVELOPMENT ONLY** — Browse for specific patterns, then implement custom components matching ClaimWise's brand.

---

### 2.5 Stitch (Google)

**What it solves:** Rapid prototyping.

**Pages/components:** None. Design-time only.

**Risks:**
- AI-generated design — directly contradicts the goal of avoiding AI aesthetics
- Generates flat images, not code

**Decision: REJECT.** The user explicitly wants to avoid generic AI-generated aesthetics. Using an AI design generator would produce the exact look to avoid.

---

### 2.6 UI/UX Pro Max

**What it solves:** UX patterns for dashboard layout, settings page structure, empty states.

**Pages/components:** Dashboard, profile page reference.

**Files to modify:** None. Reference only.

**Risks:** Pattern quality varies. Some are generic.

**Effort:** Low

**UX Impact:** Low-Medium

**Decision: USE DURING DEVELOPMENT ONLY** — Reference for specific UX challenges. Do not copy blindly.

---

### 2.7 21st.dev

**What it solves:** Biggest UX gap — no polished animated components. 21st.dev provides production-ready animated React components on Framer Motion.

**Pages/components:**
- Landing page: hero animation, feature cards, testimonial carousel
- Dashboard: animated metric counters, hover effects

**Files to modify:**
- New: Individual component integrations per page
- Modified: Page files that wrap imported components

**Dependencies to install:**
- `motion` (required by 21st.dev components)
- Individual 21st.dev packages

**Risks:**
- Paid components
- External dependency risk
- May not match design system without customization

**Performance:** Framer Motion is well-optimized. ~32KB gzipped. Acceptable.

**Effort:** Medium (1-2 days for integration + customization)

**UX Impact:** High (directly addresses static/boring problem)

**Decision: ADOPT SELECTIVELY** — Use specific components for landing page hero and feature cards. Do NOT adopt wholesale. Prefer Motion directly for custom animations.

---

### 2.8 Taste

**What it solves:** Automated design review — catches visual inconsistencies, alignment issues, accessibility problems.

**Pages/components:** None. QA tool.

**Risks:** AI feedback can be generic. False positives.

**Effort:** Low

**UX Impact:** Low-Medium (QA tool, not UX improvement)

**Decision: USE DURING DEVELOPMENT ONLY** — Add to design review workflow before merging significant visual changes.

---

### 2.9 Playwright

**What it solves:** Zero tests exist. Playwright provides E2E tests, visual regression, accessibility audits.

**Pages/components:** All pages. Core flows:
1. Auth flow (signup → login → redirect)
2. Upload flow (upload → processing → analyze)
3. Chat flow (select policy → ask question → see response)
4. Visual regression on key pages
5. Accessibility audit per page

**Files to modify:**
- New: `e2e/` directory with test files
- Modified: `package.json` — add test scripts
- New: `playwright.config.ts`
- Modified: CI/CD workflow

**Dependencies to install:**
- `@playwright/test` (dev)
- Playwright browsers (`npx playwright install`)

**Risks:**
- Flaky tests (timing, network)
- Visual regression needs baseline screenshots
- Adds CI time

**Effort:** Medium-High (3-5 days for comprehensive setup)

**UX Impact:** High (catches regressions)

**Decision: ADOPT.** Non-negotiable for production SaaS. Start with 3 core E2E flows + accessibility audit.

---

## 3. Alternatives Evaluation

### 3.1 Motion (replaces Framer Motion)

**Why better:** `motion` is the React-19-native fork of Framer Motion. It has better tree-shaking, smaller bundle (~25KB vs 32KB), and is maintained by the same team. Since ClaimWise uses Next.js 15.5 with React 18 (`react@^18.2.0`), verify compatibility — if on React 18, use `framer-motion` instead. If upgrading to React 19, use `motion`.

**Where to use:**
- Page transitions: `motion.div` with `AnimatePresence`
- Scroll-triggered reveals: `useInView`
- Stagger children (activity feed, policy list)
- Button/card hover interactions
- Dashboard metric count-up
- Mobile menu slide-in
- Loading skeleton shimmer

**Install:** `npm install motion` (or `npm install framer-motion` for React 18)

**Files to modify:** Every page file. Root layout for page transitions.

---

### 3.2 Lenis

**Why better:** Provides smooth scrolling with easing curves. Makes scroll-triggered animations feel premium. Stripe and Linear both use smooth scroll libraries.

**Where to use:** Landing page only (not dashboard/analyze/chat where native scroll is expected).

**Install:** `npm install @studio-freight/lenis`

**Files to modify:**
- `app/page.tsx` — Wrap content with `<Lenis>` component
- New: `components/landing/smooth-scroll.tsx` — Lenis wrapper with disable logic

**Bundle cost:** ~5KB gzipped

---

### 3.3 React Bits

**Why better:** Production-grade animated components (text effects, counters, typing animation) without full animation library complexity. Good for micro-interactions.

**Where to use:**
- Landing page hero: animated text reveal, typing effect for tagline
- Dashboard: animated number counters
- Upload page: progress text animation

**Install:** `npm install @reactbits/animated-text` (or specific packages)

---

### 3.4 Magic UI / Aceternity UI

**Why better than 21st.dev:** Free, open-source, provide similar animated components. Aceternity has better long-term stability. Both built on Framer Motion.

**Where to use:**
- Landing page hero (Aceternity Spotlight, Magic UI AnimatedGrid)
- Feature sections (bento grid layouts)
- Dashboard cards (hover effects)

**Install:** `npm install @magicui/react` or copy individual Aceternity components

**Bundle cost:** Same as Motion/Framer Motion (shared dependency)

---

### 3.5 Rive

**Why better than WebGPU UI:** Interactive vector animations with <100KB runtime. Supports state machines (hover, press, toggle). Works on all browsers via Canvas2D or WebGL.

**Where to use:**
- Landing page hero: animated illustration of policy analysis flow
- Upload page: animated document processing visualization
- Empty states: animated illustrations instead of static icons

**Install:** `npm install @rive-app/react-canvas`

**Files to modify:** Landing page, upload page, empty state components.

**Asset requirement:** Requires Rive editor (desktop app) to create .riv animation files.

---

### 3.6 CMDK (already installed)

**Status:** Already in `package.json` (`cmdk: 1.0.4`) but NOT used.

**Action:** Integrate as a command palette (⌘K) on dashboard.

**Where to use:** `app/dashboard/page.tsx`

**Files to modify:**
- New: `components/dashboard/command-palette.tsx`
- Modified: `app/dashboard/page.tsx`

**Actions to include:**
- Upload Policy
- View Analysis
- Open Chat
- Compare Policies
- Go to Profile
- Toggle Theme

---

### 3.7 React Three Fiber

**Evaluation:** If interactive 3D is desired for policy data visualization.

**Decision: REJECT.** 3D adds significant complexity with unclear UX benefit for insurance policy data. Stick to 2D charts (Recharts — already installed).

---

## 4. Scorecard

| Tool | UX Impact | Engineering Cost | Performance Risk | Bundle Impact | Recommendation |
|------|-----------|-----------------|-----------------|---------------|---------------|
| **Impeccable** | Medium-High | Low | None | 0KB | Adopt Selectively |
| **SkillUI** | Low | Low | None | 0KB | Dev Only |
| **WebGPU UI** | Medium | High | High (battery) | ~15KB | Reject |
| **Awesome Design** | Low-Medium | Low | None | 0KB | Dev Only |
| **Stitch** | Negative | Low | None | 0KB | Reject |
| **UI/UX Pro Max** | Low-Medium | Low | None | 0KB | Dev Only |
| **21st.dev** | High | Medium | Low | ~32KB | Adopt Selectively |
| **Taste** | Low-Medium | Low | None | 0KB | Dev Only |
| **Playwright** | High | Medium-High | None (CI) | 0KB | Adopt |
| **Motion** | Very High | Medium | Low | ~25KB | **ADOPT — CORE** |
| **Lenis** | Medium | Low | Low | ~5KB | Adopt Selectively |
| **React Bits** | Medium | Low | Very Low | ~5KB | Adopt Selectively |
| **Magic UI** | High | Medium | Low | ~10KB | Adopt Selectively |
| **Rive** | High | Medium | Low | ~30KB | Adopt Selectively |
| **CMDK** | High | Low | None | Already installed | **ADOPT — INTEGRATE** |

---

## 5. Ideal Frontend Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | Next.js 15.5 (App Router) | Already invested. Keep. |
| **Animation Engine** | **Motion** (or framer-motion for React 18) | Industry standard. GPU-composited. Best React integration. |
| **Smooth Scroll** | Lenis | Landing page only. 5KB. |
| **Animated Components** | Magic UI + 21st.dev (selective) | Free + paid mix. Covers hero, feature cards, bento grids. |
| **Text/Count FX** | React Bits | Purpose-built. Tree-shakeable. |
| **Interactive Vector** | Rive | 100KB runtime. All browsers. State machine support. |
| **Command Palette** | CMDK (already installed) | Linear-inspired. Already a dep. Just needs integration. |
| **Styling** | Tailwind CSS 3.4 | Stable. v4 migration not worth risk. |
| **Design System** | shadcn/ui + Radix (keep) | Well-maintained. Extensive component set. |
| **Charts** | Recharts (keep) | Already installed. Sufficient. |
| **Icons** | Lucide (keep) | Best-in-class. Already installed. |
| **Font UI** | Inter (keep) | Excellent readability. Neutral. Professional. |
| **Font Heading** | Instrument Serif (replace Merriweather) | Modern. Sharp. Used by premium brands. |
| **Font Mono** | JetBrains Mono (keep) | Already installed. Excellent. |
| **E2E Testing** | Playwright | Best visual regression + a11y testing. |
| **Design QA** | Taste | Lightweight screenshot-based review. |

### Bundle Budget

| Animation Library | Size (gzipped) |
|------------------|---------------|
| Motion / Framer Motion | ~25KB |
| Lenis | ~5KB |
| React Bits (used selectively) | ~5KB |
| Rive | ~30KB |
| Magic UI (tree-shaken) | ~10KB |
| **Total Animation Budget** | **~75KB** |

Acceptable for a premium SaaS product.

---

## 6. PHASE 1 — Foundation (1 Day)

**Goal:** Establish animation engine, fix highest-impact visual issues, minimum code churn.

### Step 1.1 — Install Dependencies

```bash
cd frontend
npm install motion @rive-app/react-canvas @studio-freight/lenis framer-motion
npm install -D @playwright/test
npx playwright install
```

If on React 18, use `framer-motion` instead of `motion`:
```bash
npm install framer-motion @rive-app/react-canvas @studio-freight/lenis
```

### Step 1.2 — Fix Border Radius

**File:** `app/globals.css:44`

```diff
-  --radius: 0.3rem;
+  --radius: 0.625rem;  /* 10px — modern, premium */
```

### Step 1.3 — Replace Merriweather with Instrument Serif

**File:** `app/layout.tsx`

```diff
-import { Inter, Merriweather, JetBrains_Mono } from "next/font/google"
+import { Inter, Instrument_Serif, JetBrains_Mono } from "next/font/google"
```

```diff
-const merriweather = Merriweather({
+const instrumentSerif = Instrument_Serif({
   subsets: ["latin"],
-  weight: ["300", "400", "700", "900"],
+  weight: ["400", "700"],
   display: "swap",
-  variable: "--font-merriweather",
+  variable: "--font-serif",
 })
```

```diff
-<html className={`${inter.variable} ${merriweather.variable} ${jetbrainsMono.variable}`}>
+<html className={`${inter.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`}>
```

**File:** `app/globals.css`

```diff
-  --font-serif: var(--font-merriweather);
+  --font-serif: var(--font-serif);
```

### Step 1.4 — Remove Old CSS Animations

**File:** `app/globals.css` — Remove lines 168-260:

```diff
-@keyframes fade-rise { ... }
-@keyframes float-soft { ... }
-@keyframes glow-pulse { ... }
-@layer utilities { ... }
-@media (prefers-reduced-motion: reduce) { ... }
```

Replace with Motion-powered animations in each component.

### Step 1.5 — Add Page Transitions (Root Layout)

**File:** `app/layout.tsx`

```tsx
import { AnimatePresence } from "framer-motion"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="...">
      <body>
        <ThemeProvider>
          <TooltipProvider>
            <ErrorBoundary>
              <AuthProvider>
                <AnimatePresence mode="wait">
                  {children}
                </AnimatePresence>
              </AuthProvider>
            </ErrorBoundary>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### Step 1.6 — Animate Landing Page Hero

**File:** `app/page.tsx`

Replace gradient blob divs with Motion-powered subtle ambient background:

```tsx
import { motion } from "framer-motion"

{/* Replace lines 52-54 */}
<div className="absolute inset-0 premium-grid opacity-60 dark:opacity-40" />
<motion.div
  className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-teal-200/40 blur-3xl dark:bg-teal-600/20"
  animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
/>
```

Add scroll-triggered section reveals:

```tsx
import { useInView } from "framer-motion"

function Section({ children }: { children: React.ReactNode }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  )
}
```

### Step 1.7 — Animate Mobile Menu

**File:** `components/layout/header.tsx`

```diff
-{isMenuOpen && (
-  <div className="md:hidden py-4 ...">
+<AnimatePresence>
+  {isMenuOpen && (
+    <motion.div
+      initial={{ opacity: 0, height: 0 }}
+      animate={{ opacity: 1, height: "auto" }}
+      exit={{ opacity: 0, height: 0 }}
+      className="md:hidden py-4 ..."
+    >
       ...
-  </div>
-)}
+    </motion.div>
+  )}
+</AnimatePresence>
```

### Step 1.8 — Add Playwright + Core E2E Tests

**New file:** `playwright.config.ts`

```ts
import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: { baseURL: "http://localhost:3000" },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "mobile", use: { browserName: "chromium", viewport: { width: 375, height: 812 } } },
  ],
})
```

**New file:** `e2e/auth.spec.ts`

```ts
import { test, expect } from "@playwright/test"

test("can navigate to login and see the form", async ({ page }) => {
  await page.goto("/login")
  await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible()
  await expect(page.getByLabel(/email/i)).toBeVisible()
  await expect(page.getByLabel(/password/i)).toBeVisible()
})

test("can navigate to signup and see the form", async ({ page }) => {
  await page.goto("/signup")
  await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible()
})
```

**New file:** `e2e/landing.spec.ts`

```ts
import { test, expect } from "@playwright/test"

test("landing page loads with hero section", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /stop guessing/i })).toBeVisible()
  await expect(page.getByRole("button", { name: /book demo/i })).toBeVisible()
})

test("navigation links work", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("link", { name: /features/i }).click()
  await expect(page.locator("#features")).toBeVisible()
})
```

**File:** `package.json` — Add scripts:

```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:a11y": "playwright test --grep @a11y"
  }
}
```

### Step 1.9 — Integrate CMDK (already installed!)

**New file:** `components/dashboard/command-palette.tsx`

```tsx
"use client"

import { Command } from "cmdk"
import { useRouter } from "next/navigation"
import { FileText, BarChart3, MessageSquare, Upload, User, Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const actions = [
    { id: "upload", icon: Upload, label: "Upload Policy", action: () => router.push("/upload") },
    { id: "analyze", icon: FileText, label: "View Analysis", action: () => router.push("/analyze") },
    { id: "chat", icon: MessageSquare, label: "Open Chat", action: () => router.push("/chat") },
    { id: "compare", icon: BarChart3, label: "Compare Policies", action: () => router.push("/compare") },
    { id: "profile", icon: User, label: "Go to Profile", action: () => router.push("/profile") },
    { id: "theme", icon: resolvedTheme === "dark" ? Sun : Moon, label: "Toggle Theme", action: () => setTheme(resolvedTheme === "dark" ? "light" : "dark") },
  ]

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg">
            <Command className="rounded-xl border bg-white shadow-2xl dark:bg-slate-900 dark:border-slate-800">
              <Command.Input
                placeholder="Search actions..."
                className="w-full px-4 py-3 text-sm outline-none border-b bg-transparent"
                autoFocus
              />
              <Command.List className="p-2 max-h-64 overflow-y-auto">
                <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>
                {actions.map((action) => (
                  <Command.Item
                    key={action.id}
                    onSelect={() => { action.action(); setOpen(false) }}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800"
                  >
                    <action.icon className="w-4 h-4 text-muted-foreground" />
                    {action.label}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  )
}
```

**File:** `app/dashboard/page.tsx` — Add to render:

```diff
+import { CommandPalette } from "@/components/dashboard/command-palette"

// In the return, inside ProtectedRoute:
<ProtectedRoute>
+  <CommandPalette />
   <div className="min-h-screen ...">
```

### Phase 1 Verification

```bash
cd frontend
npm run dev
# Verify:
# 1. Landing page sections animate on scroll
# 2. Mobile menu slides open/closed
# 3. Buttons and cards have hover microinteractions
# 4. Border radius looks modern (10px cards, 6px buttons)
# 5. Headings use new serif font
# 6. CMDK opens on ⌘K in dashboard
```

---

## 7. PHASE 2 — UX Modernization (1 Week)

### Day 1-2: Landing Page Redesign

**Files to create:**
- `components/landing/interactive-demo.tsx` — Simple text input that simulates policy analysis
- `components/landing/feature-reveal.tsx` — Scroll-triggered full-viewport feature blocks
- `components/landing/testimonial-carousel.tsx` — Social proof with rotating quotes
- `components/landing/logo-cloud.tsx` — Trusted-by logos
- `components/landing/faq.tsx` — FAQ accordion section

**Files to modify:**
- `app/page.tsx` — Replace entire page structure

**Key changes:**
1. Replace all gradient blob divs with subtle Motion-powered ambient background
2. Replace two-column hero with centered layout + live interactive demo
3. Replace 3-card feature grid with full-viewport scroll sections
4. Replace "How It Works" with animated vertical timeline
5. Add testimonial carousel + logo cloud + FAQ
6. Strip CTA to minimal layout, single button, no gradient

### Day 3-4: Dashboard Modernization

**Files to create:**
- `components/dashboard/activity-feed.tsx` — Rich chronological activity stream
- `components/dashboard/expandable-metric.tsx` — Metric card with hover-expand detail

**Files to modify:**
- `app/dashboard/page.tsx` — Major restructure

**Key changes:**
1. Remove "Intelligence Tools" sidebar
2. Integrate CMDK command palette (already created in Phase 1)
3. Replace metric cards with animated counters + hover expand
4. Replace "Latest Analysis" with rich ActivityFeed
5. Replace CircularProgress SVG with Recharts animated donut
6. Improve lazy loading skeletons to match actual layout

### Day 5: Upload + Analyze Polish

**Files to modify:**
- `app/upload/page.tsx`
- `app/analyze/page.tsx`

**Key changes — Upload:**
1. Connect progress to actual backend status (remove fake simulation)
2. Add extracted data preview after successful upload
3. Replace trust indicator cards with inline badges in upload area

**Key changes — Analyze:**
1. Replace `confirm()` with shadcn `<AlertDialog>`
2. Replace `alert()` with sonner toast
3. Add animated score ring (Motion + SVG)
4. Improve policy list with status indicators + selection animation

### Day 6-7: Chat + Compare + Profile

**Files to modify:**
- `app/chat/page.tsx`
- `app/compare/page.tsx`
- `app/profile/page.tsx`
- `app/login/page.tsx`
- `app/signup/page.tsx`

**Key changes — Chat:**
1. Add streaming text effect (Motion AnimatePresence character reveal)
2. Replace policy selector dropdown with compact chip selector
3. Replace error alert with sonner toast
4. Improve AI typing indicator

**Key changes — Compare:**
1. Fix hardcoded `bg-gray-50` → design system tokens
2. Add color-coded comparison cells (green better / red worse)

**Key changes — Profile:**
1. Remove gradient header from profile card
2. Make logout a simple button, not a warning card

**Key changes — Auth pages:**
1. Add branded split layout (brand value prop left, form right)
2. Add trust indicators below form

---

## 8. PHASE 3 — Premium Polish

> Do NOT start this phase until Phase 1-2 are deployed and stable.

**Goal:** Elevate from "modern" to "premium." These are high-effort, high-impact changes that distinguish ClaimWise from competitors.

### 8.1 Advanced Animations

- **Hero:** Rive animated illustration of policy analysis flow
- **Page transitions:** Shared element transitions using Motion `layoutId`
- **Dashboard:** Real-time metric updates with smooth value transitions
- **Upload:** Animated document processing visualization (Rive)
- **Empty states:** Animated illustrations (Rive) instead of static icons
- **Loading states:** Skeleton shimmer using Motion gradients

### 8.2 Accessibility Deep Dive

- Full keyboard navigation audit
- Focus-visible styles on every interactive element
- Screen reader testing (VoiceOver + NVDA)
- Color contrast verification (WCAG 2.2 AA minimum)
- Reduced motion support (respect `prefers-reduced-motion`)
- Focus trap in modals, command palette, sheets

### 8.3 Performance Optimization

- Convert static pages to RSC (landing page, login, signup)
- Add streaming SSR for data-heavy pages (dashboard, analyze)
- Implement `next/image` optimization (remove `images.unoptimized: true`)
- Bundle analysis in CI to prevent bloat
- Font subsetting for Instrument Serif
- Add loading states with Suspense boundaries

### 8.4 Visual Regression Testing

- Full Playwright visual regression suite
- Screenshot comparisons on every PR
- Per-page baseline screenshots for light + dark mode
- Mobile viewport verification

### 8.5 Design Token Refinement

- Regenerate with Impeccable using final brand colors
- Add accent-2 color (indigo for intelligence moments)
- Add surface colors (elevated, card, modal)
- Add shadow tokens for cards, modals, dropdowns

---

## 9. Files to Delete / Deprecate

| File | Reason |
|------|--------|
| `frontend/styles/globals.css` | Dead code — Tailwind v4 / OKLCH, not imported anywhere |
| `frontend/app/globals.css:168-260` | Remove all custom keyframes + utility classes (replaced by Motion) |
| `frontend/components/dashboard/recent-activity.tsx` (if exists as basic table) | Replace with rich ActivityFeed |
| `frontend/.pytest_cache/` | Leftover from backend, safe to delete |

---

## 10. Priority Matrix

```
                    HIGH IMPACT
                        │
                        │
       Phase 1.2  ◄─────┼──────►  Phase 1.3
       (border radius)  │        (font swap)
                        │
                        │
    LOW COST ───────────┼──────────►  HIGH COST
                        │
                        │
       Phase 2.3  ◄─────┼──────►  Phase 1.8
       (upload polish)  │        (Playwright)
                        │
                        │
                    LOW IMPACT
```

**Top 5 moves (highest ROI):**

| # | Change | Phase | Cost | Impact |
|---|--------|-------|------|--------|
| 1 | Install Motion + add page transitions + scroll reveals | Phase 1 | Low | Very High |
| 2 | Replace Merriweather → Instrument Serif | Phase 1 | Low | Very High |
| 3 | Fix border radius: 0.3rem → 0.625rem | Phase 1 | Minimal | High |
| 4 | Integrate CMDK command palette | Phase 1 | Low | High |
| 5 | Add Playwright + core E2E tests | Phase 1 | Medium | High |

---

## Appendix: Design Principles

```
TRUST     → Deep navy, clear hierarchy, predictable interactions
CLARITY   → Abundant whitespace, readable type, obvious CTAs
PREMIUM   → Intentional motion, quality over quantity, cohesive system
SPEED     → Skeleton screens, instant feedback, smooth transitions
HUMAN     → Warm microinteractions, conversational copy, approachable UI
```

```
AVOID:
❌ Gradient blobs on hero sections
❌ AI-generated/robotic copy
❌ Static card grids with no interaction
❌ Fake dashboards with no data
❌ Excessive animations that slow UX
❌ Generic testimonials without photos
❌ Stock icons with no context
```

---

*End of Report*
