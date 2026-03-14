# Phase 1: Backend Foundation + Auth - Context

**Gathered:** 2026-02-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Stand up the backend (Hono API + Drizzle ORM + Supabase Postgres), implement the full database schema with firm-scoped tables, wire Supabase auth (magic link primary, email/password secondary), enforce multi-tenant isolation with a blocking CI test, and connect the frontend to the real backend. Includes first-time onboarding flow and seed deal data so users never see empty states.

</domain>

<decisions>
## Implementation Decisions

### Auth Flow & Screens
- Magic link is the primary login method — email field prominent, "Sign in with email link" as the default path
- Email + password signup exists but is secondary (below the fold or behind a toggle)
- Dedicated /login page (unified signup + login) — not a modal overlay
- "Don't have an account? Sign up" / "Already have an account? Sign in" toggle on the same page
- First-time users trigger an onboarding flow after clicking the magic link; returning users go straight to /app/inbox
- Auth page design: modern standard, Claude's discretion — match the brand system
- Unauthenticated access to /app/* silently redirects to /login; after auth, redirect back to the originally intended page

### Team & Firm Onboarding
- Self-service firm creation: first user signs up, names their firm during onboarding, firm is created automatically
- Admin can pre-configure the firm so additional members have minimal setup — they just join and see value immediately
- Additional members join via invite link only — no email domain auto-matching
- Two roles: Admin (manages firm settings, invites, integrations) and Member (uses the product)
- Onboarding must be fast — firm name + land in a populated app. No lengthy wizard

### Seed Data & Empty States
- Pre-populate every new firm with real, notable M&A deals: US Steel/Nippon Steel, major AI acquisitions, other marquee active deals
- Include a pre-built example watchlist (e.g., "Top Active Deals") so Watchlists page has content from day one
- Seed deals display a subtle "starter" badge to distinguish from user-added deals
- Users can remove/dismiss seed content — it's soft deleted, admin can restore
- Skeleton loading screens (shimmer placeholders matching layout shape) for all data-fetching states — no spinners

### Soft Deletes & Audit Log
- All entities get soft deletes (deleted_at column) — nothing is ever truly lost
- Audit change log table tracking: who, what entity, what action, when — for all mutations
- Admins see the full change log (UI deferred to later phase — schema goes in Phase 1)
- Members see contextual history inline on relevant pages (UI deferred — schema goes in Phase 1)
- Soft deletes apply to ALL entities: deals, events, watchlists, alert rules, filings — everything

### Landing Page CTA Routing
- Landing page CTAs route to /login (unified auth page)
- Unified page handles both signup and login flows
- Silent redirect for unauthenticated /app/* access with redirect-back-after-auth

### Branding (Cross-cutting)
- Logo is the lowercase text wordmark "j16z" — like a16z, no icon
- Light and dark mode supported (dark is default)
- Visual trust like Harvey and Stripe — institutional, credible, craft-forward
- Bloomberg-ish data density feel for the product surfaces
- Fonts: Plus Jakarta Sans (headings), Inter (body), JetBrains Mono (mono) — already in place

### Claude's Discretion
- Auth page visual design (modern standard, within brand system)
- Error message tone and copy
- Exact onboarding flow screens and transitions
- Skeleton screen shimmer implementation details
- Seed deal selection beyond US Steel/Nippon and AI acquisitions
- Audit log table schema design

</decisions>

<specifics>
## Specific Ideas

- "j16z" wordmark as logo, lowercase, exactly like a16z does it
- Pre-populate with US Steel/Nippon Steel deal (David was tracking this closely), plus big AI acquisitions
- Reference the AmplifyME podcast for marquee deal selection — covers the big corridor deals
- M&A deals span small corridor deals, medium-sized, and large — seed with a mix but lean toward notable ones
- "Nothing should be truly lost" — soft delete philosophy across the entire platform
- Users should see value immediately — no empty states, no lengthy setup wizards

</specifics>

<deferred>
## Deferred Ideas

- Audit log UI in Settings (full admin view with proper visualization) — Phase 7 or dedicated phase
- Contextual change history visible inline for members — Phase 7 or dedicated phase
- Email domain auto-matching for firm joining — potential future enhancement

</deferred>

---

*Phase: 01-backend-foundation-auth*
*Context gathered: 2026-02-26*
