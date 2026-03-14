# j16z Future Vision: The Intelligence Layer

_Date: March 2026_

---

## Executive Summary

j16z today is an ingestion and monitoring platform — Layer 1 of what should be a three-layer intelligence system. This document outlines how combining patterns from MiroFish (multi-agent simulation) and World Monitor (cross-stream signal correlation) with j16z's existing deal-level data pipeline can fulfill the predictive analytics promises already in our pitch deck and create a product that does not exist anywhere in the market today.

This is not about bolting on two open-source projects. It's about using their architectural patterns — and in MiroFish's case, the actual engine via its REST API — to power capabilities no competitor offers: **cross-stream signal correlation** and **forward-looking deal simulation**. The AGPL license allows us to run unmodified MiroFish as a separate backend service while keeping j16z proprietary.

Crucially, this strategy also includes an open-source virality play: we open-source the M&A-specific agent profiles and the cross-stream correlation engine, riding the existing momentum of MiroFish (21K+ stars) and the broader multi-agent AI wave to build awareness for j16z as the commercial product.

---

## The Pain Points (Grounded in User Research)

From analyst interviews and David's call notes:

| What analysts do today                                     | What hurts                                                                   |
| ------------------------------------------------------------| ------------------------------------------------------------------------------|
| "Trolling particular spreads and tickers — filter through" | Hours of manual monitoring across 5+ fragmented sources                      |
| "Is there a termination clause — what are the conditions?" | Reading 200-page S-4s manually to find 3 critical clauses                    |
| "Track all deals that get announced... drill in info"      | No single system tracks announcement → close lifecycle                       |
| "Train a model — what % HSR filings lead to something?"    | No predictive layer at all — gut feel + spreadsheets                         |
| "Coding up bots to compile info"                           | Brittle, single-engineer dependency — "debugging scripts instead of trading" |

