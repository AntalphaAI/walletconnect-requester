# Antalpha AI World Cup Value Discovery Tool — Product Plan

> **Date**: 2026-04-21 (Updated: 2026-04-21 15:32)
> **Status**: Draft — Pending Approval
> **Owner**: 丁丁 (Bevan)
> **Version**: 2.1 (Pivot + Poly-Master Integration)

---

## 1. Executive Summary

### Product Pivot

| | Old Narrative | New Narrative |
|---|---|---|
| **Positioning** | AI predicts World Cup match scores | AI-powered prediction market analysis tool |
| **Core Value** | Prediction accuracy | Value discovery — finding mispriced markets |
| **Competition** | Professional betting companies (unwinnable) | Polymarket ecosystem tools (beatable) |
| **Analogy** | "We're a better bookmaker" | "We're Bloomberg Terminal for prediction markets" |

### One-Liner

> Antalpha AI doesn't predict who wins. We show you what the market thinks, what our AI thinks, and where the gap is.

### Why This Pivot

Management raised valid concerns: competing on prediction accuracy against professional betting companies with proprietary data is unwinnable. The new positioning shifts our competitive arena from "accuracy" to "insight delivery" — a space where our AI capabilities and Polymarket ecosystem integration create genuine differentiation.

---

## 2. Existing Infrastructure: Poly-Master

> ⚡ **Key Update**: The team already has `poly-master` tools covering Polymarket data. Phase 0 scope is reduced.

### poly-master-markets (市场搜索)

| Param | Type | Required | Description |
|---|---|---|---|
| `query` | string | ✅ | Search keywords (e.g. "FIFA 2026") |
| `limit` | int | ❌ | Max results, default 20 |
| `active` | bool | ❌ | Active markets only |
| `closed` | bool | ❌ | Include closed markets |

**Returns**: `id`, `question`, `conditionId`, `outcomes`, `outcomePrices` (Gamma cached), `volume`, `liquidity`, `endDate`, `clobTokenIds`

### poly-master-order-book (实时订单簿)

| Param | Type | Required | Description |
|---|---|---|---|
| `token_id` | string | ✅ | From `clobTokenIds` field in markets response |

**Returns**: `bids[]`, `asks[]`, `mid_price` (real-time consensus probability, **seconds-level**)

### ⚠️ Important Notes
- `outcomePrices` = Gamma cached price (minute-level delay) → use for overview
- `mid_price` = CLOB real-time price (second-level) → use for precision analysis
- `token_id` ≠ `conditionId` → always use `clobTokenIds` from markets response

### Two-Step Workflow
```
1. poly-master-markets(query="FIFA 2026 winner", active=true)
   → get clobTokenIds[0] as token_id
2. poly-master-order-book(token_id="...")
   → mid_price = real-time market probability
```

---

### Polymarket World Cup 2026 Markets (Already Live)

As of April 2026, Polymarket has substantial World Cup markets:

| Market Type | Examples | Slug |
|---|---|---|
| Tournament Winner | 48 teams (Argentina, France, Brazil, Spain, England...) | `2026-fifa-world-cup-winner-595` |
| Group Winners | Group A through L | `fifa-world-cup-group-a-winner` |
| Individual Match Markets | Expected closer to tournament | TBD |

**Key Insight**: Polymarket already has **tournament-level** markets (winner, group stage). Individual **match-level** markets will likely appear as the tournament approaches. Our tool should be ready for both.

### Existing Polymarket Ecosystem Competitors

| Tool | Volume | Weakness |
|---|---|---|
| DGPredict | $1.73M | Basic AI, no deep analysis |
| Polymer | $1.60M | Generic analytics |
| Predera | $1.23M | Pricing efficiency only |
| Polytrader.app | $1.03M | Automated trading, not analysis |

**Our Differentiation**: None of these combine multi-model AI prediction with Polymarket price comparison and value discovery visualization.

---

## 3. Product Architecture

