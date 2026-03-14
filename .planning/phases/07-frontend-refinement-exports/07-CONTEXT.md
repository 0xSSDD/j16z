# Phase 7: Frontend Refinement + Exports - Context

**Gathered:** 2026-03-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish the deal page with tabbed navigation and CourtListener-style sidebar, craft a comprehensive landing page with Linear x Harvey aesthetic, add deal card keyboard shortcuts, and build CSV export + REST API with OpenAPI docs. The product becomes pilot-ready.

</domain>

<decisions>
## Implementation Decisions

### Deal page tab structure
- Horizontal tabs below sticky deal metrics header (eToro-style)
- Tab order: Terms, Events, Spread History, News/Research, Reg & Litigation
- Default tab is **Terms** when opening a deal card
- Sticky header shows constant metrics (deal name, price, spread, p_close, status) — does NOT change per tab
- Event detail opens as a **slide-in sidebar from right** (CourtListener pattern), consistent with inbox side panel
- Tab content remains visible beside the sidebar when detail is open

### Landing page craft
- **Problem-first** messaging hierarchy: lead with analyst pain point ("Stop chasing filings across EDGAR, CourtListener, and FTC press releases"), then present j16z as the solution
- Hero headline: "Deal intelligence, made faster."
- **5+ sections**: Hero → Feature showcase (live product screenshots) → How it works → Data sources → Pricing → CTA
- Pricing section: "Currently in beta — reach out for pricing" (not a tier grid)
- Interactive elements: **live product screenshots/mockups** showing inbox, deal card, spread chart — not animated demos
- Linear x Harvey aesthetic: clean, dark, crafted — no AI-generated feel

### Onboarding flow
- **Minimal** — keep existing OnboardingForm (firm creation only)
- No multi-step wizard, no sidebar reordering
- Users discover features organically after landing in inbox

### Keyboard shortcuts
- Deal card tab switching: 1-5 for tab selection
- List navigation: j/k for next/prev item in event lists
- Detail interaction: Enter to open sidebar detail, Esc to close
- Keep existing navigation shortcuts (g+i, g+d, etc.) unchanged
- **No sidebar reordering** — fixed 4-item nav (Inbox, Deals, Watchlists, Settings)

### CSV export
- **Deal board snapshot**: deal_name, acquirer, target, offer_price, current_price, spread_pct, p_close, status, announced_date, outside_date, filing_count, litigation_count, regulatory_status
- Single flat CSV — not a multi-sheet or deal+events bundle

### REST API
- API key auth via Settings > API Keys tab (already exists in UI)
- Key format: `sk_live_` prefix, passed as `x-api-key` header
- Scoped to firm
- Resources: `GET /v1/deals`, `GET /v1/deals/:id`, `GET /v1/deals/:id/events`, `GET /v1/deals/:id/clauses`, `GET /v1/deals/:id/spreads`
- OpenAPI spec served via **Scalar** UI at `/docs`, auto-generated from Hono route definitions using `@hono/zod-openapi`

### Claude's Discretion
- Loading skeleton design for tab content transitions
- Exact spacing and typography choices within the established theme
- Error state handling for API endpoints
- Landing page section ordering and copy refinement within the decided structure

</decisions>

<specifics>
## Specific Ideas

- Deal card tabs should feel like a Bloomberg terminal — dense but organized
- Landing page should communicate craft like Linear's marketing site — every pixel intentional
- "Currently in beta — reach out for pricing" for pricing section
- API should feel familiar to quant analysts who use financial data APIs

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `deal-card.tsx`: Current collapsible section structure — will be rewritten to tabs but clause grouping logic (`CLAUSE_CATEGORIES`, `ClauseCard`) is reusable within the Terms tab
- `landing-page.tsx`: Existing hero, PolymarketCard, feature grid, theme toggle — refine rather than rebuild
- `onboarding-form.tsx`: Firm creation flow — keep as-is
- `keyboard-help-modal.tsx`: Shortcut definitions and modal — extend with new deal card shortcuts
- `settings/api-keys-tab.tsx`: API key management UI already built
- `ui/event-timeline.tsx`, `ui/spread-chart.tsx`, `ui/status-badge.tsx`: Reusable in tab content

### Established Patterns
- Side panel pattern from inbox (`inbox/` components) — reuse for deal card event detail sidebar
- `CollapsibleSection` component — being replaced by tabs but pattern exists
- Dark theme with Aurora accents — landing page must use same design tokens
- `@/lib/api.ts` mock/real data switching — extend for new API routes

### Integration Points
- Deal card route: `apps/j16z-frontend/src/app/app/deals/[id]/page.tsx`
- Settings tabs: `apps/j16z-frontend/src/components/settings/` — API keys tab exists
- API routes: `apps/api/src/routes/` — add v1 public API routes
- Command palette: `command-palette.tsx` — already supports keyboard shortcut discovery

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-frontend-refinement-exports*
*Context gathered: 2026-03-13*