Layer 1 (what we're building now) solves the first three. But the pitch deck already promises more:

- **"Self-improving materiality engine"** (slide 04) — requires cross-stream correlation (Layer 2)
- **"Predictive deal analytics... predict break probability, regulatory risk, timeline extensions"** (slide 04) — requires simulation (Layer 3)
- **"AI moat through proprietary data flywheel"** (slide 06) — requires Layers 2+3 feeding back into each other

---

## The Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   LAYER 3: SIMULATION                                   │
│   "What happens next?"                                  │
│                                                         │
│   Multi-agent simulation models FTC, judges, boards,    │
│   arb desks. Analyst injects events, watches outcomes   │
│   branch. Powers: p_close, p_break_*, scenario planning │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   LAYER 2: CORRELATION                                  │
│   "What's converging right now?"                        │
│                                                         │
│   Cross-stream signal detection:                        │
│   FTC press release + spread widening + new docket      │
│   entry within 24hrs = compound materiality event.      │
│   Powers: smart alerts, composite deal risk score,      │
│   auto-updating p_close_base                            │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   LAYER 1: INGESTION (current build)                    │
│   "What just happened?"                                 │
│                                                         │
│   EDGAR, CourtListener, FTC/DOJ, spreads, RSS.          │
│   LLM clause extraction, materiality scoring.           │
│   Powers: deal card, event timeline, alerts             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

Each layer builds on the one below. Layer 2 cannot work without Layer 1's data. Layer 3 cannot work without Layer 2's signal correlation feeding meaningful context into simulations.

---

## Competitive Landscape (March 2026)

### What exists today

| Tool | What it does | Pricing | Gap for merger-arb |
|---|---|---|---|
| **Bloomberg Terminal** | MARB<GO> spread tracking, MA<GO> deal screening, market data | $31,980/yr per seat | No regulatory prediction, no NLP clause extraction, no litigation integration, no probabilistic modeling |
| **AlphaSense** (incl. Sentieo) | 1M+ M&A transactions searchable, deal summaries, transcript search | $10K-$20K/seat/yr | General-purpose research — no spread tracking, no docket monitoring, no deal completion probability |
| **Hebbia** | AI document analysis, clause extraction across data rooms, due diligence | $10K/seat/yr (Pro) | Document intelligence only — no market data, no live deal tracking, no regulatory prediction |
| **CTFN / Capitol Forum** | Human investigative journalism on antitrust, regulatory posture | ~$24K+/yr institutional | Human-generated, not algorithmic. Essential reading but not a platform — no structured data, no alerts integration |
| **Dealreporter** (ION Analytics) | Real-time M&A intelligence, regulatory risk assessments | Institutional (est. $20K+/yr) | Human analyst reports — no automated prediction, no spread tracking, no litigation monitoring |
| **InsideArbitrage** | Live spread tracking, deal calendars, annualized returns | Retail-oriented pricing | No regulatory intelligence, no clause extraction, no predictive modeling, no institutional-grade features |
| **Docket Alarm** (vLex/Fastcase) | 700M+ court documents, predictive analytics on judge behavior | Subscription (undisclosed) | Litigation-only — no deal context, no market data, no regulatory filing analysis |
| **CourtListener** | Free PACER search via RECAP, docket alerts | Free-$100/mo | No deal integration, requires manual cross-referencing with other sources |

### The gap

| Capability                                                                         | Available today?      | Best current option                              |
| ------------------------------------------------------------------------------------| -----------------------| --------------------------------------------------|
| Real-time spread tracking                                                          | Yes                   | Bloomberg MARB, InsideArbitrage                  |
| M&A document intelligence                                                          | Yes                   | Hebbia, AlphaSense                               |
| Regulatory journalism/intel                                                        | Yes                   | CTFN/Capitol Forum, Dealreporter                 |
| Litigation docket monitoring                                                       | Yes                   | Docket Alarm, CourtListener                      |
| **Algorithmic regulatory outcome prediction**                                      | **No**                | Does not exist                                   |
| **Integrated merger-arb platform (spread + regulatory + litigation + prediction)** | **No**                | Does not exist                                   |
| **Cross-stream intelligence correlation for deals**                                | **No**                | World Monitor does this for geopolitics, not M&A |
| **Multi-agent simulation for deal outcomes**                                       | **No (experimental)** | MiroFish is research-grade only                  |

**The market gap is clear: every tool covers one slice. No one has built the unified, predictive system.** This is what j16z becomes with Layers 2 and 3.

---

## Layer 2: Cross-Stream Correlation (World Monitor Pattern)

### Inspiration: World Monitor

[World Monitor](https://github.com/koala73/worldmonitor) (koala73/worldmonitor) is an open-source real-time intelligence dashboard that correlates 14 signal types across news, markets, military activity, and prediction markets into a unified situational awareness view with 45+ data layers.

**Key architectural patterns worth adopting:**

- **Focal Point Detection**: Entity extraction across data streams → signal aggregation by entity → cross-reference correlation → score and rank. World Monitor detects when news about Iran + military flights near Iran + protests in Iran converge = elevated risk. The same pattern applies to deals: FTC press release about a deal + spread widening + new docket entry = compound materiality.
- **Composite Risk Score**: World Monitor calculates a "Strategic Risk Score" from convergence of multiple signal streams. j16z needs a "Deal Risk Score" that auto-updates from event velocity + spread movement + regulatory signals + litigation activity.
- **Summarization with intelligence context**: World Monitor injects correlation data into LLM prompts for context-aware summaries. j16z should do the same — "Spread widened 180bps likely in response to FTC complaint filed 2 hours earlier" rather than just listing events chronologically.

**What World Monitor is NOT:**

- Not M&A-specific — its entity registry is geopolitical (countries, not companies/deal parties)
- Client-side AI with limited compute — not suitable for complex financial analysis
- No backtesting framework or prediction accuracy metrics
- Would require significant adaptation for merger-arb use

**What j16z builds (not forks):**

We adopt the cross-stream correlation pattern but build it domain-specific:

| World Monitor | j16z Layer 2 |
|---|---|
| 14 geopolitical signal types | 5 deal signal types: FILING, COURT, AGENCY, SPREAD_MOVE, NEWS |
| 600+ geopolitical entities | Deal entities: companies, deal parties, judges, commissioners, agencies |
| Country-based aggregation | Deal-based aggregation — all signals grouped per deal |
| "Strategic Risk Score" | "Deal Risk Score" — composite of regulatory, litigation, spread, and timing signals |
| Focal Point Detector | **Convergence Detector** — identifies when multiple signal types fire for the same deal within a time window |

### Convergence Detection: The Core Innovation

Today, j16z scores events individually. An FTC complaint scores 95. A spread widening scores 60. A new docket entry scores 50. Each fires its own alert.

With Layer 2, the system detects that three signals converging within 2 hours is categorically different from three independent events over a week:

```
INDIVIDUAL SCORING (today):
  FTC complaint    → 95 (CRITICAL alert)
  Spread +180bps   → 60 (WARNING alert)
  Docket: PI motion → 50 (INFO — inbox only)

CONVERGENCE SCORING (Layer 2):
  3 signals within 2 hours → compound materiality multiplier
  Historically: 78% of deals with this pattern see further
  spread widening within 48 hours
  → Single CRITICAL alert: "Signal convergence detected"
  → Auto-adjust p_close_base: 58% → 41%
```

This directly powers the "self-improving materiality engine" promised in the pitch deck. Historical convergence patterns train the model — every deal we monitor makes the next prediction better.

---

## Layer 3: Forward Simulation (MiroFish Pattern)

### Inspiration: MiroFish

[MiroFish](https://github.com/666ghj/MiroFish) is an open-source multi-agent simulation engine that constructs "parallel digital worlds" from seed documents and runs thousands of autonomous agents with independent personalities and long-term memory to explore scenario outcomes.

**Key architectural patterns worth adopting:**

- **Seed-to-simulation pipeline**: Upload documents → GraphRAG extracts entities and relationships → agents auto-generated with personality profiles → simulation runs → probabilistic outcomes reported
- **Agent personality modeling**: Agents aren't generic — they have traits (optimistic/pessimistic, risk appetite, professional background) inferred from seed data
- **"God's-eye" variable injection**: Inject hypothetical events mid-simulation and observe how outcomes shift
- **Probabilistic output**: Results are directional sentiment distributions, not point predictions — "In this scenario, which direction is group sentiment most likely to move"

**What MiroFish is NOT (honest assessment):**

MiroFish is experimental, not production-ready. As of March 2026:

- **Version 0.1.x** with 50 open GitHub issues including core workflow crashes and hangs
- **No Python SDK or importable library** — it's a standalone Python + Vue.js web app with REST API
- **No financial-domain validation** — all published examples are hypothetical scenarios with no backtested accuracy
- **AGPL-3.0 license** — derivative works must be open-sourced, which is problematic for proprietary commercial products
- **High LLM API costs at scale** — thousands of agents x N rounds = massive inference spend with no documented cost optimization
- **Simulated agents are not real people** — the creators explicitly state it should be used for "scenario exploration rather than precise forecasting"
- **Systemic bias risk** — agent personalities inherit biases from LLM training data
- **21K+ GitHub stars** (as of March 2026, growing rapidly) but small contributor count relative to star count — typical of viral-but-young projects

**What j16z builds (inspired by, not dependent on):**

We do NOT fork or integrate MiroFish directly. We build a domain-specific simulation engine that uses the same multi-agent pattern but is:

1. **Narrow** — agents model only M&A actors (FTC commissioners, judges, boards, arb desks), not general-purpose social simulation
2. **Grounded** — agent profiles derived from real data (historical FTC voting patterns, judge ruling records from CourtListener, clause constraints from our own extractions), not LLM-inferred personalities
3. **Validated** — backtested against historical deal outcomes before any user-facing predictions
4. **Cost-efficient** — smaller agent counts (tens, not thousands) with domain-specific heuristics reducing LLM inference per round
5. **Proprietary** — no AGPL dependency, built on our own stack

### Agent Architecture for M&A Simulation

| Agent Type | Profile Source | Behavior Model |
|---|---|---|
| FTC Commissioner | Historical voting records, public statements, enforcement priorities | Likelihood of challenge given deal characteristics (HHI, vertical/horizontal, industry) |
| Federal Judge | CourtListener ruling history, motion grant rates (via Docket Alarm pattern) | Likelihood of granting PI, timeline estimates based on historical scheduling |
| Acquirer Board | Extracted clauses (hell-or-high-water, reverse termination fee), deal terms | Willingness to litigate, divest, or walk based on contractual constraints |
| Target Board | Extracted clauses (go-shop, matching rights, termination fee), fiduciary duties | Likelihood of accepting alternative offers, enforcing specific performance |
| Arb Desk (market) | Spread history, position sizing patterns, historical deal-type behavior | Spread reaction to events — how the market prices information |

### The Scenario Explorer

The user-facing feature that emerges from Layer 3:

```
SCENARIO EXPLORER (on deal card)

Current trajectory     ━━━━━━━━━━●━━━━━━━ 41% close

If FTC settles         ━━━━━━━━━━━━━━━●━━ 79% close
If PI granted          ━━━━━━━●━━━━━━━━━━ 22% close
If topping bid         ━━━━━━━━━━━━━━━━●━ 84% close
If outside date ext.   ━━━━━━━━━━━●━━━━━━ 51% close

[ + Add scenario ]              [ Run full sim (1000x) ]
```

Each scenario is not a guess — it's the consensus of N simulation runs where the specified event was injected. The analyst sees not just a number but the reasoning: "If PI granted, 78% of simulation paths show acquirer invoking reverse termination fee within 30 days based on extracted $3B reverse break fee and hell-or-high-water absence."

---

## How It All Fits Together: The Deal Card of the Future

```
┌─────────────────────────────────────────────────────────────┐
│  MSFT → ATVI         REGULATORY_REVIEW          $68.7B     │
│  Spread: 4.2%        Outside: Jun 15, 2026                  │
├──────────────┬──────────────────────────────────────────────┤
│              │                                              │
│  DEAL RISK   │  SIGNAL CONVERGENCE (Layer 2)               │
│  ■■■■■■■□□□  │                                              │
│  72/100      │  ▲ FTC complaint (2hr ago)                   │
│              │  ▲ Spread widened +180bps (1hr ago)          │
│  p(close)    │  ▲ New docket: motion for PI (45min ago)    │
│  58% → 41%   │                                              │
│  ↓ -17%      │  ⚠ 3 signals converging in <2hrs            │
│              │    Historically: 78% of deals with this     │
│  WHY:        │    pattern see further spread widening       │
│  FTC+lit     │                                              │
│  convergence │                                              │
├──────────────┴──────────────────────────────────────────────┤
│                                                             │
│  SCENARIO EXPLORER (Layer 3)                                │
│                                                             │
│  Current trajectory     ━━━━━━━━━━●━━━━━━━ 41% close       │
│                                                             │
│  If FTC settles         ━━━━━━━━━━━━━━━●━━ 79% close       │
│  If PI granted          ━━━━━━━●━━━━━━━━━━ 22% close       │
│  If topping bid         ━━━━━━━━━━━━━━━━●━ 84% close       │
│  If outside date ext.   ━━━━━━━━━━━●━━━━━━ 51% close       │
│                                                             │
│  [ + Add scenario ]                  [ Run full sim (1000x) │
│                                        to see distribution ]│
└─────────────────────────────────────────────────────────────┘
```

**This deal card does not exist anywhere in the market.** Bloomberg shows spreads but can't predict why they'll move. AlphaSense searches documents but can't tell you what happens next. CTFN gives you human-written regulatory analysis but can't run 1000 simulations. Hebbia extracts clauses but doesn't know what they imply for deal probability.

Every element maps to a real analyst workflow:

| Component | What analyst does today | What this replaces |
|---|---|---|
| Deal Risk Score | PM asks "how worried should I be?" — analyst says "pretty worried" | Quantified, auto-updating composite score with explainable drivers |
| Signal Convergence | Analyst notices 3 bad things happened today — mentions it on the call | System detects convergence automatically, alerts the desk, cites historical pattern |
| Scenario Explorer | PM asks "what's our P&L if FTC blocks?" — analyst spends 2hrs in Excel | Click, see the answer, grounded in extracted clauses and simulated agent behavior |
| p(close) shift | Analyst manually updates spreadsheet once a week | Updates in real time as events flow in, with written explanation of what changed and why |

---

## Academic Grounding

### Multi-agent simulation for financial prediction

Multi-agent systems are an active area of academic research with demonstrated results:

- **QuantAgents** (EMNLP 2025 Findings): Multi-agent financial system with 26 tools, 3 memory types, 10 action types for simulated trading
- **MASFIN** (Dec 2025, NeurIPS 2025 Workshop): Modular multi-agent framework integrating LLMs with structured financial metrics and unstructured news, with explicit bias-mitigation protocols
- **MASS** (May 2025, arXiv): Multi-Agent Simulation Scaling for portfolio construction

Early studies suggest multi-agent systems can meaningfully outperform single-agent approaches in complex financial forecasting, though rigorous peer-reviewed validation with standardized benchmarks remains limited.

**Important caveat:** No published academic work specifically applies multi-agent LLM simulation to merger regulatory outcome prediction. This is genuinely unexplored territory. Our approach would be novel — which means both opportunity (no competition) and risk (no validated methodology to follow).

### Regulatory outcome prediction

There is no commercially available tool or publicly documented model that predicts FTC/DOJ merger review outcomes algorithmically. What exists:

- **DAMITT** (Dechert Antitrust Merger Investigation Timing Tracker): Historical investigation duration benchmarks — useful for calibration but not predictive
- **Traditional merger simulation**: DOJ Economics Division uses demand estimation models to predict price effects post-merger, but these predict market impact, not approval probability
- **Human journalism**: CTFN/Capitol Forum and Dealreporter provide forward-looking regulatory assessments written by experienced analysts — the gold standard today, but not scalable or algorithmic

The inputs for algorithmic prediction exist (historical enforcement data, commissioner voting records, market concentration metrics, political signals, judge ruling patterns) but no one has assembled them into a predictive system. This is the whitespace j16z can own.

---

## The Data Flywheel (Moat)

```
More deals monitored
       │
       ▼
More events ingested (Layer 1)
       │
       ▼
Better correlation patterns (Layer 2)
       │
       ▼
More accurate simulations (Layer 3)
       │
       ▼
Better predictions → more customers → more deals monitored
       │
       └──────────────────────────────────────────┘
```

This is the "AI moat through proprietary data flywheel" from the pitch deck — made concrete. No competitor can replicate it without running the same pipeline across hundreds of deals for months. By the time they catch up, our models have trained on 2x more deals.

The flywheel has three reinforcing loops:

1. **Correlation training**: Every convergence event (correctly or incorrectly flagged) trains the Layer 2 model. More deals = more convergence events = better convergence detection.
2. **Simulation calibration**: Every deal that reaches CLOSED or TERMINATED provides a ground-truth outcome to backtest Layer 3 simulations against. More completed deals = more calibration data = more accurate simulations.
3. **Agent profile refinement**: Every FTC decision, judicial ruling, and board action we observe refines the agent profiles used in simulation. The agent representing "FTC under current chair" gets more accurate with every enforcement action we ingest.

---

## Implementation Roadmap

### Phase A: Correlation Engine (Layer 2)

**Prerequisites:** Layer 1 operational with 20+ deals being actively ingested.

**Build:**
- Convergence Detector: time-windowed signal grouping per deal (e.g., 3+ events from different source types within N hours)
- Historical pattern matching: when convergence is detected, query historical deals with similar convergence patterns for outcome correlation
- Composite Deal Risk Score: weighted combination of regulatory flag count, litigation count, spread velocity, days-to-outside-date, event velocity
- Auto-updating p_close_base: risk score changes feed back into deal probability fields
- Frontend: "Signal Convergence" panel on deal card showing correlated events with historical context

**Estimated effort:** Medium. This is mostly scoring logic + a new UI component. No external dependencies. Can start as soon as Layer 1 has enough data flowing.

**De-risk approach:** Ship the composite Deal Risk Score first using simple weighted heuristics. Validate that analysts actually use it. Then layer on ML-based convergence detection.

### Phase B: Simulation Engine (Layer 3)

**Prerequisites:** Layer 2 operational. Historical deal outcome data available for backtesting. Clause extraction pipeline producing reliable structured data.

**Build:**
- Agent profile system: structured representations of FTC commissioners, judges, boards, derived from historical data
- Simulation runner: for each deal, instantiate relevant agents, seed with current state (events, clauses, market data), run N iterations
- Scenario injection: API for "inject event X at time T, re-run simulation from that point"
- Backtest framework: compare simulation predictions against historical deal outcomes, measure calibration
- Frontend: Scenario Explorer on deal card (probability bars per scenario, "add scenario" interaction, full distribution view)

**Estimated effort:** High. Requires agent modeling, simulation infrastructure, validation framework. This is a multi-month investment.

**De-risk approach:** Start with a simple Monte Carlo model using Layer 2's historical convergence patterns — not full agent simulation. If analysts use the Scenario Explorer with basic Monte Carlo, invest in the full agent-based engine. If they don't, we've saved months.

### Phasing Summary

```
PHASE A (no agent simulation)       PHASE B (full simulation)

Simple convergence detection         Agent-backed simulations
+ composite risk score               with real actor models

- Time-windowed signal grouping      - FTC commissioner profiles
- Historical pattern matching        - Judge ruling tendencies
- Weighted risk heuristics           - Board behavior from clauses
- Auto-updating deal probability     - Market reaction feedback loops

Ships in weeks after Layer 1         Ships in months after Phase A
Validates demand for Layer 2+3       Justifies premium pricing
```

---

## Go-to-Market & Virality Strategy

### The problem: SaaS behind a paywall doesn't go viral

j16z is a paid product for a niche audience. MiroFish has 21K+ GitHub stars because anyone can see it, play with it, and share it. World Monitor has traction because it's a live dashboard anyone can open. We need to bridge this gap — build in public, ride existing open-source momentum, and funnel attention from the AI/finance community back to j16z.

### Integration model: MiroFish as a service (not a fork)

AGPL does not prevent us from using MiroFish. The license triggers when you **modify and distribute** the software, or serve a modified version over a network. Running unmodified MiroFish as a separate backend service and calling its REST API from j16z's proprietary code is compliant — the same pattern companies use with AGPL databases.

```
LEGAL STRUCTURE:

┌─────────────────────┐     REST API     ┌──────────────────┐
│  j16z (proprietary)  │ ◄─────────────► │  MiroFish (AGPL) │
│  Our code, our IP    │    HTTP calls    │  Unmodified,     │
│  Not AGPL-bound      │                  │  separate service│
└─────────────────────┘                  └──────────────────┘

j16z's value is in the M&A domain layer:
  - Agent profiles (FTC commissioners, judges, boards)
  - Deal-specific seed data from our extraction pipeline
  - Scenario templates grounded in extracted clauses
  - Convergence scoring and composite risk logic

MiroFish provides the simulation engine. We provide the domain intelligence.
```

### Play 1: Open-source M&A agent profiles for MiroFish (Week 1-2)

Ship a standalone open-source repo of MiroFish-compatible M&A agent definitions:

```
github.com/j16z/mirofish-ma-agents

├── agents/
│   ├── ftc-commissioners/    ← historical voting patterns, enforcement priorities
│   ├── federal-judges/       ← ruling tendencies sourced from CourtListener data
│   ├── deal-boards/          ← behavior templates derived from clause types
│   └── arb-desks/            ← market reaction models for spread simulation
├── scenarios/
│   ├── ftc-challenge.yaml    ← "What if FTC files a complaint?"
│   ├── topping-bid.yaml      ← "What if a competing bidder emerges?"
│   ├── pi-granted.yaml       ← "What if preliminary injunction is granted?"
│   └── outside-date-ext.yaml ← "What if outside date is extended 90 days?"
├── seeds/
│   └── sample-deals/         ← anonymized historical deal data for demo
└── README.md                 ← "Built by the team behind j16z.com"
```

**Why this goes viral:**
- MiroFish's 21K-star community sees "someone built M&A agent profiles for MiroFish" — it gets shared in their Discord/GitHub Discussions
- Finance Twitter and merger-arb community picks it up — "you can simulate FTC behavior on your deals"
- AI/ML community shares it as a novel domain application of multi-agent simulation
- Every README, every agent profile, every scenario links back to j16z

**Cost:** Low. This is primarily data curation and structured YAML/JSON. No new infrastructure needed.

### Play 2: Live public simulation of a high-profile deal (Week 3-4)

Pick the single most-followed, most-controversial active M&A deal and run a public, live MiroFish simulation on it. Update daily. Stream the results.

```
sim.j16z.com/live/[deal-name]

┌─────────────────────────────────────────────────────────┐
│  LIVE SIMULATION: [Acquirer] → [Target]                 │
│  20 AI agents modeling FTC, judge, both boards, arb mkt │
│                                                         │
│  Current consensus: 62% close by Q3 2026                │
│  Last 24hr shift: -4% after FTC filing                  │
│                                                         │
│  Agent activity:                                        │
│  • FTC Agent filed simulated complaint (round 14)       │
│  • Judge Agent scheduled hearing for +30 days           │
│  • Acquirer Board Agent reaffirmed commitment            │
│  • Arb Desk Agents widened spread to 8.2%               │
│                                                         │
│  ──────────────────────────────────────────────────────  │
│  Want this for every deal on your book?                  │
│  Try j16z → [CTA button]                                │
│  ──────────────────────────────────────────────────────  │
│                                                         │
│  History:                                               │
│  Day 1: 74% close  │  Day 5: 68%  │  Day 10: 62%       │
│                                                         │
│  [ View full simulation log ]  [ Inject your own event ]│
└─────────────────────────────────────────────────────────┘
```

**Why this goes viral:**
- It's specific, opinionated, and about something people in finance are already arguing about
- Finance Twitter will tear it apart or praise it — either way, everyone's talking about j16z
- When the deal actually closes or breaks, we have a **public track record** — right or wrong, we were transparent
- "Inject your own event" lets visitors play with it — interactive content gets shared 3-5x more than static content
- Every finance newsletter and blog covering the deal will reference the simulation

**Cost:** Medium. Requires MiroFish deployment, seed data preparation, daily update automation, and a simple public-facing page. No j16z account required to view.

### Play 2b: Polymarket integration — "AI vs. the crowd"

Polymarket already hosts prediction market contracts on major M&A deal outcomes (e.g., "Will [Deal] close by [Date]?"). Our live simulation produces a probability. Polymarket produces a market price. The spread between the two is the story.

```
sim.j16z.com/live/[deal-name]

┌─────────────────────────────────────────────────────────┐
│  AI vs. MARKET                                          │
│                                                         │
│  j16z simulation:  62% close    ██████████████░░░░░░    │
│  Polymarket price: $0.58 (58%)  ████████████░░░░░░░░    │
│                                                         │
│  Divergence: +4% (AI more bullish than market)          │
│                                                         │
│  History of divergence:                                 │
│  Day 1: +2%  │  Day 5: +6%  │  Day 10: +4%             │
│                                                         │
│  When AI and market diverge by >5%, historically:       │
│  • Market moved toward AI consensus 64% of the time     │
│  • Average convergence window: 3-7 days                 │
│                                                         │
│  [ View on Polymarket → ]  [ View full simulation → ]   │
└─────────────────────────────────────────────────────────┘
```

**Why this is powerful:**

- **Built-in audience.** Polymarket bettors actively seek edge. They will find and share a free AI simulation that disagrees with market pricing. Every divergence moment is a shareable event.
- **Natural virality loop.** When the simulation diverges from market price, that's the most interesting moment — "AI says 62% but the crowd only prices 58%, who's right?" This gets screenshotted and shared on Twitter/Discord/Telegram.
- **Track record builds credibility.** Over time, we can publish how often the simulation was closer to the actual outcome than the market was. If we beat the crowd even 55% of the time on divergence calls, that's a powerful marketing claim.
- **Polymarket communities do the distribution for us.** Bettors share the sim link in deal contract comment sections, Telegram groups, and Twitter threads. We don't need to push — the audience pulls.
- **Drives j16z signups from prediction market users.** Polymarket bettors on M&A contracts are either (a) merger-arb professionals (our exact target customer) or (b) sophisticated retail who want institutional-grade tools. Both convert.

**Integration options:**

1. **Read-only (launch day):** Display current Polymarket contract price alongside simulation output. Polymarket has public APIs — no partnership needed.
2. **Divergence alerts (week 2+):** Email/Twitter bot that posts when AI-market divergence exceeds a threshold. "ALERT: j16z simulation diverges from Polymarket by >8% on [Deal]. See why → sim.j16z.com/..."
3. **Historical scorecard (month 2+):** Public page tracking AI vs. market accuracy across all completed deals. Transparent, auditable, builds trust.

**Cost:** Low incremental on top of Play 2. Polymarket API is public. The divergence tracking is a simple comparison + historical log.

### Play 3: Open-source the correlation engine (Ongoing, ships with Layer 2)

Open-source the cross-stream signal correlation engine as a standalone library:

```
github.com/j16z/signal-convergence

"Cross-stream signal correlation engine for financial events.
 Detects when multiple independent data sources converge on
 the same entity within a time window."

- Works with any event stream — plug in your own sources
- Ships with adapters for SEC EDGAR, CourtListener, RSS feeds
- Time-windowed convergence detection with configurable thresholds
- Historical pattern matching against past convergence events
- Composite risk scoring with explainable factor weights
```

**Why this goes viral:**
- Useful beyond M&A — anyone doing event-driven analysis (quant funds, OSINT, journalism) can use it
- Quant Twitter and HN share reusable financial infrastructure libraries
- Developers build on it, contribute adapters for new data sources, cite it in blog posts
- Every user of the library is a potential j16z customer ("if you like the correlation engine, the full platform has simulation too")

**Cost:** Medium-high. This is real infrastructure code. But it's code we're building anyway for Layer 2 — open-sourcing it is incremental effort.

### Phasing: Virality timeline

```
WEEK 1-2    Play 1: mirofish-ma-agents repo
            Low cost, rides MiroFish's 21K-star wave
            Gets j16z name into the AI/OSS conversation
            Target: 500+ stars in first week

WEEK 3-4    Play 2: sim.j16z.com — live deal simulation
            Pick the most controversial active deal
            Public, free, updated daily, interactive
            Target: Finance Twitter pickup, newsletter mentions

WEEK 4-5    Play 2b: Polymarket integration — "AI vs. the crowd"
            Display Polymarket price alongside AI simulation
            Divergence alerts on Twitter bot / email
            Target: Polymarket community adoption, viral divergence moments

MONTH 2+    Play 2b+: Historical scorecard
            Public accuracy tracker: AI vs. market on completed deals
            This is the long-term credibility asset
            Target: "j16z beat the crowd 58% of the time" headline

ONGOING     Play 3: signal-convergence library
            Ships when Layer 2 is built
            Long-term developer community play
            Target: Become the standard OSS lib for event correlation

FLYWHEEL    Each play feeds the next:
            Agent profiles → drive traffic to live sim
            Live sim + Polymarket divergence → viral moments on Finance Twitter
            Divergence alerts → Polymarket bettors discover j16z
            Scorecard → credibility → institutional customers trust predictions
            Correlation engine → developer community → contributors → ecosystem
```

### Marketing positioning

The narrative across all three plays is consistent:

> **"j16z is building the intelligence layer for M&A — and we're doing it in the open."**

We're not a black-box SaaS. We publish our agent profiles. We run public simulations with transparent methodology. We open-source our infrastructure. The proprietary value is in the integration — the deal card that ties it all together with real-time data from EDGAR, CourtListener, and FTC/DOJ.

This positions j16z as the credible, transparent player in a space full of "proprietary AI" hand-waving.

---

## Risks and Honest Limitations

### Simulation accuracy is unvalidated
Multi-agent simulation for M&A regulatory prediction is unexplored academic territory. There is no published evidence that this approach works for predicting FTC/DOJ outcomes. Our simulations may produce confident-looking numbers that are wrong. **Mitigation:** Extensive backtesting against historical deals before any user-facing predictions. Always show confidence intervals, never point estimates. Frame outputs as "scenario exploration" not "predictions" (following MiroFish's own guidance).

### Regime change invalidates historical patterns
FTC enforcement posture changes with each administration. Historical patterns from 2020-2024 (aggressive enforcement under Khan) may not predict 2025-2026 behavior (potentially more permissive). **Mitigation:** Agent profiles must be updateable. Weight recent enforcement actions more heavily. Expose regime assumptions to users.

### Small sample sizes
There are only ~300-400 M&A deals valued at $1B+ per year in the US (334 in 2024). Of those, maybe 20-40 face serious regulatory challenge. Training data for convergence patterns and simulation calibration will be limited. **Mitigation:** Start with broader event-type correlation (not just regulatory). Use synthetic data generation for simulation training. Be transparent about confidence levels.

### LLM costs at scale
Running multi-agent simulations with LLM inference per agent per round is expensive. MiroFish users report high API costs with no documented mitigation. **Mitigation:** Use small, domain-specific agent counts (10-20 per deal, not thousands). Supplement LLM inference with rule-based heuristics where behavior is well-characterized. Cache agent reasoning for similar deal configurations.

### False confidence risk
The biggest risk is that polished visualization + specific-looking numbers make analysts trust predictions they shouldn't. A merger-arb PM with 15 years of experience will see through this quickly and we lose credibility. **Mitigation:** Always show uncertainty. Never hide when the model has low confidence. Let analysts override and mark predictions as wrong — this feeds the flywheel AND builds trust.

---

## What This Is NOT

- **Not Palantir.** Palantir is horizontal infrastructure ($2.6B revenue, 20yr headstart, forward-deployed engineers). j16z is a vertical instrument — purpose-built for one user (the merger-arb analyst) doing one job (tracking and pricing deals). We stay narrow and sharp.
- **Not a general AI platform.** We don't simulate everything. We simulate M&A deal outcomes, period. The agents are FTC commissioners and federal judges, not generic "AI agents."
- **Not forking MiroFish or World Monitor.** We run MiroFish unmodified as a backend service (AGPL-compliant) and adopt World Monitor's correlation patterns in our own code. j16z's proprietary value is in the M&A domain layer — agent profiles, convergence logic, deal-specific scoring — not in the simulation engine itself.
- **Not promising certainty.** Simulation outputs are probabilistic scenario exploration, never point predictions. The tool helps analysts think through scenarios faster — it doesn't replace their judgment.

---

## Sources and References

### Competitive landscape
- [Bloomberg Terminal Pricing 2026 — Godel Terminal](https://godeldiscount.com/blog/bloomberg-terminal-cost-2026)
- [AlphaSense M&A Deal Data — AlphaSense Help](https://help.alpha-sense.com/hc/en-us/articles/44476358623635-M-A-Deal-Data-Overview)
- [AlphaSense Revenue — Sacra](https://sacra.com/c/alphasense/)
- [Hebbia + OpenAI Case Study](https://openai.com/index/hebbia/)
- [CTFN — Merger Arbitrage Data](https://informaconnect.com/ctfn-merger-arbitrage-data/)
- [InsideArbitrage — Merger Arbitrage](https://www.insidearbitrage.com/merger-arbitrage/)
- [Dealreporter — ION Analytics](https://ionanalytics.com/dealreporter/)
- [Docket Alarm Features](https://www.docketalarm.com/features)
- [CourtListener RECAP Alerts](https://free.law/2025/06/18/recap-search-alerts-for-pacer/)

### Open-source inspirations
- [MiroFish — GitHub](https://github.com/666ghj/MiroFish) (AGPL-3.0, v0.1.x, 21K+ stars as of Mar 2026)
- [World Monitor — GitHub](https://github.com/koala73/worldmonitor)
- [World Monitor Documentation](https://github.com/koala73/worldmonitor/blob/main/docs/DOCUMENTATION.md)

### Academic work
- [QuantAgents — EMNLP 2025](https://aclanthology.org/2025.findings-emnlp.945.pdf)
- [MASFIN — NeurIPS 2025 Workshop / arXiv](https://arxiv.org/abs/2512.21878)
- [MASS — arXiv May 2025](https://arxiv.org/html/2505.10278v2)

### Regulatory prediction
- [DAMITT 2025 Report — Dechert](https://www.dechert.com/knowledge/publication/2026/1/damitt-2025-annual-report.html)
- [Merger Simulation Challenges — ProMarket](https://www.promarket.org/2023/07/04/why-we-dont-see-higher-use-of-merger-simulations/)
- [Antitrust in 2025 — Cooley](https://www.cooley.com/news/insight/2025/2025-01-31-antitrust-in-2025-shifting-sands-and--what-to-expect)