```
┌─────────────────────────────────────────────────────┐
│              antalpha.com/worldcup                  │
│                                                      │
│  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  AI Model  │  │ Polymarket │  │    Value     │  │
│  │ Probability│  │   Price    │  │  Discovery   │  │
│  │            │  │            │  │  Dashboard   │  │
│  └─────┬──────┘  └─────┬──────┘  └──────┬───────┘  │
│        └───────────────┼────────────────┘           │
│                        ▼                             │
│              ┌──────────────────┐                    │
│              │  Deviation Engine│                    │
│              │ AI% vs Market%   │                    │
│              │ → Edge Signal    │                    │
│              └──────────────────┘                    │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ Match Info Card                               │   │
│  │ Team stats, H2H, player availability,        │   │
│  │ FM ratings, venue/weather/altitude            │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │ "View on Polymarket" → External link          │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Core Feature: Value Discovery Dashboard

The hero feature. For each market:

```
┌──────────────────────────────────────────┐
│  Argentina vs Brazil                      │
│  Group Stage — June 15, 2026              │
│                                           │
│  AI Model      Polymarket    Deviation    │
│  ─────────     ──────────    ─────────    │
│  ARG: 58%      ARG: 45%     ▲ +13%       │
│  DRAW: 24%     DRAW: 28%     ▼ -4%        │
│  BRA: 18%      BRA: 27%     ▼ -9%        │
│                                           │
│  Signal: Argentina OVERVALUED by market   │
│  Confidence: Medium (Kelly Index: 0.15)   │
└──────────────────────────────────────────┘
```

---

## 4. Implementation Phases

### Phase 0: Data Pipeline (Now → April 30)
### Phase 1: Prediction Engine MVP (May 1 → May 15)
### Phase 2: Frontend Product (May 15 → May 31)
### Phase 3: Pre-Tournament Warmup (June 1 → June 10)
### Phase 4: Tournament Operations (June 11 → July 13)

---

## 5. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Management still skeptical | High | Emphasize "analysis tool" not "oracle"; compare to Bloomberg Terminal |
| Polymarket match markets thin | Medium | Start with tournament-level markets; match markets grow closer to event |
| Prediction model accuracy low | Medium | Transparent track record; calibrate continuously; value ≠ accuracy |
| Frontend dev resource constrained | Medium | MVP = single "deviation card" per match; iterate from there |
| Polymarket CLOB API changes (V2 migration) | Low | Read-only data access is stable; monitor changelog |

---

## 6. Key Decisions Remaining

1. **Commercial model**: How does traffic convert to revenue?
2. **FM data source**: Manual extraction from Football Manager DB?
3. **Prediction mode**: Human + AI review, or fully automated?
4. **Engineering priority**: In-house vs. outsourced frontend?

---

## 7. Timeline Summary

```
April 21 ─── April 30 ─── May 15 ─── May 31 ─── June 10 ─── June 11 ─── July 13
   │              │            │           │            │          │           │
   ▼              ▼            ▼           ▼            ▼          ▼           ▼
 Phase 0       Phase 1      Phase 2     Phase 2      Phase 3   KICKOFF    FINAL
 Data Pipe     Engine MVP   Frontend    Launch       Warmup
```

---
---

# Phase 0: Data Pipeline — Detailed Execution Plan

> **Goal**: Build a unified data pipeline that outputs structured JSON for any World Cup match/event, combining Polymarket market data and football statistics.
>
> **Duration**: 2 weeks (April 21 → April 30)
>
> **Deliverable**: A Python project `worldcup-pipeline/` with scripts that can be run independently and produce structured output.
>
> **Handoff**: This plan is designed to be directly executable by a coding agent (Claude Code / Codex / etc.)

---

## Task 0.1: Project Scaffolding

**File**: `worldcup-pipeline/`

```
worldcup-pipeline/
├── README.md
├── requirements.txt
├── .env.example
├── config/
│   └── settings.py          # Central configuration
├── data/
│   ├── raw/                 # Raw API responses (gitignored)
│   └── processed/           # Cleaned/structured output
├── src/
│   ├── __init__.py
│   ├── polymarket/
│   │   ├── __init__.py
│   │   ├── gamma_client.py  # Gamma API wrapper
│   │   ├── clob_client.py   # CLOB API wrapper (prices/orderbook)
│   │   └── models.py        # Pydantic models for market data
│   ├── football/
│   │   ├── __init__.py
│   │   ├── elo_ratings.py   # Elo/pi-ratings fetcher
│   │   ├── match_data.py    # Match/schedule data via soccerdata
│   │   └── models.py        # Pydantic models for football data
│   ├── merger.py            # Merge Polymarket + football data
│   └── main.py              # CLI entry point
└── tests/
    ├── test_gamma.py
    ├── test_football.py
    └── test_merger.py
