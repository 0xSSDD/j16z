/**
 * Weekly Digest Email Template
 *
 * Dark-themed j16z branded email summarising deal-level activity for the past 7 days.
 * Rendered via @react-email/components render() to HTML string before sending.
 */
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Row, Section, Text } from '@react-email/components';
import type { WeeklyDealSummary } from '../weekly-digest.js';

// j16z dark theme palette
const colors = {
  bgPrimary: '#18181b',
  bgSurface: '#27272a',
  textPrimary: '#fafafa',
  textMuted: '#a1a1aa',
  border: '#3f3f46',
  auroraAmber: '#f5a623',
  auroraIndigo: '#6366f1',
  critical: '#ef4444',
  warning: '#f97316',
  positive: '#22c55e',
};

function statusColor(status: string): string {
  switch (status) {
    case 'TERMINATED':
      return colors.critical;
    case 'REGULATORY_REVIEW':
    case 'LITIGATION':
      return colors.warning;
    case 'CLOSED':
      return colors.positive;
    default:
      return colors.auroraIndigo;
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case 'ANNOUNCED':
      return 'Announced';
    case 'REGULATORY_REVIEW':
      return 'Reg. Review';
    case 'LITIGATION':
      return 'Litigation';
    case 'TERMINATED':
      return 'Terminated';
    case 'CLOSED':
      return 'Closed';
    default:
      return status;
  }
}

export interface WeeklyDigestEmailProps {
  deals: WeeklyDealSummary[];
  weekRange: string;
  userName: string;
}

export function WeeklyDigestEmail({ deals, weekRange, userName }: WeeklyDigestEmailProps) {
  const totalEvents = deals.reduce((sum, d) => sum + d.eventCount, 0);
  const criticalDeals = deals.filter((d) => d.criticalCount > 0).length;

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`j16z Weekly Digest — ${deals.length} active deal${deals.length !== 1 ? 's' : ''}, ${totalEvents} events this week`}
      </Preview>
      <Body
        style={{
          backgroundColor: colors.bgPrimary,
          margin: '0',
          padding: '0',
          fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
        }}
      >
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 16px' }}>
          {/* Header */}
          <Section
            style={{
              backgroundColor: colors.bgSurface,
              borderRadius: '8px 8px 0 0',
              borderTop: `3px solid ${colors.auroraAmber}`,
              padding: '24px 28px 16px',
            }}
          >
            <Text
              style={{
                margin: '0 0 4px',
                fontSize: '11px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                color: colors.auroraAmber,
                fontWeight: '600',
              }}
            >
              j16z M&A Intelligence
            </Text>
            <Heading style={{ margin: '0', fontSize: '20px', color: colors.textPrimary, fontWeight: '700' }}>
              Weekly Deal Summary
            </Heading>
            <Text style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>
              {`Week of ${weekRange} · ${deals.length} deal${deals.length !== 1 ? 's' : ''} · ${totalEvents} events · ${criticalDeals} with critical activity`}
            </Text>
          </Section>

          <Hr style={{ margin: '0', borderColor: colors.border }} />

          {/* Greeting */}
          <Section style={{ backgroundColor: colors.bgSurface, padding: '16px 28px' }}>
            <Text style={{ margin: '0', fontSize: '14px', color: colors.textMuted }}>
              Hi {userName}, here&rsquo;s your weekly M&A deal activity summary.
            </Text>
          </Section>

          <Hr style={{ margin: '0', borderColor: colors.border }} />

          {/* Column headers */}
          <Section style={{ backgroundColor: colors.bgPrimary, padding: '10px 28px' }}>
            <Row>
              <Text
                style={{
                  margin: '0',
                  fontSize: '11px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: colors.textMuted,
                  fontWeight: '600',
                }}
              >
                Deal
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                Status &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Events &nbsp;&nbsp;&nbsp; Spread
              </Text>
            </Row>
          </Section>

          {/* Deal rows */}
          {deals.map((deal) => (
            <Section
              key={deal.dealId}
              style={{
                backgroundColor: colors.bgSurface,
                padding: '14px 28px',
                borderLeft:
                  deal.criticalCount > 0
                    ? `3px solid ${colors.critical}`
                    : deal.warningCount > 0
                      ? `3px solid ${colors.warning}`
                      : '3px solid transparent',
              }}
            >
              <Row>
                <Text style={{ margin: '0 0 4px', fontSize: '14px', color: colors.textPrimary, fontWeight: '600' }}>
                  {deal.dealName}
                </Text>
              </Row>
              <Row>
                <Text style={{ margin: '0', fontSize: '12px', color: colors.textMuted }}>
                  <span style={{ color: statusColor(deal.status), fontWeight: '600' }}>{statusLabel(deal.status)}</span>{' '}
                  · {deal.eventCount} event{deal.eventCount !== 1 ? 's' : ''}
                  {deal.criticalCount > 0 ? ` (${deal.criticalCount} critical)` : ''}
                  {deal.warningCount > 0 ? ` (${deal.warningCount} warning)` : ''}
                  {deal.latestSpread ? ` · Spread: ${deal.latestSpread}` : ''}
                  {deal.statusChanged ? ' · ⚡ Material change' : ''}
                </Text>
              </Row>
            </Section>
          ))}

          <Hr style={{ margin: '0', borderColor: colors.border }} />

          {/* Footer */}
          <Section style={{ backgroundColor: colors.bgSurface, borderRadius: '0 0 8px 8px', padding: '16px 28px' }}>
            <Text style={{ margin: '0', fontSize: '11px', color: colors.textMuted }}>
              j16z M&A Intelligence Platform &middot; You&rsquo;re receiving this because weekly digests are enabled.{' '}
              <Link href="{{unsubscribe_url}}" style={{ color: colors.auroraAmber, textDecoration: 'underline' }}>
                Manage preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
