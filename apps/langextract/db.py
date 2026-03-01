"""
Database utilities for the langextract Python service.

Uses psycopg3 (psycopg) with a direct Postgres connection via DATABASE_URL
(service-role, bypasses RLS — consistent with adminDb pattern in Node.js API).

Connection pooling via psycopg_pool.AsyncConnectionPool.
"""
from __future__ import annotations

import os
import logging
from typing import Optional

import psycopg
from psycopg_pool import AsyncConnectionPool

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Connection pool — initialised lazily on first use
# ---------------------------------------------------------------------------
_pool: Optional[AsyncConnectionPool] = None


async def get_pool() -> AsyncConnectionPool:
    """Return the shared connection pool, initialising it on first call."""
    global _pool
    if _pool is None:
        db_url = os.environ['DATABASE_URL']
        _pool = AsyncConnectionPool(
            conninfo=db_url,
            min_size=1,
            max_size=5,
            open=False,
        )
        await _pool.open()
        logger.info('[db] Connection pool initialised')
    return _pool


async def close_pool() -> None:
    """Close the connection pool on graceful shutdown."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info('[db] Connection pool closed')


# ---------------------------------------------------------------------------
# Filing utilities
# ---------------------------------------------------------------------------

async def fetch_filing_content(filing_id: str) -> tuple[Optional[str], str]:
    """
    Fetch rawContent and filingType for a filing.

    Returns:
        (raw_content, filing_type) — raw_content may be None if download pending.
    """
    pool = await get_pool()
    async with pool.connection() as conn:
        row = await conn.fetchrow(
            'SELECT raw_content, filing_type FROM filings WHERE id = %s',
            (filing_id,),
        )
    if row is None:
        raise ValueError(f'Filing {filing_id} not found')
    return row['raw_content'], row['filing_type']


async def mark_filing_extracted(filing_id: str) -> None:
    """Set filings.extracted = true after successful extraction."""
    pool = await get_pool()
    async with pool.connection() as conn:
        await conn.execute(
            'UPDATE filings SET extracted = true, updated_at = NOW() WHERE id = %s',
            (filing_id,),
        )
    logger.info(f'[db] Marked filing {filing_id} as extracted')


async def insert_filing_summary(
    filing_id: str,
    headline: str,
    section: Optional[str] = None,
) -> None:
    """
    Store analyst-facing summaries on the filings row.

    headline: 2-3 sentence summary for Inbox/feed (headlineSummary column).
    section:  Expandable section-level summary for S-4/DEFM14A (sectionSummary column).
    """
    pool = await get_pool()
    async with pool.connection() as conn:
        await conn.execute(
            '''
            UPDATE filings
            SET headline_summary = %s,
                section_summary  = %s,
                updated_at       = NOW()
            WHERE id = %s
            ''',
            (headline, section, filing_id),
        )
    logger.info(f'[db] Stored summary for filing {filing_id}')


# ---------------------------------------------------------------------------
# Clause utilities
# ---------------------------------------------------------------------------

async def insert_clause(
    firm_id: str,
    deal_id: str,
    filing_id: str,
    clause_type: str,
    title: str,
    summary: str,
    verbatim_text: str,
    source_location: str,
    confidence_score: Optional[float] = None,
) -> None:
    """
    Insert an extracted clause row for a single firm.

    ON CONFLICT respects analyst_verified: if the analyst has manually
    verified/corrected a clause (analyst_verified = true), we do NOT overwrite
    it — per Pitfall 4 in RESEARCH.md.

    Conflict key is (filing_id, type) — unique per filing per clause type.
    Note: the clauses table has no unique constraint on (filing_id, type) yet;
    this insert uses INSERT ... ON CONFLICT DO NOTHING as a safe fallback
    until the constraint is added in a future migration.
    """
    pool = await get_pool()
    async with pool.connection() as conn:
        await conn.execute(
            '''
            INSERT INTO clauses
              (firm_id, deal_id, filing_id, type, title, summary, verbatim_text,
               source_location, extracted_at, confidence_score, analyst_verified,
               created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), %s, FALSE, NOW(), NOW())
            ON CONFLICT DO NOTHING
            ''',
            (
                firm_id,
                deal_id,
                filing_id,
                clause_type,
                title,
                summary,
                verbatim_text,
                source_location,
                confidence_score,
            ),
        )


# ---------------------------------------------------------------------------
# Event utilities (for Inbox integration)
# ---------------------------------------------------------------------------

async def create_extraction_event(
    firm_id: str,
    deal_id: str,
    title: str,
    description: str,
    source_url: str,
    materiality_score: int,
    severity: str,
    sub_type: str = 'EXTRACTION_COMPLETE',
) -> None:
    """
    Insert an Event row so the extraction result appears in the firm's Inbox.

    type = 'FILING', sub_type = 'EXTRACTION_COMPLETE' by default.
    materiality_score and severity are computed by the Python scoring module.
    """
    pool = await get_pool()
    async with pool.connection() as conn:
        await conn.execute(
            '''
            INSERT INTO events
              (firm_id, deal_id, type, sub_type, title, description,
               source, source_url, timestamp, materiality_score, severity,
               created_at, updated_at)
            VALUES (%s, %s, 'FILING', %s, %s, %s, 'SEC_EDGAR', %s, NOW(), %s, %s, NOW(), NOW())
            ''',
            (
                firm_id,
                deal_id,
                sub_type,
                title,
                description,
                source_url,
                materiality_score,
                severity,
            ),
        )
    logger.info(f'[db] Created extraction event for deal {deal_id} / firm {firm_id}')
