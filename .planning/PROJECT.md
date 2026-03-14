# j16z — Deal Intelligence, Made Faster

## What This Is

j16z is a deal-first intelligence platform for merger-arb and event-driven hedge funds. One deal card replaces the patchwork of EDGAR bookmarks, CourtListener tabs, FTC/DOJ websites, spreadsheets, and in-house bots that analysts rely on today. It ingests regulatory filings, court dockets, agency actions, and market data automatically, extracts deal terms via LLM, and surfaces a unified materiality-scored event stream per deal — with alerts so desks see what changed in minutes instead of hours.

Built for pilot clients at event-driven and policy-focused firms. Linear x Harvey aesthetic: dark, fast, keyboard-driven, zero friction.

## Core Value

Analysts spend 3-5 hours/day trolling fragmented sources. j16z turns that into a push-button workflow — live data in, analyst-ready intelligence out — so desks focus on thesis, sizing, and risk instead of data janitor work.

## Requirements

### Validated

<!-- Shipped and confirmed valuable — existing in current codebase. -->

- ✓ Frontend shell with 4-nav redesign (Inbox, Deals, Watchlists, Settings) — existing
- ✓ Deal board with list/grid views, status filtering, and deal cards — existing
- ✓ Deal card with events timeline, clauses, spread chart, news section — existing
- ✓ Inbox with materiality-based event feed and CourtListener-style side panel — existing
- ✓ Settings page with tabs (Alert Rules, Integrations, RSS Feeds, Team, API Keys) — existing
- ✓ Severity scoring system (0-100 with contextual adjustments) — existing
- ✓ Materiality scoring system (0-100 with deal-context adjustments) — existing
- ✓ Alert trigger evaluation logic (CRITICAL >70, WARNING 50-70, INFO <50) — existing
- ✓ API abstraction layer with mock/real data switching — existing
- ✓ Mock data with realistic M&A scenarios (~1400 lines) — existing
- ✓ Domain type system (Deal, Event, Clause, MarketSnapshot, NewsItem) — existing
- ✓ Theme system (dark default, Aurora palette, light opt-in) — existing
- ✓ Landing page at / — existing
- ✓ Command palette and keyboard shortcut foundation — existing
- ✓ Export utilities (CSV, JSON, Word doc generation) — existing

### Active

<!-- Current scope. Building toward these. All hypotheses until shipped and validated. -->

**Backend & Data Ingestion**
- [ ] Backend service in monorepo (apps/api/) with data ingestion pipeline
- [ ] SEC EDGAR integration — poll and ingest 8-K, S-4, DEFM14A, 13D/13G filings
- [ ] CourtListener integration — monitor dockets, merger challenges, shareholder suits, antitrust cases
- [ ] FTC/DOJ antitrust integration — enforcement actions, HSR second requests, press releases
- [ ] Market data API integration — live spreads and implied consideration computation
- [ ] Curated RSS/news feed ingestion — law firm alerts, specialist newsletters

**LangExtract (AI Extraction Pipeline)**
- [ ] LLM-powered document parsing — raw filings/dockets into structured deal terms and clauses
- [ ] Clause extraction — termination fees, MAE clauses, regulatory covenants, litigation terms
- [ ] Materiality scoring — AI-assigned event impact scores with source citations
- [ ] Event summarization — concise analyst-facing summaries of filings and docket entries
- [ ] Research draft generation — memo skeletons analysts can edit into institutional notes

**Authentication & Multi-tenancy**
- [ ] Supabase auth integration — email/password + magic link login for pilot clients
- [ ] Session persistence across browser refresh
- [ ] Team-level data isolation for pilot firms

**Alerts & Digests**
- [ ] Real-time alerts — email, Slack, webhook on material events (score >70)
- [ ] Configurable alert rules — per-deal and per-analyst thresholds
- [ ] Daily email digest — morning summary of overnight deal activity (HIGH + MEDIUM)
- [ ] Weekly email digest — Friday summary of all deal changes

**Deal Memo Editor**
- [ ] Template-seeded memo editor — pre-filled sections (thesis, terms, risks, timeline)
- [ ] Freeform rich text editing — analysts write and refine after template scaffolding
- [ ] Pull-in deal data — insert live deal terms, spreads, events into memo
- [ ] Edit history tracking

**Frontend Refinement**
- [ ] eToro-style tab structure on deal pages (Terms, Events, Spread History, News/Research, Reg & Litigation)
- [ ] Landing page polish — Linear x Harvey aesthetic, convey "deal intelligence, made faster"
- [ ] First-time user flow with orderable sidebar
- [ ] Keyboard UX refinement (post-core, Linear-quality)
- [ ] CourtListener sidebar pattern on deal page for event detail (replace arrow navigation)

