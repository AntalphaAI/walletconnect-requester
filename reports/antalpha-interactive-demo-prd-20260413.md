# Antalpha Interactive Demo — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-13  
**Status:** Draft  
**Audience:** Frontend Development Team  

---

## 1. Product Overview

### 1.1 What

A single-page Web3 AI Chat on `antalpha.com` that lets visitors **directly interact with Antalpha's MCP tools** — no installation, no configuration, no wallet required.

### 1.2 Why

| Problem | Solution |
|---------|----------|
| Users can't evaluate MCP tools without installing them | Try tools instantly in the browser |
| Installation process causes 70% drop-off | Experience value first, decide later |
| "Why not just use ChatGPT?" | Every answer backed by real on-chain data, with visible data sources |
| Trading tools require wallet setup | Simulate trade building (no execution) |

### 1.3 Positioning

**NOT** a general-purpose AI chat.  
**NOT** a "ChatGPT for Web3".  

**IS** an **Interactive Demo** — a showcase of what Antalpha's MCP tools can do.  
Think: Vercel's deployment preview, but for AI tools.

### 1.4 Target Users

- AI Agent users evaluating MCP tools before installation
- Web3 traders exploring on-chain data without coding
- Developers comparing Antalpha vs alternatives

---

## 2. Demo Tools Selection (8 Tools)

Selected by **demo impact** (instantly impressive) and **data vividness** (real numbers, not vague text).

### Tier 1 — "Wow" Tools (Must Have)

| # | Tool | Demo Name | What User Sees | Data Source |
|---|------|-----------|----------------|-------------|
| 1 | `investor_discover` | **DeFi Yield Finder** | Top yield opportunities with real APY, TVL, risk scores | DeFiLlama (16,693 pools, real-time) |
| 2 | `smart-money-signal` | **Smart Money Tracker** | Whale wallet buy/sell signals with USD amounts | Moralis (on-chain transfers) |
| 3 | `swap-quote` | **DEX Swap Simulator** | Best swap route with price impact, gas cost, slippage | 0x Protocol (DEX aggregator) |
| 4 | `wallet-balance-query` | **Multi-Chain Wallet Scanner** | Token balances across 12+ chains in one query | Multi-chain RPC nodes |

### Tier 2 — "Deep" Tools (Nice to Have)

| # | Tool | Demo Name | What User Sees | Data Source |
|---|------|-----------|----------------|-------------|
| 5 | `poly-trending` | **Prediction Market Radar** | Hot prediction markets with odds and volumes | Polymarket API |
| 6 | `cex-market-get-ticker` | **CEX Market Pulse** | Real-time prices, 24h volume, funding rates | OKX Exchange API |
| 7 | `investor_compare` | **Yield Comparison** | Side-by-side pool comparison with risk-adjusted scores | DeFiLlama |
| 8 | `poly-market-info` | **Market Deep Dive** | Detailed prediction market analysis | Polymarket API |

### Tool Exclusion List (Not in Demo)

| Category | Tools | Reason |
|----------|-------|--------|
| Execution tools | `cex-spot-place-order`, `hl-market-order`, `poly-buy`, `poly-sell` | No wallet in chat; adapted as simulation only |
| Setup tools | `cex-setup-*`, `smart-swap-create` | Irrelevant for demo |
| Infrastructure | `test-ping`, `easy-mining-*` | Not user-facing |

---

## 3. Trading Tools Adaptation: Simulation Only

### 3.1 Principle

**The demo chat has NO wallet connectivity. All trading tools must be adapted to "simulate → display" mode, not "execute" mode.**

### 3.2 Adapted Tools

| Original Tool | Demo Adaptation | User Experience |
|--------------|-----------------|-----------------|
| `swap-quote` | ✅ Keep as-is (read-only, no execution) | Shows best route, price, slippage — user sees the full trade preview |
| `poly-new` → `poly-market-info` | ✅ Keep as-is (read-only) | Shows market details, odds, liquidity |
| `cex-market-get-ticker` | ✅ Keep as-is (read-only) | Shows real-time prices and funding rates |
| `poly-buy` / `poly-sell` | ❌ Removed from demo | Would require Polymarket wallet connection |
| `cex-spot-place-order` | ❌ Removed from demo | Would require CEX API key setup |
| `hl-market-order` | ❌ Removed from demo | Would require Hyperliquid wallet |
| `smart-swap-create` | ❌ Removed from demo | Would require wallet signature |

### 3.3 Simulation Call-to-Action

When a user's intent implies execution (e.g., "帮我买 100 USDT 的 ETH"):

