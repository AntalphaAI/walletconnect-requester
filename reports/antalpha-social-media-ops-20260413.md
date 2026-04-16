# AntAlpha 社交媒体运营细化方案

**版本：** v1.0 | 日期：2026-04-13
**定位：** GTM 策略的内容运营执行手册

---

## 一、Moltbook（Agent 社交网络）

### 1.1 平台概况

| 维度 | 数据 |
|------|------|
| 上线时间 | 2026-01-28 |
| Agent 数量 | 160 万+ |
| 平台形态 | Reddit 风格，Agent 发帖/评论/投票，人类只能围观 |
| 底层框架 | OpenClaw（Antalpha 有天然优势） |
| 关键 Submolt | `m/cryptocurrency`、`m/agentfinance`、`m/security`（数万成员） |
| 媒体报道 | NPR、WIRED、DigitalOcean 均有报道 |
| 争议 | 有"诈骗"质疑，但流量和媒体关注是真实的 |

### 1.2 Antalpha 在 Moltbook 的价值定位

**Moltbook 不是直接获客渠道**（Agent 不会买 API Key），但它是：

1. **品牌曝光** — 160 万 Agent 的主人（人类）在围观
2. **SEO 流量** — 媒体报道带来搜索权重，帖子被搜索引擎收录
3. **技术展示窗口** — 让其他 OpenClaw 用户看到 Antalpha MCP 的能力

### 1.3 执行方案

#### Step 1：注册 Antalpha 官方 Agent

| 配置项 | 值 |
|--------|-----|
| 名称 | `AntalphaAI` |
| 人设 | Web3 数据分析师，专门分享链上数据和 DeFi 洞察 |
| 工具 | Antalpha MCP 全套（investor_discover, smart-money-signal 等） |
| 运行方式 | 定时任务（每天发 2-3 条帖子） |

#### Step 2：内容日历

| 时间 (UTC) | Submolt | 内容模板 | 使用工具 |
|-----------|---------|---------|---------|
| 08:00 | `m/agentfinance` | "今日 DeFi 收益 Top 3：[Pendle 14.9%] [Curve 8.4%] ..." | `investor_discover` |
| 12:00 | `m/cryptocurrency` | "过去 24h 聪明钱动向：鲸鱼 X 买入 $500K USDC" | `smart-money-signal` |
| 18:00 | `m/general` | "有趣发现：查了一下 0x... 的钱包，跨 8 条链有 23 种代币" | `wallet-balance-query` |

#### Step 3：互动策略

- 回复其他 Agent 帖子，自然带出工具能力（"我用 Antalpha 查了一下，实际上..."）
- 不硬推产品，提供真实数据价值
- 目标：2 周内 karma 达到 100+

#### Step 4：监控指标

| 指标 | 追踪方式 |
|------|---------|
| 帖子 upvote 数 | Moltbook API |
| 评论互动数 | Moltbook API |
| karma 增长 | Moltbook API |
| 帖子被人类截图分享到 X 的次数 | 手动搜索 `moltbook` + `antalpha` |

---

## 二、Twitter/X（最高优先级）

### 2.1 为什么是第一优先级

34.4% 的 Crypto 用户以 X 为主要信息源。X 是 Web3 的信息中枢。

### 2.2 账号设置

| 配置项 | 值 |
|--------|-----|
| 账号 | `@AntalphaAI` |
| Bio | "Web3 AI Tools — Real on-chain data, not AI guessing. Try it free → antalpha.com" |
| Pinned Tweet | Interactive Demo 的一个真实结果截图 |

### 2.3 内容策略（每日 1-2 条）

| 内容类型 | 频率 | 示例 | 生成方式 |
|---------|------|------|---------|
| 📊 数据快报 | 每天 1 条 | "Pendle 上有个 14.95% APY 的稳定币池子，TVL $8.2M，风险中等。数据：DeFiLlama 实时" | `investor_discover` 自动生成 |
| 🐋 聪明钱追踪 | 每 2 天 1 条 | "鲸鱼 0x7a2... 过去 24h 买入了 $320K ETH。来源：Moralis" | `smart-money-signal` 自动生成 |
| 🔄 教程/对比 | 每周 1 条 | Thread："用 AI 查了 Aave vs Compound vs Curve 的收益" | 手动写，工具生成数据 |
| 💡 行业观点 | 每周 1 条 | "MCP 月下载 110M+，但 90% 的 MCP Server 没有真实用户" | 手动写 |

**核心原则：每条推文必须带数据来源。这是与 99% Crypto 推文的差异。**

### 2.4 增长黑客

- 回复大 V 推文，用工具生成数据补充（有人讨论 DeFi 收益 → 回复真实数据）
- Thread 格式讲完整数据故事
- 每周固定时间发"周报"（本周链上数据亮点）

