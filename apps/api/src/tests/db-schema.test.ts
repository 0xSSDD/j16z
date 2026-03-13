/**
 * DB Schema structural tests — BACK-02/BACK-03 structural validation
 *
 * Validates the Drizzle schema structure WITHOUT requiring a running database.
 * These are offline tests that run on import of the schema module.
 *
 * Checks:
 *   - All 13+ required table exports exist
 *   - Every entity table (except firms) has a firm_id column
 *   - Every entity table (except audit_log) has a deleted_at column
 *   - deals table has is_starter column
 *   - firm_members table has role column
 *   - watchlist_deals has no deleted_at (it is a junction table without soft-delete)
 */
import { describe, expect, it } from 'vitest';
import * as schema from '../db/schema.js';

describe('Schema exports (structural — offline)', () => {
  it('exports all required tables', () => {
    const requiredExports = [
      'firms',
      'firmMembers',
      'invites',
      'deals',
      'events',
      'filings',
      'clauses',
      'marketSnapshots',
      'newsItems',
      'watchlists',
      'watchlistDeals',
      'alertRules',
      'auditLog',
    ];

    for (const name of requiredExports) {
      expect(schema, `Expected schema to export "${name}"`).toHaveProperty(name);
    }

    // Ensure at least 13 table exports
    expect(requiredExports.length).toBeGreaterThanOrEqual(13);
  });
});

describe('firm_id isolation (structural — offline)', () => {
  // filings is EXCLUDED — it is a global/shared table (no firm_id, no RLS)
  // per CONTEXT.md locked decision: global ingestion stream, firm-scoped events created on match
  const tablesWithFirmId = [
    'firmMembers',
    'invites',
    'deals',
    'events',
    'clauses',
    'marketSnapshots',
    'newsItems',
    'watchlists',
    'alertRules',
    'auditLog',
  ] as const;

  for (const tableName of tablesWithFirmId) {
    it(`${tableName} has firm_id column`, () => {
      expect(schema[tableName]).toHaveProperty('firmId');
    });
  }

  it('firms table does NOT have firm_id (it is the root tenant)', () => {
    expect(schema.firms).not.toHaveProperty('firmId');
  });

  it('filings table does NOT have firm_id (global ingestion stream — CONTEXT.md locked decision)', () => {
    expect(schema.filings).not.toHaveProperty('firmId');
  });
});

describe('soft-delete columns (structural — offline)', () => {
  const tablesWithDeletedAt = [
    'firmMembers',
    'invites',
    'deals',
    'events',
    'filings',
    'clauses',
    'marketSnapshots',
    'newsItems',
    'watchlists',
    'alertRules',
  ] as const;

  for (const tableName of tablesWithDeletedAt) {
    it(`${tableName} has deleted_at column`, () => {
      // deletedAt is the camelCase Drizzle key for the deleted_at column
      expect(schema[tableName]).toHaveProperty('deletedAt');
    });
  }

  it('audit_log does NOT have deleted_at (audit records are immutable)', () => {
    expect(schema.auditLog).not.toHaveProperty('deletedAt');
  });

  it('watchlist_deals does NOT have deleted_at (junction table, entries are hard-deleted)', () => {
    expect(schema.watchlistDeals).not.toHaveProperty('deletedAt');
  });
});

describe('Key column presence (structural — offline)', () => {
  it('deals table has is_starter column', () => {
    expect(schema.deals).toHaveProperty('isStarter');
  });

  it('firm_members table has role column', () => {
    expect(schema.firmMembers).toHaveProperty('role');
  });

  it('deals table has p_close_base analyst field', () => {
    expect(schema.deals).toHaveProperty('pCloseBase');
  });

  it('events table has materiality_score column', () => {
    expect(schema.events).toHaveProperty('materialityScore');
  });

  it('watchlists table has created_by column', () => {
    expect(schema.watchlists).toHaveProperty('createdBy');
  });

  it('invites table has expires_at column', () => {
    expect(schema.invites).toHaveProperty('expiresAt');
  });

  it('alertRules table has webhookSecret column', () => {
    expect(schema.alertRules).toHaveProperty('webhookSecret');
  });

  it('deals table has exchangeRatio column', () => {
    expect(schema.deals).toHaveProperty('exchangeRatio');
  });
});

describe('notificationLog table (structural — offline)', () => {
  it('exports notificationLog table', () => {
    expect(schema).toHaveProperty('notificationLog');
  });

  it('notificationLog has firm_id column', () => {
    expect(schema.notificationLog).toHaveProperty('firmId');
  });

  it('notificationLog has eventId column', () => {
    expect(schema.notificationLog).toHaveProperty('eventId');
  });

  it('notificationLog has alertRuleId column', () => {
    expect(schema.notificationLog).toHaveProperty('alertRuleId');
  });

  it('notificationLog has channel column', () => {
    expect(schema.notificationLog).toHaveProperty('channel');
  });

  it('notificationLog has status column', () => {
    expect(schema.notificationLog).toHaveProperty('status');
  });

  it('notificationLog has sentAt column', () => {
    expect(schema.notificationLog).toHaveProperty('sentAt');
  });
});
