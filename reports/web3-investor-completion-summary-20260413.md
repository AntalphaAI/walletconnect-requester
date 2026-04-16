# Web3-Investor 研究完成清单

**时间**：2026-04-13  
**负责人**：小田

---

## ✅ 已完成事项

### 1. MCP 生产环境连接验证
- 端点：`https://mcp-skills.ai.antalpha.com/mcp`
- Agent ID：`ac5b73fe-aebd-4f4d-bbcf-76b54d4297d2`
- 状态：✅ 连接正常，3 个工具全部可用

### 2. Web3-Investor 客户端清理（v3.7.2）
- 移除：`feedback()`、`confirm_intent()`、`get_stored_intent()`
- 移除：对应 3 个 CLI subparser
- 清理：`format_response()` orphaned 分支
- 状态：✅ 已发布 GitHub + ClawHub

### 3. 研究一：稳定币理财发现
- MCP：返回 3 个协议（Pendle 14.95%、Curve 8.42%、Morpho 0%）
- Tavily：返回 7 个协议数据，含 Aave/Compound/Yearn/Convex
- 结论：MCP 数据更精准，Tavily 覆盖更广

### 4. 研究二：Merkl 协议分析
- MCP：0 条结果（Merkl 是 B2B 激励平台，不在 DeFiLlama 收益库）
- Tavily：0 条结果（品牌名被 Markel/Merkle 混淆）
- 兜底验证：通过 merkl.xyz 官网确认：a16z 投资、$15 亿分发、200+ 协议客户
- 结论：Merkl 不可直接投资，但通过其客户协议可间接参与

### 5. Compare 工具测试
- 调用成功，但返回 `values` 为空（产品 ID 格式或数据库查询问题待排查）

### 6. 对比报告输出
- 路径：`reports/web3-investor-vs-tavily-comparison-20260413.md`
- 五维评分：MCP 3.6/5 vs Tavily 3.2/5
- 核心结论：MCP 在精确性/结构化上领先，Tavily 在覆盖广度上领先，两者互补

---

## 📁 输出文件

| 文件 | 说明 |
|------|------|
| `reports/web3-investor-vs-tavily-comparison-20260413.md` | 完整对比报告（EN） |
| `skills/web3-investor/SKILL.md` | 客户端文档（v3.7.2） |
| `skills/web3-investor/scripts/mcp_client.py` | 客户端代码（已清理） |

---

## ⚠️ 待处理问题

| 问题 | 优先级 | 备注 |
|------|--------|------|
| `investor_compare` 返回空 values | 高 | 需排查产品 ID 或 MCP 数据层 |
| MCP 客户端未传 `agent_id` | 高 | 需更新 `mcp_client.py` 函数签名 |
| 风险字段为空 | 中 | 需确认是数据问题还是字段设计问题 |
