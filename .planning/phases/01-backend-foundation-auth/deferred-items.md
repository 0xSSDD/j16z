# Deferred Items — Phase 01

Items discovered during execution but out of scope for the current plan.

## Pre-existing TypeScript Errors (discovered during 01-02)

These errors exist in frontend components unrelated to the 01-02 changes and were
pre-existing before this plan began.

### `apps/j16z-frontend/src/components/notifications-inbox.tsx`
- Error: Property 'materiality' does not exist on type 'Event' (lines 85, 87, 92)
- Root cause: `Event` type in `types.ts` uses `materialityScore` not `materiality`
- Fix: Update component references to use the correct field name
- Priority: Low (component still renders, just TypeScript strict mode complaint)

### `apps/j16z-frontend/src/components/ui/event-timeline.tsx`
- Error: Property 'materiality' does not exist on type 'Event' (lines 40, 62, 64)
- Error: Element implicitly has 'any' type from unindexed access (lines 40, 62)
- Root cause: Same as above — field name mismatch
- Priority: Low (pre-existing, not introduced by 01-02)

**Recommendation:** Fix these during frontend polish phase or as part of 01-03 (front-end integration smoke test).