```

**Action**: Create this structure. `requirements.txt` should include:
```
requests>=2.31
pydantic>=2.0
python-dotenv>=1.0
pandas>=2.0
soccerdata>=1.2
```

**Verification**: `pip install -r requirements.txt` succeeds.

---

## Task 0.2: Polymarket Gamma API Client

**File**: `src/polymarket/gamma_client.py`

**API Base**: `https://gamma-api.polymarket.com`

**Endpoints to implement**:

### 2a. Search World Cup Events

```python
def search_worldcup_events() -> list[Event]:
    """
    GET /events?slug=2026-fifa-world-cup-winner-595
    
    Also try:
    GET /events?tag=soccer&_q=world+cup
    GET /public-search?_q=fifa+world+cup+2026
    
    Returns list of Event objects with nested markets.
    """
```

**Key fields to extract from each event**:
- `id`, `slug`, `title`, `description`
- `startDate`, `endDate`
- `markets[]` — each market contains:
  - `id`, `question`, `slug`
  - `outcomes` (JSON string: `["Yes","No"]` or `["Argentina","Brazil",...]`)
  - `outcomePrices` (JSON string: `["0.65","0.35"]`)
  - `volume`, `liquidity`, `bestBid`, `bestAsk`
  - `conditionId`, `clobTokenIds`
  - `active`, `closed`, `acceptingOrders`

### 2b. Get Event by Slug

```python
def get_event(slug: str) -> Event:
    """GET /events?slug={slug}"""
```

### 2c. Get All Active World Cup Markets

```python
def get_active_worldcup_markets(tag: str = None) -> list[Market]:
    """
    Strategy 1: Filter by tag
    GET /markets?active=true&closed=false&tag=soccer
    
    Strategy 2: Search
    GET /markets?_q=world+cup&active=true
    
    Strategy 3: Via events endpoint (most efficient)
    GET /events?active=true&closed=false&tag_id={worldcup_tag_id}
    """
```

### 2d. Discover Sports Tags

```python
def get_sports_tags() -> list[Tag]:
    """GET /sports — returns tag IDs for all sports"""
```

### 2e. Get Market Price History

```python
def get_market_history(market_id: str) -> list[PricePoint]:
    """
    GET /markets/{id}
    Extract price history from the response if available.
    Fallback: Use CLOB API for historical prices.
    """
```

**Pydantic Models** (`src/polymarket/models.py`):

```python
from pydantic import BaseModel
from datetime import datetime

class Market(BaseModel):
    id: str
    question: str
    slug: str
    outcomes: list[str]
    outcome_prices: list[float]
    volume: float
    liquidity: float
    best_bid: float | None
    best_ask: float | None
    active: bool
    closed: bool
    condition_id: str
    clob_token_ids: list[str]
    accepting_orders: bool

class Event(BaseModel):
    id: str
    slug: str
    title: str
    description: str
    start_date: datetime | None
    end_date: datetime | None
    markets: list[Market]
```

**Verification**:
```bash
python -m src.polymarket.gamma_client --search "world cup"
# Should return events with market data
```

---

## Task 0.3: Polymarket CLOB API Client

**File**: `src/polymarket/clob_client.py`

**API Base**: `https://clob.polymarket.com`

> **Note**: CLOB API provides real-time prices and orderbook data. For our read-only use case, no authentication is needed for public endpoints.

**Endpoints to implement**:

### 3a. Get Market Price

```python
def get_market_price(token_id: str) -> dict:
    """
    GET /price?token_id={token_id}&side=buy
    
    Returns: { "price": "0.65" }
    """
```

### 3b. Get Orderbook

```python
def get_orderbook(token_id: str) -> dict:
    """
    GET /book?token_id={token_id}
    
    Returns: { "bids": [...], "asks": [...], "hash": "..." }
    
    Each bid/ask: { "price": "0.65", "size": "100" }
    """
```

### 3c. Get Midpoint Price

```python
def get_midpoint(token_id: str) -> float:
    """
    Calculate midpoint from best bid + best ask.
    midpoint = (best_bid + best_ask) / 2
    """
```

**Verification**:
```bash
python -m src.polymarket.clob_client --price <token_id>
# Should return current price
```

---

## Task 0.4: Football Data — Elo Ratings

**File**: `src/football/elo_ratings.py`

**Data Sources** (all free, no API key required):

### 4a. World Football Elo Ratings

```python
def fetch_world_elo_ratings() -> dict[str, float]:
    """
    Source: https://www.eloratings.net/
    Or API: https://www.eloratings.net/api (if available)
    
    Alternative: clubelo.com for club-level ratings
    
    Returns: { "Argentina": 2115, "France": 2085, "Brazil": 2043, ... }
    """
```

