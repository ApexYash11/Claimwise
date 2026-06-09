---
target: analyze page
total_score: 28
p0_count: 1
p1_count: 2
p2_count: 2
timestamp: 2026-06-07T06-36-21Z
slug: frontend-app-analyze-page-tsx
---
# Critique: Analyze Page

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Loading spinner, toast on delete. Missing progress during analysis load. |
| 2 | Match System / Real World | 3 | Domain terms correct. Sidebar says "Documents" not "Policies" (inconsistency). |
| 3 | User Control and Freedom | 4 | Sidebar collapse, delete confirmation, back button. Strong. |
| 4 | Consistency and Standards | 2 | Two different card patterns across page vs InsightsPanel. |
| 5 | Error Prevention | 3 | Delete confirmation present. No accidental data loss paths. |
| 6 | Recognition Rather Than Recall | 3 | Icons help, labels clear. Coverage table uses familiar label-value pairs. |
| 7 | Flexibility and Efficiency | 3 | Compare/Ask AI shortcuts. Delete inline. No bulk actions or search. |
| 8 | Aesthetic and Minimalist Design | 2 | Side-stripe borders add chrome. InsightsPanel nested containers add noise. |
| 9 | Help Users Recognize, Diagnose, and Recover from Errors | 3 | Try Again button, toast messages. Error heading is generic. |
| 10 | Help and Documentation | 2 | No contextual help, no tooltips, no guidance when claim score is low. |
| **Total** | | **28/40** | **Acceptable** |

## Anti-Patterns Verdict

**LLM assessment:** Borderline FAIL. Two hard anti-reference violations: side-stripe borders (`border-l-2` on risk items) and identical card grids in InsightsPanel (3x icon + label + number). Both explicitly banned in PRODUCT.md and DESIGN.md.

**Deterministic scan:** 1 finding — side-tab accent border at `page.tsx:272` (`border-l-2` with `priority-*` class). Detector caught exactly what the design review flagged as P0.

**Browser visualization:** Dev server responds (200), but no automation tooling available for overlay injection.

## Overall Impression

The analyze page has strong bones — good state handling, smart risk item design, solid delete flow — but it's sabotaged by leftover AI-template scaffolding (side-stripe borders, identical card grids, purple accent in InsightsPanel). The biggest opportunity: replace the template leftovers with intentional design choices and wire the empty Insights tab with real data.

## What's Working

1. **Risk item design** — Severity-based icon + color + source attribution makes each item scannable and credible. Source badge with `ScrollText` icon adds traceability.
2. **State coverage** — Three distinct states (loading, error, empty) handled with appropriate visual treatment. Calm, unpanicked.
3. **Delete confirmation flow** — AlertDialog with loading spinner, rose-colored destroy action, 12s API timeout. Edge-case aware.

## Priority Issues

### P0: Side-stripe borders violate explicit anti-references
**What:** `page.tsx:272` uses `border-l-2` with `priority-*` classes. `globals.css:195-209` defines `.priority-critical/warning/info` as `border-l-2`.
**Why it matters:** PRODUCT.md line 25 and DESIGN.md line 214 both explicitly ban side-stripe borders.
**Fix:** Replace with tonal background fill (the `bg-[hsl(...)/5]` tint already there) or a small dot indicator.
**Suggested command:** `/impeccable distill`

### P1: InsightsPanel uses banned patterns (purple accent, shadow, identical card grid)
**What:** `insights-panel.tsx` uses `text-purple-600` (not in palette), `shadow-sm` on cards (Flat-By-Default violation), and 3x identical "icon + label + number" cards.
**Why it matters:** DESIGN.md One Accent Rule (teal only) and Flat-By-Default Rule. PRODUCT.md bans identical card grids.
**Fix:** Replace purple with teal, remove shadows, redesign stat row.
**Suggested command:** `/impeccable distill insights-panel.tsx`

### P1: Policy name heading uses Inter instead of Instrument Serif
**What:** `page.tsx:232`: `<h1 className="text-2xl font-semibold tracking-tight">` renders in Inter.
**Why it matters:** DESIGN.md The Instrument Rule — serif is for display headings. This is the most important text on the page.
**Fix:** Add `font-serif` and `font-normal`.
**Suggested command:** `/impeccable typeset analyze/page.tsx`

### P2: Delete button hidden behind hover-only reveal
**What:** `page.tsx:192`: `opacity-0 group-hover:opacity-100`
**Why it matters:** Not accessible to keyboard-only or touch users. WCAG failure.
**Fix:** Show at `opacity-40` by default, full on hover/focus.
**Suggested command:** `/impeccable harden analyze/page.tsx`

### P2: No next-step guidance for low claim scores
**What:** Low score shows critical risk with no CTA or reassurance. No "what do I do now?" path.
**Why it matters:** Highest-stakes emotional valley. PRODUCT.md principle: "Every screen answers what to do next within seconds."
**Fix:** Add contextual "Review gaps" or "Get recommendations" CTA for low scores.
**Suggested command:** `/impeccable clarify analyze/page.tsx`

## Persona Red Flags

**Alex (Power User):** No keyboard shortcuts, no sidebar search/sort, no bulk operations. Having to click each policy individually is tedious.

**Jordan (First-Timer):** Data wall on load is overwhelming. No onboarding. "Documents" vs "Policies" terminology inconsistency. "Not specified" / "N/A" values look like bugs.

**Sam (Accessibility):** Delete button hidden on hover only. Sidebar toggle has no `aria-label`. Color-coded severity redundantly labeled with text icons (good) but `border-l-2` is color-only. `role="button"` on divs alongside real `<button>` elements is mixed semantics.

**Riley (Stress Tester):** No filtering/sorting/search for 50+ policies. `exclusions.slice(0, 120)` truncation could cut important data. No retry logic beyond full page reload.

## Minor Observations

- Sidebar heading says "Documents" not "Policies" (term inconsistency)
- `page.tsx:272` uses inline template literal for className — should use `cn()`
- Coverage Details card repeats 3 stats from hero row (redundant)
- InsightsPanel keyword-matching icon logic is fragile
- Claim score uses `font-serif text-xl` inconsistent with `metric-value` class (`text-3xl`)
- `.metric-label` uses `tracking-wider` — `tracking-widest` would be more readable at 12px

## Questions to Consider

1. The side-stripe borders exist in `globals.css` as utility classes — this is foundational scaffolding that was never removed. Is there a systematic review gap for template leftovers?

2. The Executive Summary and Analysis tab repeat the same 3 data points. Which is the source of truth?

3. InsightsPanel has `insights={[]}` hardcoded — was this shipped as a demo placeholder, or is there an API dependency that never materialized?
