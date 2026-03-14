# Coding Conventions

**Analysis Date:** 2026-02-25

## Naming Patterns

**Files:**
- Component files: kebab-case (e.g., `feed-manager.tsx`, `inbox-timeline.tsx`, `data-table.tsx`)
- Library/utility files: kebab-case (e.g., `severity-scoring.ts`, `date-utils.ts`, `alert-triggers.ts`)
- Page files: kebab-case for directory names, lowercase for file names (e.g., `page.tsx`, `layout.tsx`)
- UI component files: kebab-case (e.g., `simple-dropdown.tsx`, `status-badge.tsx`)

**Functions:**
- Use camelCase for function names (e.g., `calculateSeverityScore`, `getDeal`, `formatDate`)
- Helper functions prefix: no prefix, use descriptive names (e.g., `getBaseScore`, `getUrgencyAdjustment`, `formatDateTime`)
- React component functions: PascalCase (e.g., `InboxTimeline`, `DataTable`, `Button`, `Card`)
- Event handlers: prefix with `on` for callback props (e.g., `onEventSelect`, `onIndexChange`, `onClick`)
- Event handlers in implementations: use `handle` prefix (e.g., `handleKeyDown`)

**Variables:**
- Local variables: camelCase (e.g., `events`, `filteredEvents`, `severityOrder`)
- Boolean flags: descriptive with `is`/`has` prefix (e.g., `isRead`, `isLoading`, `hasError`)
- Constants in scope: UPPER_SNAKE_CASE for public constants (e.g., `BASE_SCORES`)
- React state: camelCase with setter paired with `set` prefix (e.g., `const [events, setEvents]`, `const [loading, setLoading]`)

**Types:**
- Interfaces: PascalCase, descriptive plural/singular as needed (e.g., `InboxTimelineProps`, `EnrichedEvent`, `EventContext`)
- Enums: PascalCase (e.g., `EventType`, `SeverityLevel`, `MaterialityTier`)
- Union types: PascalCase (e.g., `DealStatus`, `ConsiderationType`)
- Type aliases: PascalCase (e.g., `RegulatoryFlag`)

## Code Style

**Formatting:**
- Tool: Biome 2.2.0 (enforced via `biome.jsonc`)
- Indent: 2 spaces
- Line width: 120 characters
- Quote style: Single quotes (`'string'` not `"string"`)
- Trailing commas: Required on all multi-line structures

**Linting:**
- Tool: Biome (root `biome.jsonc` used across monorepo)
- Enforced rules:
  - `noParameterAssign`: Functions cannot reassign parameters
  - `useAsConstAssertion`: Prefer `as const` over type inference
  - `useDefaultParameterLast`: Default parameters must come last
  - `useEnumInitializers`: All enum members must have initializers
  - `useSelfClosingElements`: Self-closing elements must not have children (e.g., `<img />`)
  - `useSingleVarDeclarator`: One `const`/`let` declaration per statement
  - `noUnusedTemplateLiteral`: No template literals without interpolation
  - `useNumberNamespace`: Use `Number.isNaN()` instead of `isNaN()`
  - `noInferrableTypes`: Don't explicitly type values that TypeScript can infer
  - `noUselessElse`: Remove unnecessary `else` blocks after control flow statements

**TypeScript Configuration:**
- Strict mode enabled (`strict: true`)
- `exactOptionalPropertyTypes`: Required - optional properties cannot be `undefined` by default
- `noUnusedLocals`: All local variables must be used
- `noFallthroughCasesInSwitch`: All switch cases must have break/return
- Target: ES2022
- Module: NodeNext

## Import Organization

**Order:**
1. React and Next.js imports
2. Third-party libraries (Radix UI, date-fns, recharts, etc.)
3. Internal absolute imports (using `@/` alias)
4. Type imports (using `import type` for type-only imports)

**Path Aliases:**
- `@/` maps to `src/` in the frontend app
- Usage: `@/components/ui/button`, `@/lib/api`, `@/lib/types`
- Avoid relative imports; always use `@/` alias for internal imports

**Example:**
```typescript
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import React, { useEffect, useState } from "react";
import { getAllEvents } from "@/lib/api";
import { calculateSeverityWithLevel, EventType } from "@/lib/severity-scoring";
import type { Event } from "@/lib/types";
```

## Error Handling

**Pattern:**
- Use try-catch blocks in async operations
- Catch errors and log with `console.error()`
- Always include error context (operation description)
- Mock mode: errors are typically logged but don't break functionality