---

## 三、Telegram（中文 Crypto 核心）

### 3.1 目标社群

| 社群类型 | 规模 | 数量 |
|---------|------|------|
| DeFi 交流群 | 500-2000 人 | 5-8 个 |
| AI Agent 交流群 | 200-1000 人 | 3-5 个 |
| OpenClaw 中文用户群 | 已有 | 1 个 |

**总计：加入 10-15 个群**

### 3.2 运营规范

| 动作 | 频率 | 内容 |
|------|------|------|
| 分享有价值的数据 | 每天 1 条 | 用 `investor_discover` 或 `smart-money-signal` 生成 |
| 回答群友问题 | 即时 | 有人问"稳定币放哪好"→ 用工具回答 + Demo 链接 |
| 发广告/链接 | 几乎不 | 信任建立后偶尔带 Demo 链接 |

**反垃圾规则：**
- 进群先观察 1-2 天群文化
- 不要一进群就发链接
- 建立信任后再自然引导

---

## 四、知乎 / 即刻（中文 AI + Crypto）

### 4.1 知乎

| 动作 | 数量 | 内容方向 |
|------|------|---------|
| 回答高流量问题 | 5 个 | 搜索 "AI Agent"、"DeFi 收益"、"Web3 工具" |
| 写专栏文章 | 1 篇 | "我用 AI Agent 自动发现了 15% APY 的稳定币理财" |

**每篇文末自然引导至 Interactive Demo。**

### 4.2 即刻

| 动作 | 数量 | 内容方向 |
|------|------|---------|
| 发动态 | 3-5 条 | 数据截图 + 一句话洞察（即刻偏短内容） |
| 评论区互动 | 持续 | 在 AI / Crypto 话题下评论，带数据 |

---

## 五、Discord（开发者社区）

| 社群 | 动作 | 频率 |
|------|------|------|
| OpenClaw Discord | 分享 Antalpha MCP 使用体验 | 2-3 次/周 |
| Claude subreddit | 发 "I built a Web3 MCP server" 类帖子 | 1 次/周 |
| Smithery Discord | 参与 MCP 工具讨论，自然带出 Antalpha | 1-2 次/周 |
| Anthropic Discord | #mcp-servers 频道介绍 Antalpha | 1 次/周 |

---

## 六、KOL 策略

### 6.1 分层模型（1 + 20 + 100 金字塔）

| 层级 | 数量 | 粉丝量 | 作用 | 预算 |
|------|------|--------|------|------|
| 塔尖 KOL | 1-3 | 100K+ | 品牌背书 + 大曝光 | $2K-5K/人 |
| 腰部 KOL | 10-20 | 5K-30K | 专业可信度 + 转化 | $200-1K/人 |
| KOC | 50-100 | <5K | 口碑传播 + 社群渗透 | 免费 API Key |

**行业数据支撑：** Micro KOL（5K-30K 粉）信任度比大 KOL 高 45%。Nano/KOC（<10K 粉）平均互动率 5%，大 KOL（百万粉）仅 1.5%。

### 6.2 选择标准

| 筛选维度 | 标准 | 权重 |
|---------|------|------|
| 内容垂直度 | DeFi / AI Agent / Web3 工具，不发 meme 不发土狗 | 40% |
| 受众画像 | 开发者 + 交易者，不是纯散户 | 25% |
| 互动质量 | 评论区有实质性讨论，不是"GM"刷屏 | 20% |
| 历史合作 | 推过工具类产品（非纯 token 推广） | 15% |

**❌ 不选的 KOL 类型：**
- 纯 meme/土狗推广型（受众不对）
- "付费喊单"型（损害品牌）
- 粉丝买量型（无真实转化）

### 6.3 筛选流程

**Step 1：建立候选池（1 天）**

Twitter/X 搜索关键词：
```
"MCP server" OR "Model Context Protocol"
"AI agent" AND ("DeFi" OR "crypto" OR "Web3")
"AI tools" AND ("trading" OR "yield" OR "DeFi")
"Claude" AND ("Web3" OR "crypto")
"OpenClaw" OR "Moltbook"
```

筛选条件：粉丝 5K-100K，近 30 天发过 AI+Crypto 内容，互动率 > 2%

**目标候选池：30-50 人**

**Step 2：分级（2 天）**

| 级别 | 标准 | 数量 | 对接方式 |
|------|------|------|---------|
| S 级 | 50K+ 粉，AI+Crypto 双垂直，内容质量高 | 3-5 人 | DM，提供免费 API + 专属 Demo |
| A 级 | 10K-50K 粉，DeFi 或 AI 垂直 | 10-15 人 | DM，提供免费 API Key |
| B 级 | 5K-10K 粉，有真实内容 | 15-30 人 | 提供免费 API Key，自助使用 |

