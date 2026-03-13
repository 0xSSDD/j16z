/**
 * Daily Digest Email Template
 *
 * Dark-themed j16z branded email summarising overnight CRITICAL + WARNING events.
 * Rendered via @react-email/components render() to HTML string before sending.
 */
import { Body, Container, Head, Heading, Hr, Html, Link, Preview, Row, Section, Text } from '@react-email/components';
import type { DailyDigestEvent } from '../daily-digest.js';

// j16z dark theme palette
const colors = {
  bgPrimary: '#18181b',
  bgSurface: '#27272a',
  textPrimary: '#fafafa',
  textMuted: '#a1a1aa',
  border: '#3f3f46',
  auroraAmber: '#f5a623',
  critical: '#ef4444',
  warning: '#f97316',
  info: '#eab308',
};

function severityColor(severity: string): string {
  switch (severity) {
    case 'CRITICAL':
      return colors.critical;
    case 'WARNING':
      return colors.warning;
    default:
      return colors.info;
  }
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'America/New_York',
  }).format(date);
}

export interface DailyDigestEmailProps {
  events: DailyDigestEvent[];
  dateRange: string;
  userName: string;
}

export function DailyDigestEmail({ events, dateRange, userName }: DailyDigestEmailProps) {
  const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;
  const warningCount = events.filter((e) => e.severity === 'WARNING').length;

  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`j16z Daily Digest — ${events.length} event${events.length !== 1 ? 's' : ''} (${criticalCount} critical, ${warningCount} warning)`}
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
              Daily Digest
            </Heading>
            <Text style={{ margin: '4px 0 0', fontSize: '13px', color: colors.textMuted }}>
              {`${dateRange} · ${events.length} event${events.length !== 1 ? 's' : ''} · ${criticalCount} critical, ${warningCount} warning`}
            </Text>
          </Section>

          <Hr style={{ margin: '0', borderColor: colors.border }} />

          {/* Greeting */}
          <Section style={{ backgroundColor: colors.bgSurface, padding: '16px 28px' }}>
            <Text style={{ margin: '0', fontSize: '14px', color: colors.textMuted }}>
              Good morning, {userName}. Here&rsquo;s your overnight deal activity summary.
            </Text>
          </Section>

          <Hr style={{ margin: '0', borderColor: colors.border }} />

          {/* Event list */}
          {events.map((event) => (
            <Section
              key={event.id}
              style={{
                backgroundColor: colors.bgSurface,
                padding: '16px 28px',
                borderLeft: `3px solid ${severityColor(event.severity)}`,
              }}
            >
              <Row>
                <Text
                  style={{
                    margin: '0 0 2px',
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: severityColor(event.severity),
                    fontWeight: '600',
                  }}
                >
                  {event.severity}
                </Text>
              </Row>
              <Row>
                <Link href={event.sourceUrl} style={{ textDecoration: 'none' }}>
                  <Text
                    style={{
                      margin: '0 0 4px',
                      fontSize: '15px',
                      color: colors.textPrimary,
                      fontWeight: '600',
                      lineHeight: '1.4',
                    }}
                  >
                    {event.title}
                  </Text>
                </Link>
              </Row>
              <Row>
                <Text style={{ margin: '0', fontSize: '12px', color: colors.textMuted }}>
                  {event.dealName ? `${event.dealName} · ` : ''}
                  {event.type} · {formatTime(event.createdAt)}
                </Text>
              </Row>
            </Section>
          ))}

          <Hr style={{ margin: '0', borderColor: colors.border }} />

          {/* Footer */}
          <Section style={{ backgroundColor: colors.bgSurface, borderRadius: '0 0 8px 8px', padding: '16px 28px' }}>
            <Text style={{ margin: '0', fontSize: '11px', color: colors.textMuted }}>
              j16z M&A Intelligence Platform &middot; You&rsquo;re receiving this because daily digests are enabled.{' '}
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
