# Model Router v4

## 基本信息
- **类型**: project
- **版本**: v4
- **状态**: ✅ 已完成
- **路径**: `tools/model-router/`
- **最后更新**: 2026-04-14

## 关联实体
- [[dingding]] — 项目负责人

## 功能
- 智能 LLM 路由系统
- 12 维度评分
- Sigmoid 置信度校准
- Profile 策略（auto/eco/premium/coding）
- LRU 缓存 + 预热
- 指标 + 日志 + 性能监控

## 核心模块
- `lib/dimensions.js` — 12维度评分器
- `lib/confidence.js` — Sigmoid置信度校准
- `lib/tier.js` — Tier→模型映射
- `lib/profile.js` — auto/eco/premium/coding策略
- `lib/cache.js` — LRU缓存+预热
- `lib/observability.js` — 指标+日志+性能监控

## 笔记
- 在当前会话切换模型，不创建子代理（关键修正）
- 调用 route(input) → session_status(model=xxx) → 直接回答
