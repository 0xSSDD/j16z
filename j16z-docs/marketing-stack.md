# j16z Marketing Stack: Claude as the Growth Engine

_Date: March 2026_

---

## Philosophy

No $500/mo SaaS tools. Claude Code IS the marketing team. The stack is free/open-source MCP servers, free API tiers, and self-hosted tools. Total cost target: **$0-20/mo**.

---

## The Complete $0/mo Stack (Summary)

```
CHANNEL              TOOL                           COST    HOW CLAUDE USES IT
─────────────────────────────────────────────────────────────────────────────
Twitter/X            Twitter MCP + X API free       $0      Write + post tweets, threads
Reddit               Reddit MCP                     $0      Post in relevant subs, reply
GitHub               GitHub MCP (official, 27.9K*)  $0      Manage repos, issues, discussions
Email (sending)      Resend MCP (official)           $0      3,000 emails/mo free
Email (volume)       Brevo SMTP + mcp-server-smtp   $0      9,000 emails/mo free via SMTP
Email (sequences)    Sender.net                      $0      15,000 emails/mo, automation, API
Lead finding         Apollo.io free tier             $0      10,000 email credits/mo, REST API
Lead finding         Hunter.io MCP                   $0      25 searches + 50 verifications/mo
Email verification   QuickEmailVerification          $0      3,000 verifications/mo free
Blog publishing      Ghost MCP                       $0      Create, schedule, publish (self-hosted)
Blog cross-post      Dev.to API                      $0      REST API, fully automatable
Blog cross-post      Hashnode API                    $0      GraphQL API, fully automatable
SEO                  Google Search Console MCP       $0      Rankings, traffic, indexing
Analytics            Google Analytics MCP (official) $0      Query GA4 via natural language
Social scheduling    Postiz (self-hosted)            $0      20+ platforms, open source
Workflow automation  n8n (self-hosted)               $0      Unlimited workflows, Claude-native
Landing pages        Claude Code + Vercel            $0      Generate + deploy (hobby tier)
PR / journalist      HARO + SourceBottle             $0      Monitor queries, draft pitches
PR / journalist      Twitter MCP + Firecrawl MCP    $0      Find journalists, scrape bylines
Brand monitoring     Google Alerts                   $0      Free monitoring
Referral program     Refferq (self-hosted)           $0      38 API endpoints, open source
Slack communities    Slack MCP (official)            $0      Post, engage in channels
Discord communities  Discord MCP                     $0      Post in servers
HN monitoring        HN MCP (read-only)              $0      Research trending, track mentions
Web scraping         Firecrawl MCP (5.8K*)           $0      Competitive intel, lead research
─────────────────────────────────────────────────────────────────────────────
TOTAL                                               $0/mo
```

### Optional upgrades worth paying for

| Tool | Cost | What it adds |
|---|---|---|
| Cold email domain + Google Workspace | $8/mo | Separate domain for outreach, protects j16z.com reputation |
| Resend Pro | $20/mo | 50K emails/mo (if scaling outreach) |
| Blotato | $29/mo | Schedule posts across ALL platforms from Claude Code without self-hosting Postiz |
| Ahrefs | $129/mo | Deep SEO (only when organic traffic matters) |

---

## 1. Social Media: Twitter/X

### Infrastructure

- **MCP Server**: `EnesCinr/twitter-mcp` — post tweets, search, manage interactions
- **API Tier**: X free tier — 1,500 tweets/mo (write-only), no read access
- **Alternative**: Postiz (self-hosted) for scheduling + analytics

### Content strategy (Claude writes all of this)

**Daily (2-3 tweets):**
- Comment on live M&A deal news with actual analysis from EDGAR/CourtListener data
- Quote-tweet merger-arb accounts: @MergerArbitrage, @DealReporter, @capitolforum, @bnaborern
- Share original deal clause breakdowns that analysts can't get elsewhere

**Weekly (1 thread):**
- Deep-dive deal analysis thread (7-tweet sweet spot)
- "I read the full [Company] S-4 so you don't have to" format
- Clause-by-clause breakdown with implications for deal probability