**Example from codebase** (`src/components/inbox/inbox-timeline.tsx`):
```typescript
useEffect(() => {
  async function loadEvents() {
    try {
      const rawEvents = await getAllEvents();
      setEvents(enriched);
    } catch (error) {
      console.error("Failed to load events:", error);
    } finally {
      setLoading(false);
    }
  }
  loadEvents();
}, []);
```

**Throw patterns:**
- Use `throw new Error("Descriptive message")` with context
- Example: `throw new Error("Deal not found")` or `throw new Error("Failed to fetch deals")`

## Logging

**Framework:** `console` methods (no structured logging library)

**Patterns:**
- `console.error()`: Error conditions with descriptive message and error object
- `console.log()`: Temporary development logging (seen in alert placeholders)
- All production logging uses `console.error()` for errors
- Logging includes operation context: "Failed to [operation]: [error]"

**Example:**
```typescript
console.error("Failed to load events:", error);
console.error("Failed to check watchlist:", error);
```

## Comments

**When to Comment:**
- Complex algorithms (e.g., scoring logic, filtering rules)
- Non-obvious business logic (e.g., why p_close < 40 is significant)
- Large block comments explain data transformations

**JSDoc/TSDoc:**
- Used for public API functions and modules
- Format: Multi-line comment blocks with description
- Example from `src/lib/api.ts`:
```typescript
/**
 * Get all deals
 */
export async function getDeals(): Promise<Deal[]> {
```

**TODO/FIXME:**
- Uses `// TODO:` for unimplemented features
- Frequently found in:
  - `src/lib/api.ts`: Multiple "TODO: Replace with real API call" comments (mock data placeholders)
  - Event enrichment: "TODO: Calculate from deal data", "TODO: Get from localStorage"
  - Feature gaps: "TODO: Implement watchlist filtering"

## Function Design

**Size:** Generally 50-200 lines for utility functions, 30-100 lines for React components

**Parameters:**
- Named parameters preferred over positional arguments
- Use interface objects for multiple related parameters (see `InboxTimelineProps` pattern)
- Optional parameters use `?` notation with sensible defaults

**Example from `src/components/inbox/inbox-timeline.tsx`:**
```typescript
interface InboxTimelineProps {
  filters: { severity: string[]; eventType: string[]; deal: string[] };
  selectedEventId: string | null;
  onEventSelect: (eventId: string) => void;
  searchQuery?: string;
  selectedIndex?: number;
  onIndexChange?: (index: number) => void;
}

export function InboxTimeline({
  filters,
  selectedEventId,
  onEventSelect,
  searchQuery = "",
  selectedIndex = 0,
  onIndexChange,
}: InboxTimelineProps) {
```

**Return Values:**
- Async functions return typed Promises (e.g., `Promise<Deal[]>`, `Promise<Deal | null>`)
- Helper functions return simple types or objects
- Scoring functions return objects with multiple related values:
```typescript
export function calculateSeverityWithLevel(context: EventContext): {
  score: number;
  level: SeverityLevel;
  badge: string;
}
```

## Module Design

**Exports:**
- Named exports preferred (e.g., `export function`, `export enum`, `export interface`)
- Utility modules export multiple related functions
- Example: `src/lib/api.ts` exports ~10 async functions (getDeals, getDeal, createDeal, etc.)

**Barrel Files:**
- Not heavily used; direct imports from specific modules preferred
- Components import directly: `import { Button } from "@/components/ui/button"`

**Module Structure Pattern:**
- Single responsibility per file
- Related helpers grouped (e.g., all scoring adjustments in one file)
- Constants defined at module level for lookup tables (e.g., `BASE_SCORES` in severity-scoring)

**Example from `src/lib/severity-scoring.ts`:**
```typescript
// Constants at top
const BASE_SCORES: Record<string, number> = { ... };

// Helper functions
function getBaseScore(context: EventContext): number { ... }
function getUrgencyAdjustment(daysToOutsideDate?: number): number { ... }

// Public API
export function calculateSeverityScore(context: EventContext): number { ... }
export function getSeverityLevel(score: number): SeverityLevel { ... }
```

## React Component Patterns

**Client vs Server Components:**
- Use `"use client"` directive at top of client components
- Most components are client-side (feature complexity, state management)
- Page layouts use server components where possible

**Props and Types:**
- Define interface for props (e.g., `ButtonProps`, `InboxTimelineProps`)
- Extend native HTML element types when wrapping: `React.ComponentProps<"button">`
- Use discriminated unions for variant-based components

**Example from `src/components/ui/button.tsx`:**
```typescript
function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  })
```

**State Management:**
- React hooks (`useState`, `useEffect`) for component-level state
- localStorage via `use-local-storage-state` for persistence
- Pass callbacks down to children for interactivity

---

*Convention analysis: 2026-02-25*
