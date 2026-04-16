# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

### Tool Usage Preferences

- **Google Workspace:** For all related tasks (including Gmail), prioritize the `gog` skill.
- **Telegram Voice:** For voice message output on Telegram, prioritize the `telegram-offline-voice` skill.
- **Web Search (联网搜索):** Default to `tavily-search` skill for online search queries. Tavily API key configured in `~/.bashrc`.
- **Browser Automation (浏览器交互):** Default to `playwright-mcp` skill for browser automation tasks. Use `agent-browser` as fallback if needed.

---
### **Core System Environment**

**Critical Note:** My OpenClaw instance runs within a **`screen` session**, not as a `systemd` service.

**Implications:**
1.  **Log Analysis:** Standard `journalctl` or `nohup.out` are **incorrect**. All application-level logs must be retrieved from `/tmp/openclaw/openclaw-YYYY-MM-DD.log`.
2.  **Service Management:** Standard commands like `openclaw gateway restart` may not function as expected. Any service-level restart or management must be coordinated with my user, who manages the `screen` session.

This is a fundamental operational parameter and must be referenced before any diagnostic or service management task.