**Best posting times (finance audience):**
- 6-9 AM ET (pre-market — highest engagement)
- 12 PM ET (midday break)
- 4 PM ET (market close)
- Weekdays only

**Growth mechanics:**
- Engagement-first: reply to niche accounts with valuable comments (quality replies get more visibility than original posts)
- Images get 18% more clicks, 89% more favorites, 150% more retweets vs text-only
- First-person perspective gets 23% more engagement
- DO NOT: follow/unfollow, engagement pods, buy followers (algorithm detects and penalizes)

### Automation rules (X Terms of Service)
- Posting via API: allowed
- AI-generated content: allowed
- Automated likes/follows/retweets/replies/DMs: NOT allowed

---

## 2. Community Seeding

### Reddit

- **MCP Server**: `jordanburke/reddit-mcp-server` — post, comment, search (with anti-spam safeguards)
- **Target subreddits**:
  - r/mergersandacquisitions — direct audience
  - r/hedgefund — target customer community
  - r/algotrading — quant-adjacent, AI tools welcome
  - r/SaaS (~500K members) — self-promotion explicitly allowed
  - r/Startups (1.5M) — weekly feedback threads
  - r/IndieHackers (200K+) — celebrates transparency

**Rule**: 95% value, 5% product mention. Claude generates value-first posts with subtle j16z references.

### Hacker News

- **MCP Server**: `erithwik/mcp-hn` — read-only (stories, comments, search)
- **No write API** — submission must be manual
- **Claude's role**: Draft perfect "Show HN: [title]" post + prepare responses to likely comments
- **Timing**: Post ~4 PM SGT / 8 AM London / midnight Pacific

### Dev.to + Hashnode (cross-posting)

- **Dev.to API**: `POST https://dev.to/api/articles` — fully automatable, free
- **Hashnode API**: GraphQL at `https://api.hashnode.com` — fully automatable, free
- Claude writes one article, publishes to both via API, sets canonical URL to j16z blog

### Indie Hackers / Product Hunt

- No confirmed write API for either — Claude drafts content, human posts
- **Product Hunt MCP** (`jaipandya/producthunt-mcp-server`): read-only, 10 tools for researching competitor launches and timing your own

---

## 3. Email Outreach Infrastructure

### The $0-8/mo cold email stack

```
LEAD FINDING          VERIFICATION          SENDING              WARM-UP
────────────          ────────────          ───────              ───────
Apollo.io free        QuickEmailVerif.      Brevo SMTP           TrulyInbox
10K credits/mo        3K/mo free            9K emails/mo free    10/day free
REST API              REST API              mcp-server-smtp      OR manual

Hunter.io MCP         ZeroBounce            Resend MCP (backup)
25 searches/mo        100/mo free           3K/mo free
mcp.hunter.io         REST API              Official MCP
```

### Email sending services compared

| Service | Free Tier | Daily Limit | Monthly Limit | MCP Server | Best For |
|---|---|---|---|---|---|
| **Brevo** | Forever free | 300/day | ~9,000/mo | No (use mcp-server-smtp) | Highest free volume |
| **Resend** | Forever free | 100/day | 3,000/mo | Official (56+ tools) | Best Claude Code integration |
| **Mailgun** | Forever free | 100/day | ~3,000/mo | Official (50+ ops) | Best deliverability tooling |
| **Mailtrap** | Forever free | 150/day | 4,000/mo | Official | Sandbox testing |
| **Amazon SES** | 12 months free | N/A | 3,000/mo | Yes (AWS sample) | Cheapest at scale ($0.10/1K) |
| **Sender.net** | Forever free | N/A | 15,000/mo | No | Best for sequences/automation |

### Key MCP servers for email

| MCP Server | Install | What it does |
|---|---|---|
| **mcp-server-smtp** | `npx -y @smithery/cli install @samihalawa/mcp-server-smtp --client claude` | Generic SMTP: works with Brevo, SES, Gmail, any provider. Bulk send with delays, template variables ({{name}}, {{company}}), logs |
| **Resend MCP** | Official, see github.com/resend/mcp-send-email | Send, batch, manage contacts, domains. Dedicated Claude Code page at resend.com/claude-code |
| **Mailgun MCP** | Official, Apache 2.0 | Send, delivery stats, bounce rates, spam complaints |
| **Gmail MCP** | github.com/GongRzhe/Gmail-MCP-Server | Read + write Gmail, labels, attachments, OAuth2 |