### 4b. Pi-Ratings (if available)

```python
def fetch_pi_ratings() -> dict[str, float]:
    """
    Pi-ratings from https://piaratings.com/ or academic sources.
    More accurate than Elo for recent form.
    
    Returns: { "Argentina": 1.85, "France": 1.72, ... }
    """
```

**Fallback**: If APIs are not available, scrape the HTML pages using `requests` + `BeautifulSoup`.

**Pydantic Model** (`src/football/models.py`):

```python
class TeamRating(BaseModel):
    team: str
    elo: float
    pi_rating: float | None
    rank: int
    last_updated: datetime
```

**Verification**:
```bash
python -m src.football.elo_ratings
# Should print top 20 teams with ratings
```

---

## Task 0.5: Football Data — Match Schedule & History

**File**: `src/football/match_data.py`

**Using `soccerdata` library**:

```python
import soccerdata as sd

def fetch_worldcup_schedule() -> pd.DataFrame:
    """
    Fetch 2026 World Cup schedule and results.
    
    Note: soccerdata may not have 2026 World Cup data yet.
    Fallback: FIFA.com scraping or manual CSV.
    
    Columns: date, home_team, away_team, home_score, away_score,
             tournament, venue, city, country
    """
```

### 5a. Historical Match Data (for model training)

```python
def fetch_historical_international_matches(league: str = "FIFA_WC") -> pd.DataFrame:
    """
    Fetch historical World Cup / international match data.
    
    Options:
    1. soccerdata.FIFAWorldCup() — historical World Cup data
    2. https://www.football-data.co.uk/notes.txt — free CSV datasets
    3. Kaggle: "International Football Results" dataset
    
    Returns: DataFrame with columns:
    - date, home_team, away_team, home_score, away_score
    - tournament, neutral_venue, city, country
    """
```

### 5b. Recent Form Data

```python
def fetch_recent_form(team: str, n_matches: int = 10) -> pd.DataFrame:
    """
    Fetch last N matches for a team.
    Calculate: win rate, goals scored/conceded, xG (if available).
    
    Used for "recent form" feature in prediction model.
    """
```

**Verification**:
```bash
python -m src.football.match_data --team Argentina
# Should show recent matches and stats
```

---

## Task 0.6: Data Merger

**File**: `src/merger.py`

**Purpose**: Combine Polymarket market data with football statistics into a unified output.

```python
def build_match_analysis(event_slug: str) -> MatchAnalysis:
    """
    Given a Polymarket event slug, produce a unified analysis object.
    
    Steps:
    1. Fetch event from Gamma API → get markets + prices
    2. Parse team names from market outcomes
    3. Fetch Elo/pi-ratings for both teams
    4. Fetch recent form for both teams
    5. Merge into MatchAnalysis object
    6. Save to data/processed/{event_slug}.json
    """
```

**Output Schema** (`data/processed/{event_slug}.json`):

```json
{
  "event": {
    "id": "abc123",
    "slug": "argentina-vs-brazil-world-cup",
    "title": "Argentina vs Brazil",
    "start_date": "2026-06-15T18:00:00Z",
    "polymarket_url": "https://polymarket.com/event/..."
  },
  "market": {
    "outcomes": ["Argentina", "Draw", "Brazil"],
    "polymarket_prices": [0.45, 0.28, 0.27],
    "volume_24h": 125000,
    "liquidity": 50000,
    "best_bid": 0.44,
    "best_ask": 0.46,
    "orderbook_depth": { "bids": 10, "asks": 8 }
  },
  "teams": {
    "Argentina": {
      "elo": 2115,
      "pi_rating": 1.85,
      "recent_form": {
        "last_10_wins": 7,
        "last_10_goals_scored": 18,
        "last_10_goals_conceded": 5,
        "avg_xg_scored": 1.8,
        "avg_xg_conceded": 0.9
      },
      "fifa_rank": 1
    },
    "Brazil": {
      "elo": 2043,
      "pi_rating": 1.72,
      "recent_form": {
        "last_10_wins": 5,
        "last_10_goals_scored": 14,
        "last_10_goals_conceded": 8,
        "avg_xg_scored": 1.5,
        "avg_xg_conceded": 1.1
      },
      "fifa_rank": 3
    }
  },
  "venue": {
    "city": "Los Angeles",
    "country": "USA",
    "stadium": "SoFi Stadium",
    "altitude_m": 89,
    "timezone": "America/Los_Angeles"
  },
  "timestamp": "2026-04-21T07:00:00Z"
}
```

