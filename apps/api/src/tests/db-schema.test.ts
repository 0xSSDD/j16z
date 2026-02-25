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
import { describe, it, expect } from 'vitest';
import * as schema from '../db/schema.js';

// Helper: extract column names from a Drizzle table
function getColumnNames(table: Record<string, unknown>): string[] {
  // Drizzle tables expose columns via the getSQL() shape — check for keys that are Column objects
  // The internal structure for Drizzle ORM v4+ stores columns in table[Symbol] or as direct properties
  // We check the table's enumerable string keys which are the Drizzle column names
  return Object.keys(table).filter((key) => {
    const val = table[key];
    // A Drizzle column has a columnType or sql property
    return val !== null && typeof val === 'object' && ('columnType' in val || 'dataType' in val);
  });
}

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
  const tablesWithFirmId = [
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
    'auditLog',
  ] as const;

  for (const tableName of tablesWithFirmId) {
    it(`${tableName} has firm_id column`, () => {
      const table = schema[tableName] as Record<string, unknown>;
      expect(table).toHaveProperty('firmId');
    });
  }

  it('firms table does NOT have firm_id (it is the root tenant)', () => {
    const table = schema.firms as Record<string, unknown>;
    expect(table).not.toHaveProperty('firmId');
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
      const table = schema[tableName] as Record<string, unknown>;
      // deletedAt is the camelCase Drizzle key for the deleted_at column
      expect(table).toHaveProperty('deletedAt');
    });
  }

  it('audit_log does NOT have deleted_at (audit records are immutable)', () => {
    const table = schema.auditLog as Record<string, unknown>;
    expect(table).not.toHaveProperty('deletedAt');
  });

  it('watchlist_deals does NOT have deleted_at (junction table, entries are hard-deleted)', () => {
    const table = schema.watchlistDeals as Record<string, unknown>;
    expect(table).not.toHaveProperty('deletedAt');
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
});