### Domain setup for cold outreach

**Critical: NEVER send cold email from j16z.com. Buy separate domains.**

- Buy 1-2 domains that look related (e.g., `j16zhq.com`, `getj16z.com`)
- Use `.com` TLD only (`.io`, `.biz` perform poorly)
- Set up Google Workspace ($7/mo per inbox) for best B2B deliverability
- Configure SPF + DKIM + DMARC (now mandatory — Gmail, Yahoo, and Outlook enforce)

**Warm-up schedule (manual, free):**
- Week 1-2: 10-20 emails/day to accounts you control
- Week 3-4: 20-50/day, add real recipients
- Week 5-6: Scale to 50-100/day
- Full volume ready in ~6 weeks

**Sending limits:**
- New domain, first 2 weeks: 10-20/day
- Established domain: 50-100 cold emails/day
- Google Workspace hard cap: 2,000/day (safe cold limit: ~100)
- To send 1,000/day: need 5-7 domains with 2-3 inboxes each

### CAN-SPAM compliance (every email must have)

1. Accurate "From" name and email address
2. Non-deceptive subject line
3. Physical postal address (virtual office OK)
4. Clear unsubscribe mechanism
5. Honor opt-outs within 10 business days
6. Penalty: up to $51,744 per violating email

### Cold email benchmarks (2026)

| Metric | Average | Top Performers |
|---|---|---|
| Open rate | 27.7% | 48.6% |
| Reply rate | 3.43% | 10%+ |
| Signal-based outreach | 15-25% | 40-50% |
| Best days | Tue/Wed/Thu | Wednesday peak |

---

## 4. PR & Journalist Outreach

### The free journalist discovery workflow

```
STEP 1: Find journalists who cover M&A / fintech / hedge funds

  Twitter MCP → search "merger arbitrage" OR "M&A deal"
    filter by verified accounts, journalists
    → list of handles + names

  Firecrawl MCP → scrape recent articles on TechCrunch, Bloomberg,
    Forbes tagged "mergers-acquisitions"
    → author names + bylines

  Hunter.io MCP → find email addresses (25 free searches/mo)
    → verified journalist emails

STEP 2: Verify emails
  QuickEmailVerification API (3,000/mo free)
  → only send to verified addresses

STEP 3: Claude writes personalized pitch
  NOT "check out our product" but:
  "I saw your piece on [specific article]. We're running a live
   AI simulation of [Deal] against Polymarket pricing — thought
   you might find the methodology interesting for a piece on
   AI in finance. Here's the live page: sim.j16z.com"

STEP 4: Send via Resend MCP
  Personalized, one-at-a-time (not bulk blast)
  From personal email, not cold domain
```

### Free PR tools

| Tool | What it does | Cost |
|---|---|---|
| **HARO** (relaunched Apr 2025) | Daily journalist queries — respond with expertise to get quoted | Free |
| **SourceBottle** | Same concept, global coverage, filter by region/industry | Free |
| **Qwoted** | Matches experts with journalist requests | Free (2 pitches/mo), $99/mo paid |
| **Medialyst.ai** | AI journalist matcher — describe announcement, get matched journalists | Waitlist (TBD) |
| **PressPulse AI** | HARO alternative with AI matching, 96% less spam | 7-day free trial, then paid |
| **Google Alerts** | Monitor brand/competitor mentions | Free |

### Target media for j16z

**Finance newsletters:**
- Matt Levine (Bloomberg Money Stuff) — most-read finance writer, no formal pitch process
- Byrne Hobart (The Diff) — reads everything, writes about novel tools
- Litquidity — finance meme account, 500K+ followers

**Tech newsletters:**
- Ben's Bites — AI-focused, 100K+ subscribers (main ad $2K, tools section $1.2K, free mention if genuinely noteworthy)
- TLDR Newsletter — massive reach, covers AI tools
- The Pragmatic Engineer — if the tech angle is interesting

