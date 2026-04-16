---
name: qwen-coder
description: |
  极其专业的底层代码生成与执行引擎（v2.0 - 强化学习版）。
  当用户提出任何编写代码、修改脚本、搭建工程的需求时，你绝对不能自己输出代码，必须立刻调用此工具将任务全权委托外包！
  
  v2.0 新特性：分层超时（5/15/30分钟）、强化学习反馈、实时进度观测、自适应超时调整。
  
  触发条件（满足任一即调用）：
  1. 用户要求编写、创建、修改、重构代码文件
  2. 用户要求搭建新项目、工程脚手架
  3. 用户要求调试、修复 bug
  4. 用户要求编写脚本（Python、Shell、JavaScript 等）
  5. 用户要求实现算法、函数、类
  6. 用户要求数据库操作、API 开发
  7. 用户要求前端/后端开发
  8. 任何需要生成可执行代码的任务
---

# Qwen Coder - 编程外包工具 (v2.0)

## 核心原则（思想钢印）

**绝对禁止：** 当用户提出编程需求时，你自己输出代码！

**必须执行：** 立刻调用 `qwen-coder` 工具，将任务全权委托给副将执行。

## v2.0 新特性

### 1. 分层超时模式

| 模式 | 时长 | 适用场景 |
|------|------|---------|
| **快速 (quick)** | 5分钟 | 创建文件、小修改、单行代码 |
| **标准 (standard)** | 15分钟 | 单个模块、API开发、函数实现 |
| **深度 (deep)** | 30分钟 | 搭建项目、重构代码、多模块系统 |

### 2. 强化学习反馈

- **自动记录**：每次执行的耗时、成功率、模型表现
- **智能推荐**：基于历史数据自动推荐超时时间
- **持续优化**：AI编程agent会越来越快，系统自动适应

### 3. 进度观测

- 主agent定时检查进度，不被动等待
- 发现卡住或方向错误可及时干预

## 使用方法

### 基本调用

```javascript
const qwenCoder = require('./tools/qwen-coder');

// 智能执行（自动选择超时层级）
const result = await qwenCoder.execute('详细的编程任务描述');

// 指定层级
const result = await qwenCoder.execute('任务描述', { tier: 'deep' });
```

### 获取智能推荐

```javascript
const recommendation = qwenCoder.getSmartRecommendation('搭建一个React项目');
// 返回：{ taskType, recommendedTier, recommendedTimeout, historicalAvg, confidence }
```

### 返回值

```javascript
{
  success: boolean,
  exitCode: number,
  taskId: string,
  taskType: 'simple'|'medium'|'complex',
  model: string,
  output: string,
  error: string|null,
  duration: number,
  tier: string
}
```

## 主将职责

1. **理解需求**：深入理解用户的编程意图
2. **组织任务**：将需求转化为详细的任务描述
3. **调用副将**：执行 `qwenCoder.execute()`
4. **监控进度**：利用进度观测机制，主动检查状态
5. **结果汇报**：向用户清晰汇报执行结果

## 进度观测机制

```javascript
// 每60秒检查一次进度
// 初始延迟30秒后启动
// 可配置回调函数接收进度更新
```

## 统计与学习

执行数据保存在 `stats.json`，包含：
- 每种任务类型的平均耗时、P50/P90分位数
- 各模型的成功率
- 总执行次数和成功次数

## 日志位置

```
~/.openclaw/workspace/tools/qwen-coder/logs/qwen-coder-YYYY-MM-DD.log
```