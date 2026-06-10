# Design Context

This project has design context captured in two files at the project root:

- **PRODUCT.md** — strategic: register, users, purpose, brand personality, design principles, anti-references.
- **DESIGN.md** — visual: color palette (Ink/Paper/Midnight), typography (Instrument Serif + Inter), component patterns, Do's and Don'ts.

Before generating any new UI, read both files.

## Impeccable Commands

The impeccable skill (`.opencode/skills/impeccable/`) provides these design commands — use `/impeccable <command> [target]` to invoke them:

### Build
| Command | Description |
|---------|-------------|
| `craft [feature]` | Shape, then build a feature end-to-end |
| `shape [feature]` | Plan UX/UI before writing code |
| `init` | Set up project context: PRODUCT.md, DESIGN.md, live config |
| `document` | Generate DESIGN.md from existing project code |
| `extract [target]` | Pull reusable tokens and components into design system |

### Evaluate
| Command | Description |
|---------|-------------|
| `critique [target]` | UX design review with heuristic scoring |
| `audit [target]` | Technical quality checks (a11y, perf, responsive) |

### Refine
| Command | Description |
|---------|-------------|
| `polish [target]` | Final quality pass before shipping |
| `bolder [target]` | Amplify safe or bland designs |
| `quieter [target]` | Tone down aggressive or overstimulating designs |
| `distill [target]` | Strip to essence, remove complexity |
| `harden [target]` | Production-ready: errors, i18n, edge cases |
| `onboard [target]` | Design first-run flows, empty states, activation |

### Enhance
| Command | Description |
|---------|-------------|
| `animate [target]` | Add purposeful animations and motion |
| `colorize [target]` | Add strategic color to monochromatic UIs |
| `typeset [target]` | Improve typography hierarchy and fonts |
| `layout [target]` | Fix spacing, rhythm, and visual hierarchy |
| `delight [target]` | Add personality and memorable touches |
| `overdrive [target]` | Push past conventional limits |

### Fix
| Command | Description |
|---------|-------------|
| `clarify [target]` | Improve UX copy, labels, and error messages |
| `adapt [target]` | Adapt for different devices and screen sizes |
| `optimize [target]` | Diagnose and fix UI performance |

### Iterate
| Command | Description |
|---------|-------------|
| `live` | Visual variant mode: pick elements in the browser, generate alternatives |

## Recent Progress

Completed UX redesign covering: Landing, Login, Dashboard, Upload, Analysis, Chat, Profile pages + global design system. Pending items tracked in conversation history.

## Dev Server

Frontend dev server typically runs on port 3000. Backend API on port 8000.