**Podcasts:**
- Odd Lots (Bloomberg) — market structure / arb
- Flirting with Models — quant-focused
- The Acquirers Podcast — literally about M&A

### HARO automation (high ROI, fully free)

Claude monitors daily HARO/SourceBottle emails for journalist queries about M&A, hedge funds, AI in finance, fintech. Claude drafts expert responses positioning you as a founder building deal intelligence tools. Free backlinks + press coverage.

---

## 5. Content & SEO

### Blog publishing pipeline

```
Claude writes article (deal analysis, market commentary)
    │
    ├── Publish to Ghost via Ghost MCP (primary, self-hosted)
    ├── Cross-post to Dev.to via REST API (developer audience)
    ├── Cross-post to Hashnode via GraphQL API (developer audience)
    ├── Import to Medium (semi-manual — paste URL, Medium sets canonical)
    └── Share on Twitter + Reddit via respective MCPs

    All canonical URLs point back to Ghost (SEO benefit)
```

### SEO MCP servers

| Server | What it does | Cost |
|---|---|---|
| **Google Search Console MCP** (`AminForou/mcp-gsc`) | Rankings, traffic, indexing, URL inspection | Free |
| **Ahrefs MCP** (official) | Backlinks, keywords, site audit, competitor analysis | Requires Ahrefs sub ($129/mo) |
| **Semrush MCP** (official) | Keywords, competitor analysis, backlinks | Requires Semrush sub ($140/mo) |
| **DataForSEO MCP** | 22 commands, 9 API modules, SERP data | Pay-per-use (cheap) |

### Claude Code SEO skills

| Skill | GitHub | What it does |
|---|---|---|
| **claude-seo** | `AgriciDaniel/claude-seo` | 13 sub-skills, 6 subagents, technical SEO, E-E-A-T, schema |
| **claude-ads** | `AgriciDaniel/claude-ads` | 186 ad audit checks across Google/Meta/TikTok |
| **marketingskills** | `coreyhaines31/marketingskills` | CRO, copywriting, SEO, analytics, growth |
| **digital-marketing-pro** | `indranilbanerjee/digital-marketing-pro` | 115 commands, 25 agents, 67 MCP servers |

---

## 6. Workflow Automation

### n8n (the glue — self-hosted, free, unlimited)

n8n connects everything. 400+ integrations, 2,650+ marketing templates. Claude Code writes workflow JSON and deploys.

**Example workflows:**
- New EDGAR filing → Claude analyzes → tweet thread + blog draft
- HARO email arrives → Claude drafts expert response → sends via Gmail
- Polymarket price diverges from sim → auto-tweet divergence alert
- New GitHub star on mirofish-ma-agents → Slack notification

### Other automation platforms

| Platform | Free Tier | Verdict |
|---|---|---|
| **n8n** (self-hosted) | Unlimited | Best — Claude can write workflows |
| **Zapier** | 100 tasks/mo, 2-step only | Too limited |
| **Make.com** | 1,000 ops/mo | Too limited |
| **IFTTT** | 2 applets, no Twitter | Useless |

---

## 7. Virality Playbook (Sequenced)

### Weeks 1-4: Build the audience (before any launch)

Claude + Twitter MCP posts daily deal analysis. Goal: 500+ relevant followers.

```
DAILY OUTPUT (Claude generates, MCP posts):
├── 2-3 tweets on live deal news with real EDGAR/CourtListener analysis
├── 1 quote-tweet / reply to merger-arb thought leaders
└── Track engagement, double down on what works

WEEKLY OUTPUT:
├── 1 Twitter thread (deep-dive deal analysis)
├── 1 blog post (Ghost → Dev.to → Hashnode)
└── 2-3 Reddit comments in target subreddits
```

### Week 2-3: Ship mirofish-ma-agents repo (Play 1)

Open-source M&A agent profiles for MiroFish.

```
DISTRIBUTION:
├── Post "Show HN" on Hacker News (manual)
├── Post in MiroFish GitHub Discussions
├── Post in r/MachineLearning, r/artificial, r/algotrading
├── Tweet thread: "We built M&A agent profiles for MiroFish"
├── DM MiroFish creator — ask for RT (highest-leverage action)
└── Submit to Dev.to + Hashnode as technical blog post
```

