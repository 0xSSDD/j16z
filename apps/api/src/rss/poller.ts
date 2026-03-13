import type { Job } from 'bullmq';
import { and, eq, isNull, sql } from 'drizzle-orm';
import Parser from 'rss-parser';
import { adminDb } from '../db/index.js';
import * as schema from '../db/schema.js';

type RssItem = {
  title?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  link?: string;
  isoDate?: string;
  pubDate?: string;
};

const parser = new Parser();

/**
 * Score an RSS item based on M&A keyword relevance.
 * Base score is 30 (INFO tier); keywords add points up to a cap of 70.
 * Cap at 70 ensures RSS news cannot reach CRITICAL tier on its own.
 */
export function scoreRssItem(title: string, content: string): number {
  const haystack = `${title} ${content}`.toLowerCase();
  let score = 30; // base score for NEWS/RSS_ARTICLE

  if (/merger|acquisition|deal/.test(haystack)) score += 10;
  if (/antitrust|regulatory|ftc|doj/.test(haystack)) score += 15;
  if (/injunction|block|challenge/.test(haystack)) score += 20;
  if (/second request|hsr/.test(haystack)) score += 20;
  if (/termination|break fee|mae/.test(haystack)) score += 15;
  if (/shareholder suit|litigation/.test(haystack)) score += 10;

  return Math.min(score, 70); // cap: news cannot reach CRITICAL alone
}

function getRssSeverity(score: number): 'CRITICAL' | 'WARNING' | 'INFO' {
  if (score >= 70) return 'CRITICAL';
  if (score >= 50) return 'WARNING';
  return 'INFO';
}

export async function handleRssPoll(job: Job): Promise<void> {
  console.log(`[rss_poll] Starting RSS poll (triggered by: ${job.data.triggeredBy ?? 'unknown'})`);

  const feeds = await adminDb
    .select()
    .from(schema.rssFeeds)
    .where(and(eq(schema.rssFeeds.status, 'active'), isNull(schema.rssFeeds.deletedAt)));

  let totalEventsCreated = 0;
  let failedFeeds = 0;

  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = (parsed.items ?? []) as RssItem[];
      const newItems = items.filter((item) => isNewItem(item, feed.lastSyncAt));
      const deals = await getDealsForFeed(feed.firmId, feed.watchlistId);

      for (const item of newItems) {
        const matches = findMatchedDeals(item, deals);

        for (const deal of matches) {
          const guid = getItemGuid(item);
          const alreadyExists = await rssEventExists(feed.firmId, deal.id, guid);
          if (alreadyExists) {
            continue;
          }

          const itemScore = scoreRssItem(item.title ?? '', buildDescription(item));
          await adminDb.insert(schema.events).values({
            firmId: feed.firmId,
            dealId: deal.id,
            type: 'NEWS',
            subType: 'RSS_ARTICLE',
            title: item.title ?? 'RSS article',
            description: buildDescription(item),
            source: 'RSS',
            sourceUrl: item.link ?? feed.url,
            timestamp: getItemTimestamp(item),
            materialityScore: itemScore,
            severity: getRssSeverity(itemScore),
            metadata: {
              feedId: feed.id,
              feedName: feed.name,
              rssGuid: guid,
              rssLink: item.link ?? null,
            },
          });

          totalEventsCreated++;
        }
      }

      await adminDb
        .update(schema.rssFeeds)
        .set({
          status: 'active',
          lastError: null,
          lastSyncAt: new Date(),
          itemCount: sql`${schema.rssFeeds.itemCount} + ${newItems.length}`,
          updatedAt: new Date(),
        })
        .where(eq(schema.rssFeeds.id, feed.id));
    } catch (error) {
      failedFeeds++;
      const message = error instanceof Error ? error.message : 'Unknown RSS polling error';

      await adminDb
        .update(schema.rssFeeds)
        .set({
          status: 'error',
          lastError: message,
          updatedAt: new Date(),
        })
        .where(eq(schema.rssFeeds.id, feed.id));
    }
  }

  const now = new Date();

  await adminDb
    .insert(schema.ingestionStatus)
    .values({
      sourceName: 'rss',
      lastSuccessfulSync: now,
      isHealthy: failedFeeds === 0,
      lastError: failedFeeds === 0 ? null : `${failedFeeds} RSS feed(s) failed in last poll`,
      lastErrorAt: failedFeeds === 0 ? null : now,
      itemsIngested: totalEventsCreated,
      metadata: {
        totalFeeds: feeds.length,
        failedFeeds,
        eventsCreated: totalEventsCreated,
      },
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.ingestionStatus.sourceName,
      set: {
        lastSuccessfulSync: now,
        isHealthy: failedFeeds === 0,
        lastError: failedFeeds === 0 ? null : `${failedFeeds} RSS feed(s) failed in last poll`,
        lastErrorAt: failedFeeds === 0 ? null : now,
        itemsIngested: totalEventsCreated,
        metadata: {
          totalFeeds: feeds.length,
          failedFeeds,
          eventsCreated: totalEventsCreated,
        },
        updatedAt: now,
      },
    });

  console.log(`[rss_poll] Completed. feeds=${feeds.length}, failed=${failedFeeds}, events=${totalEventsCreated}`);
}

