# Checkpoint: World Cup GTM 杀手锏策略

## 任务目标
以 2026 美加墨世界杯为引爆点，聚焦资源打造 Antalpha AI 足球预测产品，实现品牌曝光和流量获取。

## 核心决策（已确定）

### 产品形态
- **排除 B（独立博彩平台）** — 合规成本太高
- **C（主阵地）**：antalpha.com/worldcup 世界杯专区 — 满足上市公司品牌曝光需求
- **A（引流钩子）**：Polymarket 生态内发布分析内容 → 引流回官网

### 合规边界
- 我们提供"分析工具"，不是"博彩平台"
- 用户自己做决策，在 Polymarket 等平台交易
- 跟提供股票分析报告同一逻辑

### Polymarket 引流路径（无需商务谈判）
1. **免费数据层**（Gamma API / CLOB API）— 无需认证，读取赔率数据
2. **Builders Program**（申请制）— $2.5M+ grants，50+ 工具在运行，排行榜曝光
3. **社交/内容引流** — Twitter/X、Discord、Telegram Bot、Chrome 扩展

## 核心功能（5 个必做 + 1 个待定）
| 功能 | 用户价值 | 技术难度 |
|------|---------|---------|
| 每日赛事预测 | 胜负/比分/进球数 + AI 置信度 | 中 |
| Polymarket 赔率对比 | AI 预测 vs 市场赔率，找价值洼地 | 低 |
| 实时赔率追踪 | 比赛进行中赔率变化 | 低 |
| AI 投注建议 | 基于赔率差的推荐（非执行） | 中 |
| 预测排行/战绩 | AI 历史预测准确率公开透明 | 低 |
| 赛事深度分析 | 球队/球员数据、历史交锋、战术分析 | 高（待定） |

## 整体架构
```
用户入口层
  ├── antalpha.com/worldcup（主阵地）
  │     ├── AI 赛事分析 & 预测
  │     ├── Polymarket 实时赔率展示
  │     └── "去 Polymarket 下注" 按钮（跳转，不执行）
  ├── Interactive Demo（体验入口）
  │     └── "试试 AI 分析这场比赛" → 引导至世界杯专区
  └── Polymarket 生态（引流钩子）
        └── 发布分析内容 / 预测结果 → 带回 antalpha.com

能力层
  ├── Antalpha MCP / Skills（开发者）
  └── 链上交易执行（进阶用户）
```

## 执行时间线（草案）

### Phase 0（现在 → 4月底）
- [ ] Gamma API 读取世界杯市场数据
- [ ] antalpha.com/worldcup 页面开发
- [ ] Twitter/X 每日发布比赛预测
- [ ] 申请 Polymarket Builders Program

### Phase 1（5月）
- [ ] Builders Program 通过后深度集成
- [ ] 考虑轻量 Telegram Bot（世界杯预测推送）

### Phase 2（6月，世界杯期间）
- [ ] 每日赛果回顾 + AI 准确率排行
- [ ] 淘汰赛重点预测 → 社交传播

## 关键时间节点
- **2026-06-11**：世界杯开赛
- **距今约 8 周**
- **产品最晚 5 月底上线**，留 2 周预热期

## 预测引擎框架（已确定）

### 模型架构（三层 + 集成）
- **基础层**：Dixon-Coles（增强泊松回归）→ 比分预测
- **核心层**：CatBoost/XGBoost + pi-ratings → 胜负概率（55-56%准确率）
- **辅助层**：LSTM → 状态趋势捕捉
- **集成层**：Stacking + 温度缩放校准 + Kelly Index 难度分级

### 数据源（按优先级）
1. Elo/pi-ratings — ClubElo、eloratings.net（免费）
2. xG 数据 — Understat、FBref（免费）
3. 赛果/赛程 — soccerdata Python 库（免费）
4. 球员数据 — Transfermarkt（免费）
5. ⭐ FM 球员能力值 — Football Manager DB（需手动提取，差异化壁垒）
6. Opta/StatsBomb — 商业付费（备选）

### 关键特征（重要性排序）
1. ★★★★★ Elo/pi-ratings（队力评分）
2. ★★★★★ 近期状态（加权最近 N 场）
3. ★★★★☆ 主场优势 + 海拔/气候
4. ★★★★☆ xG 进球数据
5. ★★★☆☆ 伤病/停赛
6. ★★★☆☆ ⭐ FM 球员能力值（独有）

### 可复用开源工具
- soccerdata — 统一数据管道
- ghurault/football-prediction — Dixon-Coles 实现
- ML-KULeuven/soccer_xg — 生产级 xG
- TrendTechVista/polymarket-sports-bot — Polymarket 集成参考

### 学术共识
- 梯度提升树 > 深度学习（CatBoost 最佳单模型）
- 特征工程 > 模型选择
- 领域知识至关重要（FM 经验 = 护城河）
- 校准 > 准确率（对锦标赛模拟尤其重要）
- FM→真实预测是全球空白，无人做过

## 待讨论事项
- [ ] 商业化模式（流量如何变现）
- [ ] FM 数据来源和结构化方案
- [ ] 预测是人工+AI 还是全自动
- [ ] 资源分配和工程优先级
- [ ] 与之前 GTM 方案（五波攻势）的关系调整

## 竞品参考（Polymarket 生态）
- DGPredict（$1.73M 交易量）— AI 驱动预测市场分析
- Polymer（$1.60M）— 第三方工具
- Predera（$1.23M）— 定价效率检测
- Polytrader.app（$1.03M）— AI 分析 + 自动化交易
- polypredict.ai — AI 公允价值工具（边角检测）
- Ask Gina（$512K）— AI 对话式预测

## 竞争优势
- FM 十年经验（2015-2025）→ 独特的数据驱动预测直觉
- Antalpha AI 全栈能力（数据获取 + AI 分析 + 交易执行）
- 上市公司品牌背书

## 关键文件
- `reports/antalpha-gtm-strategy-20260413.md`（原 GTM 方案，需调整）
- `memory/antalpha-ai.md`（Antalpha AI 项目总览）

## 错误记录
（暂无）
