# Brain — 实体图谱索引

> GB 式知识图谱：每个实体一个文件，交叉引用构建关系网。

## 目录结构

| 目录 | 说明 | 示例 |
|------|------|------|
| `people/` | 人物档案 | dingding.md, xiao-ju.md |
| `companies/` | 公司组织 | antalpha.md |
| `projects/` | 项目档案 | web3-investor.md |
| `concepts/` | 概念知识 | rwa.md |
| `contacts/` | 外部联系人 | derar-islim.md |

## 现有实体

### People
| 实体 | 文件 | 最后更新 |
|------|------|----------|
| 丁丁 (Bevan) | `people/dingding.md` | 2026-04-14 |
| 小鞠 | `people/xiao-ju.md` | 2026-04-14 |

### Companies
| 实体 | 文件 | 最后更新 |
|------|------|----------|
| Antalpha | `companies/antalpha.md` | 2026-04-14 |

### Projects
| 实体 | 文件 | 最后更新 |
|------|------|----------|
| Web3 Investor | `projects/web3-investor.md` | 2026-04-14 |
| Model Router v4 | `projects/model-router.md` | 2026-04-14 |
| DeerFlow | `projects/deerflow.md` | 2026-04-14 |

### Concepts
| 实体 | 文件 | 最后更新 |
|------|------|----------|
| RWA | `concepts/rwa.md` | 2026-04-14 |

### Contacts
| 实体 | 文件 | 最后更新 |
|------|------|----------|
| Derar Islim | `contacts/derar-islim.md` | 2026-04-14 |

## 使用规则

### 查脑（Read）
每次对话开始时，先查 brain/ 相关实体，获取上下文。

### 写脑（Write）
每次对话结束后，更新涉及的实体文件：
- 提到新人 → 创建 `people/<name>.md`
- 谈到新公司 → 创建 `companies/<name>.md`
- 有新决策 → 更新对应实体的「时间线」
- 发现偏好 → 更新对应实体的「偏好」字段

### 实体页面模板

```markdown
# {实体名称}

## 基本信息
- 类型: person / company / project / concept / contact
- 创建时间: YYYY-MM-DD
- 最后更新: YYYY-MM-DD

## 关联实体
- [[关联实体名称]] — 关系描述

## 时间线
- YYYY-MM-DD: 事件描述

## 笔记
- AI 观察和分析

## 偏好/特征
- 关键特征或偏好记录
```
