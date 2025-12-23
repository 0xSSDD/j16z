## executive summary

# j16z – The Deal Desk's Operating System

## One-Page Executive Brief

---

## THE PROBLEM (What's Costing You Now)

Your analysts spend **3–5 hours per day** trolling fragmented sources: SEC EDGAR, CourtListener, FTC/DOJ site, Twitter, newsletters. They manually extract deal terms into spreadsheets. They miss events because they're spread across 5+ systems.

**The Cost:**

- **Labor:** 5 analysts × 1 hour/day of data work = 1,250 hours/year ($150k+ in salary).
- **P&L:** Missed docket entries, late FTC alerts, slow spread detection = **50–200 bp per deal** of avoidable slippage.
- **Risk:** No audit trail. Compliance can't verify what you knew, when.

---

## THE SOLUTION (What j16z Does)

**j16z is a deal-first intelligence platform.** One deal card replaces your EDGAR + CourtListener + FTC bookmarks + spreadsheets + bots.

**Core features:**

1. **Automatic ingestion:** SEC filings, CourtListener dockets, FTC/DOJ actions, spreads—all polled 4x/day, 24/7.
2. **Smart extraction:** Deal terms (consideration, termination fees, MAE, regulatory/litigation clauses) auto-extracted from S-4s and DEFMs with citations.
3. **Unified event stream:** All sources mixed, time-ordered, materiality-scored. See exactly what changed (e.g., "outside date extended 2 months" with spread correlation).
4. **Real-time alerts:** Slack, email, webhook. Only material events. Configurable per deal and per analyst.
5. **Analyst export:** Deal book (current spreads, terms, status) → Excel / API in one click.

**Result:** Your analysts see deal events **in 30 minutes** instead of 5 hours. Events are caught in **minutes, not hours.**

---

## THE UPSIDE (Why This Matters)

### Time Savings

| Metric | Before | After | Savings |
| --- | --- | --- | --- |
| **Daily monitoring per analyst** | 3–5 hours | 30–45 min | 2.5–4.5 hrs/day |
| **Per-deal term extraction** | 3–5 hours | 15 min | 2.75–4.75 hrs/deal |
| **Spread computation** | 1 hour/day | 5 min/week | 200+ hrs/year |
| **Desk of 5 analysts, 40 deals** | 1,500+ hrs/year | 300 hrs/year | **1,200 hrs/year** |
| **At $120/hr fully loaded** | — | — | **$150k+ savings** |

### P&L Impact

- **Event detection:** Catch injunction orders, FTC second requests, outside-date moves **in minutes, not 4+ hours later.**
- **Spread arbitrage:** A single 50–100 bp move caught 4 hours early on a $10 mm position = **$50k–$100k.**
- **Sizing discipline:** j16z surfacing deal clauses (MAE, litigation conditions) means better risk understanding → better position sizing.
- **Per-desk upside (annualized):** 2–5 deals/year where early event detection or better clause understanding yields 50–100 bp = **$100k–$500k in avoided P&L drag.**

### Risk Management

- **Compliance audit trail:** Every event timestamped and sourced. Regulators can see: "You were alerted to FTC complaint on Dec 18 at 3:14pm."
- **Portfolio visibility:** PM sees all 40 deals, status, spread, litigation count, outside dates, in one dashboard. No more "did everyone check the FTC site?"

---

## COMPETITIVE EDGE: Why Existing Tools Fall Short

### Bloomberg / Refinitiv

**What they do:** Provide intraday spreads, equity research, and broad news feeds for thousands of securities.

**What they miss for deal desks:**

