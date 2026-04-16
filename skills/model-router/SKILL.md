# Model Router Skill

智能模型路由器技能 - 根据任务特征自动选择最佳模型。

## 功能描述

此技能提供智能模型路由功能，根据用户输入的语言、任务类型、文本长度等特征，自动推荐最合适的模型。

## 使用方法

### 命令行调用

```bash
# 分析并推荐模型
/model <你的问题或任务>

# 示例
/model 帮我写一段Python代码
/model Please analyze this problem
/model 翻译这段话成英文
```

### 返回结果

技能会返回：
1. 推荐的模型序列（按优先级排列）
2. 匹配的路由规则
3. 决策理由
4. 输入特征分析

## 技能集成

此技能的核心逻辑位于 `tools/model-router/` 目录：

- `config.json` - 路由规则配置（可自定义修改）
- `router.js` - 核心路由逻辑
- `test.js` - 测试脚本

## 配置修改

如需修改路由规则，请编辑 `tools/model-router/config.json`：

- 添加新模型：在 `models` 部分定义
- 调整优先级：修改 `routing_rules` 中的 `priority` 值
- 添加关键词：在 `task_keywords` 中添加

## 记忆原则

**重要**：此技能遵循核心原则 - 所有任务需求都应通过模型路由器进行分发，以确保每个请求都能匹配到最合适的模型。

## 测试

运行测试脚本验证路由器工作：

```bash
node tools/model-router/test.js
```

---

🐾 OpenClaw Model Router Skill v1.0.0