function getItemTimestamp(item: RssItem): Date {
  const parsedDate = parseDate(item.isoDate ?? item.pubDate);
  return parsedDate ?? new Date();
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

function isNewItem(item: RssItem, lastSyncAt: Date | null): boolean {
  if (!lastSyncAt) {
    return true;
  }

  const publishedAt = parseDate(item.isoDate ?? item.pubDate);
  if (!publishedAt) {
    return false;
  }

  return publishedAt > lastSyncAt;
}

function getItemGuid(item: RssItem): string {
  return item.guid ?? item.link ?? item.title ?? `rss-item-${Date.now()}`;
}

function buildDescription(item: RssItem): string {
  return item.contentSnippet ?? item.content ?? item.title ?? 'No description available';
}

type DealMatchRow = {
  id: string;
  symbol: string;
  acquirer: string;
  target: string;
};

async function getDealsForFeed(firmId: string, watchlistId: string | null): Promise<DealMatchRow[]> {
  if (watchlistId) {
    const rows = await adminDb
      .select({
        id: schema.deals.id,
        symbol: schema.deals.symbol,
        acquirer: schema.deals.acquirer,
        target: schema.deals.target,
      })
      .from(schema.watchlistDeals)
      .innerJoin(schema.deals, eq(schema.watchlistDeals.dealId, schema.deals.id))
      .where(
        and(
          eq(schema.watchlistDeals.watchlistId, watchlistId),
          eq(schema.deals.firmId, firmId),
          isNull(schema.deals.deletedAt),
        ),
      );

    return rows;
  }

  return adminDb
    .select({
      id: schema.deals.id,
      symbol: schema.deals.symbol,
      acquirer: schema.deals.acquirer,
      target: schema.deals.target,
    })
    .from(schema.deals)
    .where(and(eq(schema.deals.firmId, firmId), isNull(schema.deals.deletedAt)));
}

function findMatchedDeals(item: RssItem, deals: DealMatchRow[]): DealMatchRow[] {
  const haystack = `${item.title ?? ''} ${item.contentSnippet ?? ''} ${item.content ?? ''}`.toLowerCase();
  if (!haystack.trim()) {
    return [];
  }

  return deals.filter((deal) => {
    const needles = [deal.symbol, deal.acquirer, deal.target]
      .map((value) => value.toLowerCase().trim())
      .filter(Boolean);
    return needles.some((needle) => haystack.includes(needle));
  });
}

async function rssEventExists(firmId: string, dealId: string, guid: string): Promise<boolean> {
  const rows = await adminDb
    .select({ id: schema.events.id })
    .from(schema.events)
    .where(
      and(
        eq(schema.events.firmId, firmId),
        eq(schema.events.dealId, dealId),
        eq(schema.events.type, 'NEWS'),
        eq(schema.events.subType, 'RSS_ARTICLE'),
        sql`${schema.events.metadata} ->> 'rssGuid' = ${guid}`,
        isNull(schema.events.deletedAt),
      ),
    )
    .limit(1);

  return rows.length > 0;
}
