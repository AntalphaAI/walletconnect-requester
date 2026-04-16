# ERRORS.md

记录命令失败、异常错误。

---

## [ERR-20260310-001] antalpha-rwa-skill 发布不完整

**Logged**: 2026-03-10T14:22:00Z
**Priority**: high
**Status**: resolved
**Area**: docs

### Summary
GitHub 上发布的 antalpha-rwa-skill 存在两个问题：scripts/ 目录为空，产品参数与 MCP 实际值不匹配。

### Error
用户反馈：
1. `scripts/` 目录是空的 - `rwa_client.py` 还没写
2. 产品参数对不上：SKILL.md 写的是 90天/5%，MCP 实际是 30天+7天/5.5%+4.8%

### Context
- 仓库地址：https://github.com/AntalphaRWA/antalpha-rwa-skill
- 本地有 `scripts/rwa_client.py`（18KB）但未推送到 GitHub
- SKILL.md 中的产品参数已过时，需要更新为 MCP 实际参数

### Suggested Fix
1. 将 `scripts/rwa_client.py` 推送到 GitHub
2. 更新 SKILL.md 中的产品参数：
   - Term: 30天 + 7天（而不是 90天）
   - Yield: 5.5% + 4.8%（而不是 5%）

### Metadata
- Reproducible: yes
- Related Files: skills/antalpha-rwa/SKILL.md, skills/antalpha-rwa/scripts/rwa_client.py
- Tags: github, skill, documentation, incomplete

---