**Step 3：对接话术**

S/A 级 KOL DM 模板：
```
Hi [name], I've been following your content on [specific topic].
We built Antalpha — a Web3 MCP server that gives AI agents real-time
on-chain data (DeFi yields, smart money signals, DEX swaps).
I think your audience would find this interesting.
Would you like to try it? I can set up a free API key for you.
Demo: [antalpha.com demo link]
```

**不提付费，不提合作，只说"免费试用"。让对方先体验。**

**Step 4：KOC 激励计划（免费，靠产品驱动）**

面向 50-100 个 KOC（<5K 粉），提供：
- 免费无限 API Key
- "Powered by Antalpha" 徽章/水印
- 内容带来注册 → 给更高等级 API

---

## 七、免费 API Key 产品支持需求

### 7.1 需要新增的功能

| 功能 | 优先级 | 开发量 | 说明 |
|------|--------|--------|------|
| Influencer API Key 标记 | 🔴 高 | 1h | 数据库给 API Key 加 `tier` 字段：`free` / `influencer` / `pro` / `enterprise` |
| 分级速率限制 | 🔴 高 | 2-3h | `free`: 10次/天, `influencer`: 100次/天, `pro`: 无限 |
| 注册来源追踪 | 🟡 中 | 1h | 注册时加 `referral_code` 或 `utm_source` 字段 |
| API 使用统计页面 | 🟡 中 | 4-6h | 让 KOL 看到自己用了多少次、调了哪些工具 |
| 分享链接生成 | 🟡 中 | 2h | 生成 `antalpha.com/?ref=kol_name`，追踪转化 |

**总开发量：约 1-2 天。**

### 7.2 API Key 分级方案

| Tier | 获取方式 | 速率限制 | 有效期 |
|------|---------|---------|--------|
| Free | 网页注册，无需审核 | 10 次/天 | 永久 |
| Influencer | 申请 + 审核 | 100 次/天 | 6 个月，可续期 |
| Pro | 付费 | 无限 | 按月订阅 |
| Enterprise | 联系销售 | 无限 + 专属支持 | 年付 |

### 7.3 KOL 转化追踪链路

```
KOL 发内容（带专属链接 antalpha.com/?ref=kol_name）
  ↓
用户点击 → 注册 API Key（记录 referral_source=kol_name）
  ↓
用户使用 API → 每次调用记录 referral_source
  ↓
月末给 KOL 发数据："你的链接带来了 X 注册，Y 次调用"
```

---

## 八、第一周执行清单

| 天 | 动作 | 产出 |
|----|------|------|
| Day 1 | 创建 `@AntalphaAI` Twitter 账号 + 完善 bio | ✅ Twitter 就绪 |
| Day 1 | 在 Moltbook 注册 `AntalphaAI` Agent | ✅ Moltbook 就绪 |
| Day 2 | Twitter 发第一条内容（数据快报） | ✅ 首条推文 |
| Day 2 | Moltbook 发第一条帖子（DeFi 收益） | ✅ 首条帖子 |
| Day 2 | 开始 Twitter KOL 候选池收集（30-50 人） | ✅ 候选池 Excel |
| Day 3 | 加入 10-15 个 Telegram 目标群 | ✅ 社群列表 |
| Day 3 | Twitter KOL 分级完成 | ✅ S/A/B 分级表 |
| Day 4 | 给 S 级 KOL 发 DM（3-5 人） | ✅ DM 已发 |
| Day 4 | 给 A 级 KOL 发 DM（10-15 人） | ✅ DM 已发 |
| Day 5 | 知乎回答 2-3 个高流量问题 | ✅ 知乎内容 |
| Day 5 | Influencer API Key 分级功能开发启动 | ✅ 开发开始 |
| Day 6-7 | 稳定节奏：Twitter 1条/天 + Moltbook 2条/天 + 社群互动 | ✅ 运营节奏 |

---

## 九、预算估算

| 项目 | 费用 | 说明 |
|------|------|------|
| KOL S 级（3-5 人） | $6K-15K | 可先从免费试用开始，有效果再付费 |
| KOL A 级（10-15 人） | $2K-15K | 同上 |
| KOC（50-100 人） | $0 | 免费 API Key |
| 产品开发（API 分级） | $0 | 内部开发 |
| 社群运营 | $0 | 内部执行 |
| **零成本启动总计** | **$0** | 全部用免费策略 |
| **含 KOL 付费总计** | **$8K-30K** | 第一个月，看效果再加 |

**建议：第一个月零成本启动。验证渠道效果后，第二个月再投入 KOL 预算。**

---

*本文档为社交媒体运营执行手册，配合 GTM 策略文档使用。*
