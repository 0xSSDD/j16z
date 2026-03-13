import type { Job } from 'bullmq';
import { and, eq, isNull, sql } from 'drizzle-orm';
import Parser from 'rss-parser';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';
import { createAgencyEvent, updateIngestionStatus } from './event-factory.js';

const parser = new Parser();
const MAX_ITEMS_PER_POLL = 50;

const MA_KEYWORDS = [
  'merger',
  'acquisition',
  'acquire',
  'antitrust',
  'consent decree',
  'divestiture',
  'hart-scott-rodino',
  'hsr',
  'second request',
  'preliminary injunction',
  'consent order',
  'proposed merger',
  'block merger',
  'challenge merger',
  'approve merger',
];

interface PollConfig {
  sourceName: 'ftc_rss' | 'doj_rss' | 'doj_civil_rss';
  feedUrl: string;
  source: 'FTC' | 'DOJ';
  subType: 'FTC_PRESS_RELEASE' | 'DOJ_PRESS_RELEASE' | 'DOJ_CIVIL_CASE';
  materialityScore: number;
}

interface DealRow {
  id: string;
  firmId: string | null;
  acquirer: string;
  target: string;
}

interface RssItem {
  title?: string;
  contentSnippet?: string;
  content?: string;
  guid?: string;
  id?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
}

interface RankedDeal {
  deal: DealRow;
  score: number;
}

interface CanaryMeta {
  canaryBaseline?: number;
  canaryZeroStreak?: number;
  lastBaselineUpdate?: string;
}

async function checkCanary(config: PollConfig, currentCount: number): Promise<void> {
  const rows = await adminDb
    .select()
    .from(schema.ingestionStatus)
    .where(eq(schema.ingestionStatus.sourceName, config.sourceName))
    .limit(1);

  if (!rows[0]) {
    // First run — row doesn't exist yet; let handleAgencyRss create it via updateIngestionStatus
    return;
  }

  const meta = (rows[0].metadata ?? {}) as CanaryMeta;
  const baseline = meta.canaryBaseline ?? 0;
  const zeroStreak = meta.canaryZeroStreak ?? 0;

  console.log(`[${config.sourceName}] Canary check: ${currentCount} items (baseline: ${baseline})`);

  if (baseline === 0) {
    // First canary check — establish baseline
    await adminDb
      .update(schema.ingestionStatus)
      .set({
        metadata: {
          canaryBaseline: currentCount,
          canaryZeroStreak: 0,
          lastBaselineUpdate: new Date().toISOString(),
        },
      })
      .where(eq(schema.ingestionStatus.sourceName, config.sourceName));
    return;
  }

  if (currentCount === 0 && baseline > 5) {
    const newStreak = zeroStreak + 1;
    if (newStreak >= 2) {
      // 2+ consecutive zero-item polls — fire canary
      await updateIngestionStatus(
        config.sourceName,
        false,
        `Canary alert: item count dropped from ${baseline} to 0 over ${newStreak} consecutive polls -- possible feed format change`,
        0,
      );
    } else {
      // Single zero poll — update streak but do NOT fire canary (weekend/holiday protection)
      await adminDb
        .update(schema.ingestionStatus)
        .set({ metadata: { ...meta, canaryZeroStreak: newStreak } })
        .where(eq(schema.ingestionStatus.sourceName, config.sourceName));
    }
    return;
  }

  if (currentCount > 0 && currentCount < baseline * 0.2) {
    // Count dropped >80% — fire canary immediately
    await updateIngestionStatus(
      config.sourceName,
      false,
      `Canary alert: item count dropped from ${baseline} to ${currentCount} -- possible feed format change`,
      currentCount,
    );
    return;
  }

  if (currentCount > 0) {
    // Healthy count — update baseline and reset streak
    await adminDb
      .update(schema.ingestionStatus)
      .set({
        metadata: {
          ...meta,
          canaryBaseline: currentCount,
          canaryZeroStreak: 0,
          lastBaselineUpdate: new Date().toISOString(),
        },
      })
      .where(eq(schema.ingestionStatus.sourceName, config.sourceName));
  }
}

export async function handleFtcCompetitionRss(job: Job): Promise<void> {
  await handleAgencyRss(job, {
    sourceName: 'ftc_rss',
    feedUrl: 'https://www.ftc.gov/feeds/press-release-competition.xml',
    source: 'FTC',
    subType: 'FTC_PRESS_RELEASE',
    materialityScore: 75,
  });
}

export async function handleDojAntitrustRss(job: Job): Promise<void> {
  await handleAgencyRss(job, {
    sourceName: 'doj_rss',
    feedUrl: 'https://www.justice.gov/news/rss?type[0]=press_release&field_component=376',
    source: 'DOJ',
    subType: 'DOJ_PRESS_RELEASE',
    materialityScore: 80,
  });
}

export async function handleDojCivilRss(job: Job): Promise<void> {
  await handleAgencyRss(job, {
    sourceName: 'doj_civil_rss',
    feedUrl: 'https://www.justice.gov/media/1190096/dl?inline',
    source: 'DOJ',
    subType: 'DOJ_CIVIL_CASE',
    materialityScore: 70,
  });
}

export function isMaRelevant(title: string, description?: string): boolean {
  const haystack = `${title} ${description ?? ''}`.toLowerCase();
  return MA_KEYWORDS.some((keyword) => haystack.includes(keyword.toLowerCase()));
}

