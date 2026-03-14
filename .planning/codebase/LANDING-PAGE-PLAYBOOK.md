# Landing Page Design Playbook

**Created:** 2026-03-14 | **Context:** Attio-inspired redesign of J16Z landing page

## What Worked

### Process

1. **Reference-first**: Fetched and analyzed the target site (attio.com) in both HTML and markdown. Fired parallel agents — one to scrape the actual HTML structure, one to analyze design patterns (typography, spacing, color, layout), one to map the existing codebase.

2. **Plan agent before code**: Fed all gathered context (current codebase state + target design analysis + brand constraints) into a plan agent. Got back a structured component breakdown, task graph, and parallel execution plan before writing a single line.

3. **Single delegation for coherence**: Delegated the full 7-file landing page to one `visual-engineering` + `frontend-design` agent in a single task rather than parallelizing per-component. This kept the design language consistent across all sections — same spacing rhythm, typography scale, and visual patterns.

4. **Iterative refinement with screenshots**: Used Playwright to screenshot after each change. Visual QA caught issues (overlay bugs, sizing, spacing) that type-checking alone would miss.

5. **Anti-slop pass**: The first version was clean but generic (centered everything, uniform spacing, predictable alternating layouts). A second design pass specifically targeting "AI slop" symptoms fixed it — asymmetric hero, bento grid features, split-column FAQ, varied spacing rhythm.

### Design Decisions That Landed

- **Asymmetric hero**: Left-aligned headline (5-6 col) with product mockup on the right (6-7 col). Not centered. Feels intentional.
- **Bento grid features**: [01] full-width flagship, [02]+[03] side-by-side half cards, [04] full-width again. Varied card sizes = visual interest.
- **Split-column FAQ**: Sticky heading on the left, accordion on the right. Breaks the centered monotony.
- **Amber left-border on headline**: Small visual signature — a 2px amber line on the left of the hero text. Acts like a terminal cursor / financial data marker.
- **Amber dot pips**: Small `size-1.5 rounded-full bg-primary-500` dots before section numbers [01]-[04]. Consistent accent without being loud.
- **Always-dark footer**: Hardcoded dark colors regardless of theme. Strong visual anchor at page bottom.
- **Trust bar with real sources**: SEC EDGAR, CourtListener, FTC, DOJ, PACER displayed prominently. These are a genuine differentiator, not decoration.
- **LangExtract branding**: Named the extraction pipeline in feature [04]. Makes tech feel tangible.

### What Didn't Work

- **Gradient blob backgrounds**: Too generic, screams "AI landing page 2024."
- **Particle network animation**: Technically cool but felt disconnected from the brand. Not every SaaS needs floating dots.
- **Flowing waveform lines**: Too subtle at low opacity, too distracting at high opacity. No middle ground that felt right.
- **No background animation**: The final version has no hero animation. The product mockups and typography carry the visual weight. Not every page needs motion.
- **Centered-everything layout**: First pass had every section centered. Looked templated. The asymmetric pass fixed it.
- **Massive headline sizes** (`text-[5.5rem]`): Too big for the grid column, caused text to bleed into the mockup. `text-[4rem]` on lg was the sweet spot.
- **Overly bright final CTA**: `text-6xl font-extrabold text-white` on dark bg felt like shouting. Toned down to `text-2xl font-semibold text-text-muted`.

## Architecture

```
src/components/landing/
├── landing-page.tsx          # Orchestrator — pure composition, ~22 lines
├── landing-nav.tsx           # Sticky nav, theme toggle, scroll behavior
├── landing-hero.tsx          # Asymmetric hero + trust bar + product mockup
├── landing-features.tsx      # Bento grid with 4 feature cards + mockups
├── landing-faq.tsx           # Split-column FAQ with sticky heading
├── landing-cta.tsx           # Mid-page + final CTA blocks
└── landing-footer.tsx        # Always-dark multi-column footer
```

## Key Technical Notes

- All components are `'use client'` (React 19 + React Compiler — no manual memoization)
- Recharts used for spread chart in hero mockup and deal card mockup
- FAQ accordion uses CSS `grid-template-rows` animation (`.faq-content` class in globals.css)
- Footer uses hardcoded dark colors (`bg-[#0a0a0a]`, `text-[#a1a1aa]`) to stay dark in light mode
- SVG divider lines between feature cards, not CSS borders
- Product mockups are rendered React components, not images

## Delegation Prompt Template

The delegation prompt that produced the best results included all 6 sections:
1. **TASK**: Atomic goal
2. **EXPECTED OUTCOME**: Concrete deliverables
3. **DESIGN DIRECTION**: Specific aesthetic choices with CSS class examples
4. **FILES TO CREATE**: Per-file specs with line counts, content, and layout details
5. **MUST DO / MUST NOT DO**: Exhaustive requirements and forbidden patterns
6. **CONTEXT**: Tech stack, brand system, existing patterns

The more specific the design direction (actual Tailwind classes, exact content strings, layout grid specs), the better the output. Vague prompts like "make it look good" produce AI slop.