**Verification**:
```bash
python -m src.merger --event "2026-fifa-world-cup-winner-595"
# Should produce data/processed/2026-fifa-world-cup-winner-595.json
```

---

## Task 0.7: CLI Entry Point & Automation

**File**: `src/main.py`

```python
"""
Usage:
  python -m src.main scan           # Scan all World Cup events on Polymarket
  python -m src.main fetch <slug>   # Fetch & merge data for specific event
  python -m src.main schedule       # Show World Cup schedule with Polymarket links
  python -m src.main health         # Check all data sources are reachable
"""
```

### Health Check (`--health`):

```python
def health_check() -> dict:
    """
    Verify all data sources are reachable:
    1. Gamma API: GET /events?limit=1 → status OK?
    2. CLOB API: GET /book?token_id=xxx → status OK?
    3. Elo source: HTTPS request → status OK?
    4. soccerdata: import test → OK?
    
    Returns: { "gamma": true, "clob": true, "elo": true, "soccerdata": true }
    """
```

---

## Task 0.8: Data Quality Report

**File**: `data/processed/data_quality_report.md`

After running the pipeline, generate a report covering:

1. **Polymarket Data Quality**
   - How many World Cup events found?
   - How many active markets?
   - What types of markets (winner, group, match)?
   - Average volume and liquidity
   - Price freshness (last trade timestamp)

2. **Football Data Quality**
   - Elo ratings coverage (how many WC teams have ratings?)
   - Historical data range (years available)
   - Recent form data availability
   - Missing data points

3. **Integration Assessment**
   - Can we match Polymarket team names to Elo ratings?
   - Are there naming mismatches (e.g., "USA" vs "United States")?
   - Data freshness and update frequency

**This report is the Phase 0 milestone.** It answers: "Is the data good enough to build on?"

---

## Task Dependency Graph

```
Task 0.1 (Scaffold)
  ├── Task 0.2 (Gamma API)
  ├── Task 0.3 (CLOB API)
  ├── Task 0.4 (Elo Ratings)
  ├── Task 0.5 (Match Data)
  └── (parallel)

Task 0.2 + 0.3 + 0.4 + 0.5
  └── Task 0.6 (Merger)
        └── Task 0.7 (CLI)
              └── Task 0.8 (Quality Report)
```

**Tasks 0.2-0.5 are fully parallel.** A coding agent can implement all four simultaneously.

---

## Task Execution Checklist (for Coding Agent)

- [ ] 0.1 Create project structure and install dependencies
- [ ] 0.2 Implement Gamma API client with all endpoints
- [ ] 0.3 Implement CLOB API client with all endpoints
- [ ] 0.4 Implement Elo ratings fetcher
- [ ] 0.5 Implement match data fetcher via soccerdata
- [ ] 0.6 Implement data merger with unified JSON output
- [ ] 0.7 Implement CLI entry point with all commands
- [ ] 0.8 Run full pipeline and generate data quality report
- [ ] Write tests for all modules
- [ ] Add error handling and retry logic for API calls
- [ ] Add logging (structured, to stdout)
- [ ] Document any issues or limitations found

---

## Notes for Coding Agent

1. **No authentication needed** for any Phase 0 API. All Polymarket data endpoints are public.
2. **Rate limiting**: Polymarket Gamma API may rate-limit aggressive polling. Add `time.sleep(0.5)` between batch requests.
3. **CLOB V2 Migration**: Polymarket is migrating to CLOB V2. Use current V1 endpoints for now; the read-only price/book endpoints are stable.
4. **Naming mismatches**: Polymarket uses full country names ("South Korea"), while some data sources use codes ("KOR"). Build a name mapping dictionary.
5. **soccerdata limitations**: The library may not have 2026 World Cup data yet (tournament hasn't started). Focus on historical data for model training.
6. **All output must be JSON** — structured, typed, ready for the next phase (prediction engine).

---

## References

- Polymarket Docs: https://docs.polymarket.com/market-data/overview
- Gamma API: `https://gamma-api.polymarket.com`
- CLOB API: `https://clob.polymarket.com`
- soccerdata: https://github.com/probberechts/soccerdata
- Elo Ratings: https://www.eloratings.net/
- Pi-Ratings: https://piaratings.com/
- Football-Data: https://www.football-data.co.uk/