### Week 4-5: Launch sim.j16z.com (Play 2)

Live deal simulation + Polymarket divergence tracking.

```
DISTRIBUTION:
├── Tweet: "Our AI says 62%, Polymarket says 58%. Who's right?"
├── Post in Polymarket Discord deal channels
├── Post in r/Polymarket, r/mergersandacquisitions
├── Auto-tweet divergence alerts via cron (when gap > 5%)
├── Submit to Product Hunt (manual, weekday 12:01 AM PST)
└── Pitch to Ben's Bites, TLDR, finance newsletters
```

### Week 5+: PR outreach (Play 3)

```
CLAUDE'S WORKFLOW:
├── Find journalists: Twitter MCP + Firecrawl MCP + Hunter MCP
├── Verify emails: QuickEmailVerification API
├── Write personalized pitches referencing their recent articles
├── Send via Resend MCP (1-at-a-time, personal email)
├── Monitor HARO/SourceBottle for journalist queries
└── Draft expert responses for free media mentions
```

### Month 2+: Polymarket scorecard

```
sim.j16z.com/scoreboard

Track AI vs. market accuracy across all completed deals.
Publish transparently — right or wrong.
"j16z AI beat the crowd 58% of the time" = the viral headline.
```

### Ongoing: Open-source signal-convergence library (Play 4)

Ships when Layer 2 is built. Targets developer community.

---

## 8. Key MCP Servers to Install

### Priority 1 (install now)

```bash
# Twitter/X — post tweets, search
# github.com/EnesCinr/twitter-mcp

# GitHub — manage repos, issues, discussions (official, 27.9K stars)
# github.com/github/github-mcp-server

# Email sending — Resend (official)
# github.com/resend/mcp-send-email

# Generic SMTP — works with Brevo, SES, Gmail
# npx -y @smithery/cli install @samihalawa/mcp-server-smtp --client claude

# Web scraping — Firecrawl (5.8K stars)
# npx firecrawl-mcp

# Gmail — read + send
# github.com/GongRzhe/Gmail-MCP-Server
```

### Priority 2 (install for content/SEO)

```bash
# Google Search Console — rankings, traffic
# github.com/AminForou/mcp-gsc

# Ghost CMS — blog publishing
# github.com/MFYDev/ghost-mcp

# Google Analytics (official)
# developers.google.com/analytics/devguides/MCP

# Slack (official)
# @modelcontextprotocol/server-slack
```

### Priority 3 (install for outreach)

```bash
# Reddit — post, comment, search
# github.com/jordanburke/reddit-mcp-server

# Hunter.io — email finding
# mcp.hunter.io

# Discord — community engagement
# github.com/SaseQ/discord-mcp

# HN — monitoring (read-only)
# github.com/erithwik/mcp-hn
```

---

## 9. MCP Server Directories

| Directory | Size | URL |
|---|---|---|
| mcp.so | 18,465+ servers | https://mcp.so |
| PulseMCP | 9,080+ servers | https://pulsemcp.com/servers |
| Smithery | 2,880+ servers | https://smithery.ai |
| Glama | Largest registry | https://glama.ai/mcp/servers |
| Official Registry | Authoritative | https://registry.modelcontextprotocol.io |
| TensorBlock | Curated marketing/sales list | github.com/TensorBlock/awesome-mcp-servers |

---

## 10. Self-Hosted Open Source Tools (True $0 Forever)

Deploy on a single $5-10/mo VPS (Hetzner/DigitalOcean) for the complete stack:

| Tool | Purpose | Stars | License |
|---|---|---|---|
| **Postiz** | Social media scheduling (20+ platforms) | 26.9K | AGPL-3.0 |
| **n8n** | Workflow automation (400+ integrations) | — | Fair-code |
| **Listmonk** | Newsletter / mailing list | — | AGPL-3.0 |
| **Ghost** | Blog / CMS | — | MIT |
| **Mautic** | Full marketing automation | — | Open source |
| **Refferq** | Referral program (38 API endpoints) | — | Open source |
| **BillionMail** | Mail server + campaigns | — | Open source |
| **Mixpost** | Social media (Buffer alternative) | 3K | MIT |
| **Reacher** | Email verification (self-hosted) | — | AGPL-3.0 |

