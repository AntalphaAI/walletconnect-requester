# Checkpoint: Web3-Investor MCP 生产验证 + 双轨研究

## 任务目标
验证 Web3-Investor MCP 生产环境可用性，对比 MCP vs Tavily 搜索效果

## 已完成步骤
1. ✅ 连接远程生产 MCP（https://mcp-skills.ai.antalpha.com/mcp，Agent ID 已注册）
2. ✅ 发现旧版 discover 失效根因：`agent_id` 生产端必填，但旧脚本未传
3. ✅ 客户端 v3.7.2 清理（移除 feedback/confirm-intent/get-intent 三个已下线工具）
4. ✅ 发布 GitHub（master）+ ClawHub（v3.7.2）
5. ✅ 双轨研究完成：稳定币理财（3 协议 MCP vs 7 协议 Tavily）
6. ✅ Merkl 协议调研结论：Merkl 是 B2B 激励平台（a16z 投资、$15 亿分发），非理财产品
7. ✅ Compare 工具测试：调用成功但返回空 values（产品 ID 或数据库查询问题）
8. ✅ 输出完整对比报告 + 完成清单

## 当前状态
全部研究完成，报告已输出。唯一未解问题：compare 返回空 values（优先级高）。

## 下一步
- [ ] 排查 compare 返回空 values 的原因（可能是产品 ID 格式问题）
- [ ] 更新 mcp_client.py 显式传递 agent_id 参数

## 关键文件
- `reports/web3-investor-vs-tavily-comparison-20260413.md`
- `reports/web3-investor-completion-summary-20260413.md`
- `skills/web3-investor/SKILL.md`（v3.7.2）
- `skills/web3-investor/scripts/mcp_client.py`（已清理）

## 错误记录
| 错误 | 原因 | 解决方案 |
|------|------|---------|
| discover 返回 0 结果 | 生产端需要 `agent_id` 参数 | 显式传入 AGENT_ID |
| Tavily 搜不到 Merkl | 品牌名被 Markel/Merkle 混淆 | 直接抓取 merkl.xyz 官网 |
| compare values 为空 | 未知（可能是产品 ID 不在数据库） | 待排查 |