**Data Exports & API**
- [ ] Structured data feeds — CSV/API for firms to pipe into internal systems
- [ ] API key management for external consumption

### Out of Scope

<!-- Explicit boundaries. Documented to prevent scope creep. -->

- Real-time chat — high complexity, not core to deal intelligence value
- Native mobile app — web-first, mobile later
- OAuth/social login — email/password + magic links sufficient for pilot phase
- AI Analyst chat feature — exploratory, defer post-MVP
- Prediction Metrics page — exploratory, defer post-MVP
- Risk Radar page — exploratory, defer post-MVP
- Video content — no use case in M&A intelligence workflow
- Multi-language support — English-only for US M&A market
- Self-improving materiality engine (ML feedback loop) — pitch deck feature, post-MVP
- Predictive deal analytics (break probability models) — pitch deck feature, post-MVP

## Context

**Origin:** Call with David (hedge fund analyst) — core pain is information overload across fragmented sources. Analysts spend 3-5 hours/day on low-leverage data work. The hardest thing is tracking all announced deals and drilling into the right information at the right time.

**Target users:** Merger-arb and event-driven desk analysts at institutional firms. 5-10 pilot clients for MVP validation.

**Existing codebase:** Next.js 16 frontend with React 19, Tailwind v4, shadcn/ui. Full frontend shell running on mock data. pnpm monorepo structure with `apps/j16z-frontend/`.

**Competitive landscape:** Bloomberg Terminal ($20-32K/analyst/yr), AlphaSense ($15-30K/yr), in-house bots ($75-120K/yr engineering). j16z targets $18-24K/analyst/yr — purpose-built for deal desks, not generalist research.

**a16z thesis alignment:** Niche vertical AI — domain-specific UI, cornered data resources (deal-level clause extraction training data), thick AI capabilities. "Extraordinary specialization is now possible."

**Design philosophy:** Linear x Harvey — dark, fast, keyboard-driven, professional. Landing page must convey craft, not "AI slop." Hero message: "Deal intelligence, made faster."

**Key reference docs:**
- `j16z-docs/Rehaul.md` — full redesign spec with data-driven before/after
- `j16z-docs/RehaulVisual.md` — ASCII visual comparisons
- `j16z-docs/Davidpainpoints.md` — origin call notes
- `j16z-docs/PitchDeck0.md` — investor pitch with market sizing

**Data sources (all mandatory for MVP):**
- SEC EDGAR — M&A filings (8-K, S-4, DEFM14A, 13D/13G)
- CourtListener — litigation (merger challenges, shareholder suits)
- FTC/DOJ Antitrust — enforcement actions, HSR second requests
- Market Data API — spreads, implied consideration
- Curated RSS/News — law firm alerts, specialist newsletters

## Constraints

- **Monorepo**: All apps in `apps/` directory — frontend (TypeScript), backend API (TypeScript/Hono), LangExtract (Python)
- **LangExtract**: Google's open-source LangExtract library (Python) — source grounding prevents hallucination, few-shot M&A examples, handles 500+ page filings
- **Auth**: Supabase (SDK already installed in frontend)
- **Frontend stack**: Next.js 16, React 19, Tailwind v4, shadcn/ui — locked, do not change
- **Package manager**: pnpm — locked
- **Pilot timeline**: MVP must be functional enough for external pilot clients, not just internal demo
- **Landing page**: Must not look AI-generated — craft and design quality are table stakes
- **UX standard**: Linear-quality interactions — keyboard-first, fast, zero friction

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| 4-nav consolidation (Inbox, Deals, Watchlists, Settings) | Rehaul analysis: 9 nav items caused 18-22% time waste on navigation | ✓ Good — implemented |
| CourtListener-style side panel for events | Analysts validated this pattern feels natural for event detail | ✓ Good — implemented |
| Dark mode default with Aurora palette | Target users (hedge fund analysts) prefer dark interfaces; brand differentiation | ✓ Good — implemented |
| Backend in same monorepo (apps/api/) | Keep deployment simple, shared types, monorepo benefits | — Pending |
| LangExtract as Python service (apps/langextract/) | Google's LangExtract library is Python-only; source grounding solves hallucination; separate service communicates via internal API/queue | — Pending |
| Supabase for auth | SDK already installed, fast path to production auth | — Pending |
| eToro-style tabs on deal page | Replace collapsible sections with tabs for faster navigation within deals | — Pending |
| "Deal intelligence, made faster" as hero message | Clean, Linear-style positioning that speaks to the core value proposition | — Pending |

---
*Last updated: 2026-02-25 after initialization*