```
🤖 AI Response:
"I've found the best swap route for you:
  100 USDT → 0.0312 ETH (Uniswap V3, Ethereum)
  Price impact: 0.02% | Slippage: 0.05% | Gas: ~$2.30
  
  ⚠️ This is a simulated preview. To execute this trade:
  1. Connect Antalpha MCP to your AI Agent (OpenClaw / Claude Code)
  2. Use the swap-full tool with your wallet
  [Get API Key →]  [Installation Guide →]"
```

**Key:** The simulation result itself must be impressive enough to convince the user to install.

---

## 4. Data Source Transparency

### 4.1 Principle

**Every AI response must visibly cite its data source.** This is the #1 differentiator from ChatGPT.

### 4.2 Display Format

Each tool response must include a **data source badge**:

```
┌─────────────────────────────────────────────┐
│ 📊 DeFi Yield Finder                        │
│                                              │
│ Found 3 stablecoin opportunities:            │
│                                              │
│ 1. Pendle APYUSD-USDCETH                     │
│    APY: 14.95% | TVL: $8.2M | Risk: Medium   │
│                                              │
│ 2. Curve APYUSD-APXUSD                       │
│    APY: 8.42% | TVL: $2.1M | Risk: Low        │
│                                              │
│ 3. Morpho APYUSD                             │
│    APY: 0% | TVL: $4.3M | Risk: Low            │
│                                              │
│ ─── Data Source ──────────────────────────── │
│ 🔗 DeFiLlama API • 16,693 pools • Real-time  │
│ 🕐 Updated: 3 seconds ago                     │
└─────────────────────────────────────────────┘
```

### 4.3 Data Source Table (For All 8 Tools)

| Tool | Primary Source | Data Freshness | Update Mechanism |
|------|---------------|---------------|-----------------|
| `investor_discover` | DeFiLlama | Real-time | On-demand API call |
| `smart-money-signal` | Moralis | Near real-time | On-chain scan (5-15 min lag) |
| `swap-quote` | 0x Protocol | Real-time | On-demand API call |
| `wallet-balance-query` | Multi-chain RPC | Real-time | On-demand RPC call |
| `poly-trending` | Polymarket | Real-time | On-demand API call |
| `cex-market-get-ticker` | OKX Exchange | Real-time (WebSocket) | Streaming / poll |
| `investor_compare` | DeFiLlama | Real-time | On-demand API call |
| `poly-market-info` | Polymarket | Real-time | On-demand API call |

---

## 5. Page Design Specification

### 5.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│  🔺 Antalpha   [Products] [Docs] [GitHub]   [Get API Key]│
├──────────────────────────────────────────────────────────┤
│                                                          │
│   Try Web3 AI Tools — No Installation Required           │
│   Powered by real on-chain data, not AI guessing         │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │                                                    │  │
│  │  🤖: What would you like to explore?              │  │
│  │                                                    │  │
│  │  [💡 Find best stablecoin yield]                   │  │
│  │  [🐋 Track smart money movements]                  │  │
│  │  [🔄 Simulate a DEX swap]                          │  │
│  │  [💰 Check wallet balances]                        │  │
│  │  [📈 Browse prediction markets]                    │  │
│  │  [📊 Compare DeFi yields]                          │  │
│  │                                                    │  │
│  │  ┌──────────────────────────────────────────┐      │  │
│  │  │ Type your question...              [Send] │      │  │
│  │  └──────────────────────────────────────────┘      │  │
│  │                                                    │  │
│  │  Chat messages area (scrollable)                    │  │
│  │  - AI responses with tool results                   │  │
│  │  - Data source badges on each response               │  │
│  │  - Simulation CTAs for trade-related queries         │  │
│  │                                                    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ⚡ Powered by Antalpha MCP Server                       │
│  📊 16,693 DeFi pools • 🔗 12 chains • 🐋 100+ whale wallets│
│                                                          │
│  [Free to try • 10 queries/day]  [Get API Key →]         │
└──────────────────────────────────────────────────────────┘
```

### 5.2 Key UI Elements

| Element | Specification |
|---------|--------------|
| **Hero Section** | One-liner + 3 stats (pools, chains, wallets) |
| **Quick Actions** | 6 preset buttons (mapped to top 6 tools) |
| **Chat Input** | Text input + Send button. No file upload, no voice. |
| **AI Responses** | Markdown support. Tool results rendered as cards. |
| **Data Source Badge** | Every tool response has a footer: source + freshness |
| **Simulation Banner** | Trade-related results show "⚠️ Simulated" badge |
| **CTA** | "Get API Key" button on every tool result card |

### 5.3 Quick Action → Tool Mapping

| Quick Action Button | Triggered Tool | Example User Input |
|-------------------|---------------|-------------------|
| 💡 Find best stablecoin yield | `investor_discover` | "I want to earn yield on stablecoins" |
| 🐋 Track smart money | `smart-money-signal` | "Show me recent whale activity" |
| 🔄 Simulate a DEX swap | `swap-quote` | "Swap 100 USDT to ETH on Ethereum" |
| 💰 Check wallet balances | `wallet-balance-query` | "Check balance for 0x1234..." |
| 📈 Browse prediction markets | `poly-trending` | "What are the hottest prediction markets?" |
| 📊 Compare DeFi yields | `investor_compare` | "Compare Aave vs Compound vs Curve" |

---

## 6. Backend Architecture

### 6.1 Overview

```
User Browser
    ↓ HTTPS POST /api/chat
