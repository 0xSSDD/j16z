---
name: diagrams
description: Create or update mermaid architecture diagrams based on work done in the current session. Creates new diagrams for undocumented domains, updates existing ones when they're stale.
argument-hint: [domain or "auto" to infer from session context]
---

Maintain the mermaid diagram knowledge base at `.claude/diagrams/` based on the work done in this session.

**Domain hint:** $ARGUMENTS (if empty or "auto", infer from the current conversation context)

## Process

### 1. Identify the domain(s) touched in this session

Look at:
- Files read, edited, or created during this conversation
- The describe blocks, modules, and subsystems involved
- Any bugs investigated or features implemented

Summarize in 1-2 sentences what domain(s) were touched.

### 2. Inventory existing diagrams

List all `.md` files in `.claude/diagrams/`:

```
Glob pattern: .claude/diagrams/*.md
```

Read each diagram's headings (first 5-10 lines) to understand what it covers.

### 3. Decide: create, update, or skip

For each domain touched:

- **No existing diagram covers it** → Create a new diagram file
- **An existing diagram covers it but is missing details learned in this session** → Update it
- **An existing diagram already accurately covers it** → Skip (say so)

### 4. Write/update diagrams

Follow these conventions:

- **One file per domain** (e.g., `testing-infrastructure.md`, `fx-rate-pipeline.md`, `graphql-auth.md`)
- **Use mermaid fenced blocks** (` ```mermaid `) for all diagrams
- **Include both diagrams AND prose** — diagrams show structure/flow, prose explains gotchas, common pitfalls, and "why"
- **Focus on what Claude needs to know** — these diagrams are consumed by AI, not humans. Emphasize:
  - Non-obvious dependencies (e.g., "ClickHouse has no transaction rollback")
  - Silent failure modes (e.g., "missing FX rates → data silently dropped")
  - Setup requirements (e.g., "Docker must be running for DwhRepo tests")
  - Common patterns and anti-patterns
- **Keep diagrams focused** — prefer multiple small diagrams over one giant one
- **Use flowchart/sequence/graph types** as appropriate for the content

### 5. Report what you did

After finishing, output a summary:
- Which diagrams were created/updated/skipped
- What key insights were captured
- Any domains that might benefit from future diagramming

## Diagram file template

```markdown
# [Domain Title]

## Overview
[1-2 sentence summary of what this covers]

## [Section with mermaid diagram]
` ` `mermaid
graph TD
    ...
` ` `

[Prose explaining gotchas, non-obvious behavior, common pitfalls]

## [Another section]
...
```