- ❌ **No deal-clause extraction:** Can't auto-extract termination fees, MAE language, regulatory-efforts clauses. Analyst still reads 100-page S-4 manually.
- ❌ **No litigation integration:** CourtListener dockets, injunctions, shareholder suits are *not* part of their system. Analyst must check CourtListener separately.
- ❌ **No FTC/DOJ tracking:** SEC filings ✓, but FTC/DOJ antitrust actions are missing. Analyst must monitor [FTC.gov](http://ftc.gov/) separately.
- ❌ **No event correlation:** Spread moves and regulatory/litigation events are in different systems; analyst must manually connect dots.
- **Cost:** $20k–$40k per analyst per year.

### AlphaSense & Similar AI Filing Tools

**What they do:** Search and summarize thousands of SEC filings, earnings transcripts, and news using AI.

**What they miss for deal desks:**

- ❌ **Company-level, not deal-level:** Designed to answer "what is company X saying about market risk?" Not "what are the deal terms and litigation exposure for the Acme/Bolt merger?"
- ❌ **No structured deal extraction:** Can find "deal" mentions, but can't auto-extract: consideration type, termination fees, MAE definition, outside dates, regulatory conditions.
- ❌ **No 24/7 litigation monitoring:** CourtListener docket entries require manual polling; no automation or RSS integration built in.
- ❌ **No spread integration:** Deal economics (spreads, EV per share) are not connected to deal risk scoring.
- ❌ **No alerts per deal:** Searching is manual; no "alert me when material events hit this deal" workflow.
- **Cost:** $15k–$30k per analyst per year; often sold as enterprise research platform, not deal-desk tool.

### DIY Bots & In-House Systems

**What you build:** Custom Python scripts polling EDGAR, CourtListener, FTC RSS; custom Slack notifications; manual spreadsheets.

**Why they fail:**

- ❌ **High maintenance:** APIs change, rate-limit policies shift, tools break. One person must manage them.
- ❌ **Event miss rate:** Manual monitoring and rule-based triggers miss nuance (e.g., "order *denying* TRO" vs. "order *granting* TRO"—opposite implications, easy to miss).
- ❌ **Knowledge loss:** When the engineer who built it leaves, the system breaks or is abandoned.
- ❌ **Poor UX:** Analyst spends time debugging alerts and managing spreadsheet tabs instead of using insights.
- **Cost:** 0.5–1 FTE ($75k–$120k salary) + infrastructure; hidden costs are high.

### **j16z is the Only Deal-Desk System**

| Aspect | Bloomberg | AlphaSense | DIY Bots | **j16z** |
| --- | --- | --- | --- | --- |
| **Deal-clause extraction** | ✗ | ✗ | ✗ | ✓ |
| **Spread + terms unified** | ✗ | ✗ | Partial | ✓ |
| **24/7 litigation monitoring** | ✗ | ✗ | Manual | ✓ |
| **FTC/DOJ integration** | ✗ | ✗ | ✗ | ✓ |
| **Real-time alerts (Slack/email/webhook)** | Partial | ✗ | ✗ | ✓ |
| **Analyst-friendly deal card** | ✗ | ✗ | ✗ | ✓ |
| **Cost per analyst per year** | $20k–$40k | $15k–$30k | $75k–$120k (FTE) | **$18k–$24k** |

**j16z costs 50–70% less than alternatives and is purpose-built for merger-arb desks.**

---

## PROOF POINTS (Why You Should Believe This)

- **Ingestion:** SEC EDGAR, CourtListener, FTC/DOJ, market-data APIs are public, reliable, and accessible. We're not guessing or building proprietary data.
- **Extraction:** Deterministic + light LLM. S-4 / DEFM14A structure is standardized; term extraction is high-confidence.
- **Alerts:** Slack/email/webhook are standard; alert logic is simple rule-based (materiality + type + deal).
- **Use case validation:** Merger-arb and event-driven analysts are already building in-house versions of this. j16z is the professional, shared version.

---

## PRICING & MINIMUM VIABLE SCALE

| Tier | Cost | Users | Deals | Alerts |
| --- | --- | --- | --- | --- |
| **Boutique** | $1.5k–$2k/user/mo | 3+ | 50 | Email, Slack |
| **Desk** | $2k–$3k/user/mo | 5+ | 200+ | Email, Slack, Webhook |
| **Platform** | $100k–$250k/year | Unlimited | Unlimited | API-first, SSO |

**For a desk of 5 analysts and 40 deals:**

- **Monthly cost:** ~$10k–$15k (all-in).
- **Payback period:** <1 month (based on time savings alone; P&L upside is icing).
- **Pilot:** 2 analysts, 15 deals, $3k–$4k/month. Prove value in 30 days.

---

## ASK & NEXT STEP

**We're looking for:**

1. **Design partners:** 3–5 hedge funds (event-driven or merger-arb) to pilot j16z for 60 days.
    - Deeply discounted pricing ($2k–$3k total, vs. standard $10k+/month).
    - We gather feedback on deal-card UX, alert tuning, and extract value case studies.
    - You get a working tool today; we get learnings and a testimonial.
2. **Use cases:** Your team defines "what success looks like" (e.g., "catch 80% of material events in <30 min").

**Schedule a 20-minute call:** Let's walk through j16z with 2–3 analysts on your desk. You'll see the deal card, event stream, and Slack integration live. By end of call, you'll know if it's a fit.

---

## BOTTOM LINE

j16z gives deal desks what they've been building themselves for years: **a unified, auditable, always-on source of truth for deals.** Not a terminal. Not a research platform. **A deal desk's operating system.**

**The return:** 1,200+ hours/year saved per desk. 50–200 bp per deal in better decision-making. And the peace of mind that critical events don't get missed because your team is spread too thin.

---

**j16z: Deal terms, regulatory risk, and spreads—all in one place.**

*[Contact] [Calendar link]*