Chat Backend (Next.js API Route / Node.js)
    ↓ MCP Protocol (Streamable HTTP)
Antalpha MCP Server (mcp-skills.ai.antalpha.com)
    ↓
External APIs (DeFiLlama, Moralis, 0x, Polymarket, OKX)
```

### 6.2 API Specification

**Endpoint:** `POST /api/chat`

**Request:**
```json
{
  "message": "Find me the best stablecoin yield",
  "session_id": "optional-session-uuid",
  "conversation_history": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:**
```json
{
  "reply": "Found 3 stablecoin opportunities...",
  "tool_calls": [
    {
      "tool": "investor_discover",
      "status": "success",
      "data": { ... },
      "data_source": {
        "name": "DeFiLlama",
        "url": "https://defillama.com",
        "freshness": "real-time",
        "record_count": 16693
      }
    }
  ],
  "is_simulation": false,
  "cta": {
    "type": "api_key",
    "text": "Want to use this in your AI Agent?",
    "url": "https://antalpha.com/get-api-key"
  }
}
```

### 6.3 Rate Limiting (Free Tier)

| Metric | Limit |
|--------|-------|
| Messages per IP per day | 10 |
| Messages per session | 20 |
| Tool calls per message | 3 (max) |
| Conversation history | Last 10 messages |

**Exceeded Response:**
```
"You've reached the free daily limit (10 queries).
Get an API Key for unlimited access → [Sign Up Free]
```

### 6.4 Tool Routing Logic

The chat backend needs a lightweight intent classifier to route user messages to the correct MCP tool:

| User Intent Pattern | Tool | Example |
|-------------------|------|---------|
| "yield", "APY", "earn", "stablecoin", "DeFi" | `investor_discover` | "best stablecoin yield" |
| "whale", "smart money", "big wallet" | `smart-money-signal` | "whale activity on ETH" |
| "swap", "exchange", "convert", "trade" | `swap-quote` | "swap 1000 USDC to ETH" |
| "balance", "wallet", "portfolio" | `wallet-balance-query` | "check my wallet" |
| "prediction", "bet", "polymarket", "market" | `poly-trending` | "trending prediction markets" |
| "price", "ticker", "funding rate" | `cex-market-get-ticker` | "BTC price" |
| Default / unclear | Ask for clarification | "hello" |

---

## 7. Conversation Design Patterns

### 7.1 First Message (Auto-greeting)

```
👋 Welcome to Antalpha — Web3 AI Tools, no installation needed.

I have access to real-time on-chain data from DeFiLlama, Moralis, 0x, 
Polymarket, and OKX. Everything I show you is live data, not AI guesses.

Try asking:
• "What's the best stablecoin yield right now?"
• "Show me recent whale movements"
• "Simulate swapping 100 USDT to ETH"
• "Check wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
```

### 7.2 Tool Result Display Pattern

```
🤖 Here are the top stablecoin yield opportunities:

┌─────────────────────────────────────────────┐
│ 🏦 Pendle APYUSD-USDCETH                    │
│ Chain: Ethereum                              │
│ APY: 14.95% (base: 4.2% + reward: 10.75%)   │
│ TVL: $8,200,000                              │
│ Risk Score: 65/100 (Moderate)                │
│ [→ Deep Analysis]                            │
├─────────────────────────────────────────────┤
│ 🏦 Curve APYUSD-APXUSD                      │
│ Chain: Ethereum                              │
│ APY: 8.42%                                   │
│ TVL: $2,100,000                              │
│ Risk Score: 82/100 (Conservative)            │
│ [→ Deep Analysis]                            │
├─────────────────────────────────────────────┤
│ 📊 Source: DeFiLlama • 16,693 pools • Live    │
│ 🕐 Refreshed: just now                        │
└─────────────────────────────────────────────┘

💡 Want these tools in your own AI Agent? [Get Free API Key →]
```

### 7.3 Simulation Pattern (Trade Intent)

```
🤖 Here's your swap simulation:

┌─────────────────────────────────────────────┐
│ 🔄 Swap Simulation                           │
│                                               │
│ 100 USDT → 0.0312 ETH                         │
│ Route: USDT → WETH (Uniswap V3)              │
│                                               │
│ Price: $3,205.12/ETH                          │
│ Price Impact: 0.02%                           │
│ Estimated Slippage: 0.05%                     │
│ Network Fee: ~$2.30 (gas)                     │
│                                               │
│ ⚠️ This is a simulated preview.               │
│ No wallet connected. No funds will move.       │
├─────────────────────────────────────────────┤
│ 📊 Source: 0x Protocol • Live                 │
└─────────────────────────────────────────────┘

To execute this swap for real:
1️⃣ Install Antalpha MCP in your AI Agent
2️⃣ Use the swap-full tool with your wallet
[Installation Guide →]  [Get API Key →]
```

### 7.4 Fallback Pattern (Unclear Intent)

```
🤖 I'm not sure which tool to use for that. I specialize in:

📊 DeFi yield discovery
🐋 Smart money tracking
🔄 DEX swap simulation
💰 Wallet balance checking
📈 Prediction market analysis
📊 Market price data

Try rephrasing your question, or pick one of the quick actions above.
```

---

## 8. Non-Functional Requirements

### 8.1 Performance

| Metric | Target |
|--------|--------|
| First response (no tool call) | < 2 seconds |
| Tool response (with API call) | < 8 seconds |
| Page load (LCP) | < 1.5 seconds |
| Time to interactive (TTI) | < 3 seconds |

### 8.2 Security

- **No wallet connectivity** — demo never asks for private keys or signatures
- **No CEX API keys** — demo uses a shared read-only OKX key for market data only
- **Rate limiting** — IP-based, 10 messages/day
- **No user data persistence** — conversation history is session-only (in-memory or Redis TTL)
- **CORS** — restricted to `antalpha.com` origins

### 8.3 Accessibility

- Mobile responsive (chat must work on phone screens)
- Dark mode default (Web3 audience preference)
- Keyboard support (Enter to send)

---

## 9. Success Metrics

| Metric | Target (Week 1) | Target (Month 1) |
|--------|----------------|-----------------|
| Unique visitors | 200 | 2,000 |
| Chat interactions | 500 | 10,000 |
| "Get API Key" clicks | 20 (4%) | 300 (15%) |
| Tool calls executed | 1,000 | 20,000 |
| Return visitors | 10% | 25% |

### Primary Conversion Funnel

```
Visitor → Try Chat (100%)
  → Send first message (target: 60%)
    → Trigger a tool call (target: 40%)
      → Click "Get API Key" (target: 10%)
        → Sign up (target: 5%)
```

---

## 10. Out of Scope (V1)

- ❌ User authentication / accounts (V2)
- ❌ Conversation history persistence (V2)
- ❌ Wallet connectivity (never — this is a demo, not a trading platform)
- ❌ Custom API key input in chat (V2)
- ❌ Multi-language support (English only for V1)
- ❌ Voice input / output
- ❌ File upload
- ❌ Image generation

---

## 11. Implementation Priority

### Phase 1 — MVP (Week 1)
1. Single-page chat UI (input + messages)
2. Intent classifier (rule-based, 8 patterns)
3. 4 Tier 1 tools wired up (`investor_discover`, `smart-money-signal`, `swap-quote`, `wallet-balance-query`)
4. Data source badges on every response
5. Rate limiting (10/day)
6. "Get API Key" CTA

### Phase 2 — Polish (Week 2)
1. 4 Tier 2 tools (`poly-trending`, `cex-market-get-ticker`, `investor_compare`, `poly-market-info`)
2. Simulation banner for trade-related queries
3. Quick action buttons
4. Mobile responsive design
5. Dark mode
6. Success metrics dashboard

### Phase 3 — Growth (Week 3-4)
1. SEO optimization (meta tags, structured data)
2. Share buttons ("Share this analysis")
3. Embeddable widget (other sites can embed a chat snippet)
4. Analytics integration (track which tools are most popular)

---

*Document prepared for Antalpha Frontend Team*
*Backend endpoint: `https://mcp-skills.ai.antalpha.com/mcp` (existing)*