---

## Sources

### MCP Servers & Directories
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)
- [GitHub MCP Server (27.9K stars)](https://github.com/github/github-mcp-server)
- [Firecrawl MCP (5.8K stars)](https://github.com/firecrawl/firecrawl-mcp-server)
- [Resend MCP](https://resend.com/mcp) | [Resend + Claude Code](https://resend.com/claude-code)
- [Mailgun MCP](https://help.mailgun.com/hc/en-us/articles/36036393635611)
- [mcp-server-smtp](https://github.com/samihalawa/mcp-server-smtp)
- [Hunter.io MCP](https://mcp.hunter.io)
- [Ahrefs MCP](https://github.com/ahrefs/ahrefs-mcp-server)
- [Google Analytics MCP](https://developers.google.com/analytics/devguides/MCP)
- [Product Hunt MCP](https://github.com/jaipandya/producthunt-mcp-server)

### Email Infrastructure
- [Brevo Free Plan](https://help.brevo.com/hc/en-us/articles/208580669)
- [Resend Pricing](https://resend.com/pricing)
- [Mailgun Pricing](https://www.mailgun.com/pricing/)
- [Sender.net Free Plan](https://help.sender.net/knowledgebase/what-are-the-limits-of-the-freeforever-plan/)
- [Amazon SES Pricing](https://aws.amazon.com/ses/pricing/)
- [QuickEmailVerification](https://quickemailverification.com/plans)
- [Cold Email Benchmarks 2026](https://instantly.ai/cold-email-benchmark-report-2026)
- [CAN-SPAM Compliance](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business)

### Lead Finding
- [Apollo.io Free Tier](https://www.apollo.io/pricing)
- [Hunter.io Pricing](https://hunter.io/pricing)
- [Snov.io Pricing](https://snov.io/pricing)

### Social Media
- [Twitter/X API Pricing 2026](https://getlate.dev/blog/twitter-api-pricing)
- [Twitter Automation Rules](https://opentweet.io/blog/twitter-automation-rules-2026)
- [Postiz (26.9K stars)](https://github.com/gitroomhq/postiz-app)
- [Mixpost](https://mixpost.app/)

### Community & Distribution
- [Dev.to API](https://dev.to/ankitg12/publishing-to-devto-programmatically-in-2026-what-actually-works-2nkd)
- [Hashnode API](https://apidocs.hashnode.com/)
- [Reddit Marketing for SaaS](https://www.redditgrowthdb.com/guides/reddit-marketing-saas)
- [Product Hunt Launch Guide](https://calmops.com/indie-hackers/product-hunt-launch-guide/)
- [Show HN Guidelines](https://news.ycombinator.com/showhn.html)

### PR & Journalism
- [HARO Alternatives 2026](https://www.prezly.com/academy/the-best-haro-alternatives)
- [PressPulse AI](https://www.presspulse.ai/)
- [Medialyst.ai](https://medialyst.ai/)
- [Muck Rack Alternatives](https://www.prezly.com/academy/muck-rack-competitors)

### Self-Hosted Tools
- [Listmonk](https://listmonk.app/)
- [Mautic](https://mautic.org/)
- [BillionMail](https://github.com/Billionmail/BillionMail)
- [n8n Marketing Workflows](https://n8n.io/workflows/categories/marketing/)
- [Refferq](https://www.refferq.com/)
- [Reacher Email Verification](https://reacher.email/)

### Claude Code Marketing Skills
- [digital-marketing-pro](https://github.com/indranilbanerjee/digital-marketing-pro)
- [claude-seo](https://github.com/AgriciDaniel/claude-seo)
- [claude-ads](https://github.com/AgriciDaniel/claude-ads)
- [marketingskills](https://github.com/coreyhaines31/marketingskills)
- [claude-mcp-marketing installer](https://github.com/redmorestudio/claude-mcp-marketing)
