# 宏观报告生成任务拆分规范 v2

> **版本**: v2 - 加入超时主动检查机制 (2026-03-02)
> **核心改进**: 解决子代理announce不可靠导致主会话中断的问题

---

## 设计原则

1. **并行优先**：多个子代理同时搜集不同维度数据
2. **单一职责**：每个子代理只负责一个领域
3. **容错设计**：某个子代理失败不影响整体，主会话可补充
4. **主会话轻量**：只做汇总和生成，不做繁重的数据搜集
5. **🆕 超时主动检查**：主会话不被动等待，主动轮询子代理状态

---

## 任务拆分架构

```
主会话
  │
  ├── 派遣子代理 (并行)
  │     ├── 子代理1: 宏观数据
  │     ├── 子代理2: 链上数据
  │     └── 子代理3: 机构监管
  │
  ├── 🆕 超时检查循环
  │     ├── T+5分钟: 第一次主动检查
  │     │     └── subagents list → sessions_history 拉取结果
  │     │
  │     └── T+10分钟: 第二次主动检查
  │           └── 仍未完成 → 标记失败，进行最终总结
  │
  └── 汇总生成报告
        ├── 成功的子代理数据 ✓
        ├── 失败的子代理数据 ✗ (标记"数据缺失")
        └── 坦率告知用户哪些子任务未完成
```

---

## 🆕 主会话超时检查协议

### 核心规则

| 检查点 | 时间 | 动作 | 失败处理 |
|--------|------|------|----------|
| 第1次检查 | 派遣后5分钟 | `subagents list` → `sessions_history` 拉取结果 | 继续等待 |
| 第2次检查 | 派遣后10分钟 | 再次检查状态 | 标记失败，进入最终总结 |

### 检查流程代码

```python
# 伪代码 - 主会话执行逻辑

def run_parallel_subagents():
    # 1. 派遣子代理
    subagents = [
        spawn("macro-data", timeout=300),
        spawn("onchain-data", timeout=300),
        spawn("institutional-data", timeout=300)
    ]
    
    # 2. 记录派遣时间
    start_time = now()
    results = {}
    
    # 3. 等待announce或超时检查
    while True:
        # 检查是否收到announce (通过系统消息)
        if all_announces_received():
            break
            
        # 第1次检查 (5分钟)
        if now() - start_time > 5min and len(results) < 3:
            status = subagents_list()
            for sub in status['active'] + status['recent']:
                if sub['status'] == 'done' and sub['label'] not in results:
                    results[sub['label']] = sessions_history(sub['sessionKey'])
        
        # 第2次检查 (10分钟) - 最终
        if now() - start_time > 10min:
            status = subagents_list()
            for sub in status['recent']:
                if sub['status'] == 'done' and sub['label'] not in results:
                    results[sub['label']] = sessions_history(sub['sessionKey'])
            break
            
        sleep(30sec)  # 每30秒检查一次
    
    # 4. 生成报告，标记缺失数据
    generate_report(results, missing=[label for label in ['macro-data', 'onchain-data', 'institutional-data'] if label not in results])
```

### 坦率告知模板

```
📊 **子代理执行状态**

| 子代理 | 状态 | 数据 |
|--------|------|------|
| macro-data | ✅ 完成 | 已获取 |
| onchain-data | ⚠️ announce失败 | 已主动拉取 |
| institutional-data | ❌ 超时失败 | 数据缺失 |

**说明**: `onchain-data`子代理已完成但announce未送达，已通过主动检查获取。`institutional-data`超时，相关数据将在后续报告中补充。
```

---

## 子代理任务模板

### 子代理1: 宏观数据
```
任务: 搜集宏观环境数据，返回JSON格式结果

需要搜集:
1. CFTC日元持仓数据 (最新COT报告)
2. USDJPY汇率走势
3. 美联储RRP余额
4. 美联储资产负债表/QT进度

输出格式:
{
  "jpy_carry": { "net_position": "数字", "trend": "描述" },
  "usdjpy": { "current": "数字", "weekly_change": "描述" },
  "fed_rrp": { "balance": "数字", "trend": "描述" },
  "fed_qt": { "total_assets": "数字", "status": "描述" }
}
```

### 子代理2: 链上数据
```
任务: 搜集比特币链上结构数据，返回JSON格式结果

需要搜集:
1. 上市矿企BTC储备变化
2. 挖矿难度和Hashprice
3. MVRV比率或持有者成本基础
4. 永续合约资金费率
5. 交易所稳定币余额变化(如有)

输出格式:
{
  "miner_reserves": { "total_btc": "数字", "monthly_change": "百分比" },
  "mining": { "difficulty": "数字", "hashprice_trend": "描述" },
  "mvrv": { "ratio": "数字", "signal": "描述" },
  "funding_rate": { "current": "数字", "sentiment": "描述" }
}
```

### 子代理3: 机构与监管
```
任务: 搜集机构动态和监管信息，返回JSON格式结果

需要搜集:
1. BTC ETF净流入/流出 (最近一周)
2. ETH ETF净流入/流出
3. MicroStrategy持仓变化
4. 重要监管新闻 (SEC等)

输出格式:
{
  "btc_etf": { "weekly_flow": "数字", "trend": "描述" },
  "eth_etf": { "weekly_flow": "数字", "trend": "描述" },
  "mstr": { "holdings": "数字", "recent_change": "描述" },
  "regulation": { "key_news": ["新闻1", "新闻2"] }
}
```

---

## 超时配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `agents.defaults.subagents.runTimeoutSeconds` | 600 | 子代理执行超时（10分钟） |
| 主会话第1次检查 | 5分钟 | 主动拉取已完成子代理结果 |
| 主会话第2次检查 | 10分钟 | 最终检查，标记失败 |
| 主会话检查间隔 | 30秒 | 避免频繁轮询 |

---

## 错误处理升级版

| 错误类型 | 处理方式 |
|---------|---------|
| 子代理超时 | 标记失败，主会话继续其他数据汇总 |
| 子代理announce失败 | 主动检查时拉取，成功则使用 |
| 部分子代理失败 | 坦率告知用户，报告标注"数据缺失" |
| 全部子代理失败 | 回退到主会话分批执行 |

---

## 适用范围

此规范适用于所有涉及子代理分发的任务：
- ✅ 比特币机构级宏观分析报告
- ✅ 多维度数据搜集任务
- ✅ 并行研究任务
- ✅ 任何需要fire-and-forget模式的任务

---

## 变更日志

- **v2 (2026-03-02)**: 加入超时主动检查机制，解决announce不可靠问题
- **v1 (2026-03-02)**: 初始版本，定义任务拆分架构