function extractCompanyNamesFromTitle(title: string): string[] {
  const names = new Set<string>();
  const patterns: RegExp[] = [
    /(?:challenges?|sues to block|files suit to block|approves?)\s+(.+?)'s\s+(?:acquisition|merger)\s+(?:of|with)\s+(.+?)(?:$|,|\.|;)/i,
    /(?:acquisition|merger)\s+of\s+(.+?)\s+by\s+(.+?)(?:$|,|\.|;)/i,
    /(?:merger)\s+between\s+(.+?)\s+and\s+(.+?)(?:$|,|\.|;)/i,
    /(?:acquisition|merger)\s+with\s+(.+?)(?:$|,|\.|;)/i,
    /(?:acquisition|merger)\s+of\s+(.+?)(?:$|,|\.|;)/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (!match) continue;

    for (const capture of match.slice(1)) {
      const cleaned = normalizeCompanyName(capture);
      if (cleaned.length >= 3) {
        names.add(cleaned);
      }
    }
  }

  return Array.from(names);
}

async function handleAgencyRss(job: Job, config: PollConfig): Promise<void> {
  console.log(`[${config.sourceName}] Starting RSS poll (triggered by: ${job.data.triggeredBy ?? 'unknown'})`);

  let createdEvents = 0;

  try {
    const feed = await parser.parseURL(config.feedUrl);
    const items = (feed.items ?? []).slice(0, MAX_ITEMS_PER_POLL) as RssItem[];
    await checkCanary(config, items.length);
    const deals = await loadActiveDeals();

    for (const item of items) {
      const title = item.title?.trim();
      if (!title) continue;

      const description = getDescription(item);
      if (!isMaRelevant(title, description)) continue;

      const matchedDeals = findMatchingDeals(title, deals);
      if (matchedDeals.length === 0) continue;

      const sourceGuid = buildSourceGuid(item, title, config.subType);
      const duplicate = await hasExistingSourceGuid(sourceGuid);
      if (duplicate) continue;

      const eventTimestamp = getEventTimestamp(item);
      for (const deal of matchedDeals) {
        if (!deal.firmId) continue;

        await createAgencyEvent({
          firmId: deal.firmId,
          dealId: deal.id,
          subType: config.subType,
          title,
          description,
          sourceUrl: item.link ?? config.feedUrl,
          materialityScore: config.materialityScore,
          severity: getSeverity(config.materialityScore),
          source: config.source,
          timestamp: eventTimestamp,
          metadata: {
            sourceGuid,
            feedUrl: config.feedUrl,
            sourceName: config.sourceName,
            publishedAt: eventTimestamp.toISOString(),
          },
        });

        createdEvents++;
      }
    }

    await updateIngestionStatus(config.sourceName, true, undefined, createdEvents);
    console.log(`[${config.sourceName}] Complete. Created ${createdEvents} agency events.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : `Unknown ${config.sourceName} poll error`;
    await updateIngestionStatus(config.sourceName, false, message, createdEvents);
    throw error;
  }
}

function normalizeCompanyName(value: string): string {
  return value
    .replace(/&amp;/gi, '&')
    .replace(/&#39;/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .replace(/\b(the|inc\.?|corp\.?|corporation|company|co\.?|llc|ltd\.?|plc|group|holdings?)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDescription(item: RssItem): string {
  const raw = (item.contentSnippet ?? item.content ?? '').trim();
  if (!raw) return 'Government press release regarding merger enforcement activity.';
  return raw.replace(/<[^>]+>/g, '').trim();
}

function getEventTimestamp(item: RssItem): Date {
  const timestamp = item.isoDate ?? item.pubDate;
  if (!timestamp) return new Date();
  const parsed = new Date(timestamp);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildSourceGuid(item: RssItem, title: string, subType: string): string {
  return item.guid ?? item.id ?? item.link ?? `${subType}:${title.toLowerCase()}:${item.pubDate ?? ''}`;
}

async function hasExistingSourceGuid(sourceGuid: string): Promise<boolean> {
  const existing = await adminDb
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(and(eq(schema.events.type, 'AGENCY'), sql`metadata ->> 'sourceGuid' = ${sourceGuid}`))
    .limit(1);

  return existing.length > 0;
}

async function loadActiveDeals(): Promise<DealRow[]> {
  return adminDb
    .select({
      id: schema.deals.id,
      firmId: schema.deals.firmId,
      acquirer: schema.deals.acquirer,
      target: schema.deals.target,
    })
    .from(schema.deals)
    .where(isNull(schema.deals.deletedAt));
}

function findMatchingDeals(title: string, deals: DealRow[]): DealRow[] {
  const normalizedTitle = normalizeCompanyName(title).toLowerCase();
  const companyCandidates = extractCompanyNamesFromTitle(title).map((name) => name.toLowerCase());

  const rankedMatches: RankedDeal[] = [];

  for (const deal of deals) {
    const acquirerName = normalizeCompanyName(deal.acquirer).toLowerCase();
    const targetName = normalizeCompanyName(deal.target).toLowerCase();

    let score = 0;

    for (const candidate of companyCandidates) {
      if (candidate.includes(acquirerName) || acquirerName.includes(candidate)) score += 2;
      if (candidate.includes(targetName) || targetName.includes(candidate)) score += 2;
    }

    if (normalizedTitle.includes(acquirerName)) score += 1;
    if (normalizedTitle.includes(targetName)) score += 1;

    if (score > 0) {
      rankedMatches.push({ deal, score });
    }
  }

  if (rankedMatches.length === 0) return [];

  const maxScore = Math.max(...rankedMatches.map((match) => match.score));
  const best = rankedMatches.filter((match) => match.score === maxScore).map((match) => match.deal);

  const uniqueById = new Map(best.map((deal) => [deal.id, deal]));
  return Array.from(uniqueById.values());
}

function getSeverity(score: number): 'CRITICAL' | 'WARNING' | 'INFO' {
  if (score >= 70) return 'CRITICAL';
  if (score >= 50) return 'WARNING';
  return 'INFO';
}
