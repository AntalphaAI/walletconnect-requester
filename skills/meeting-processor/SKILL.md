---
name: meeting-processor
description: Process meeting transcriptions from Recall.ai. Use when checking for pending meeting tasks, summarizing meeting content, and creating documentation. Trigger with /meeting-processor or automatically when pending tasks exist.
---

# Meeting Processor Skill

Automatically processes meeting transcriptions recorded by the Recall.ai bot.

## Trigger Conditions

Use this skill when:
- User asks about pending meetings
- Checking for new meeting recordings
- Processing meeting transcriptions

## Processing Workflow

### Step 1: Check for Pending Tasks

```bash
node /home/admin/.openclaw/workspace/scripts/process-meeting.js next
```

If no pending tasks, inform user: "没有待处理的会议记录"

### Step 2: Read Transcription

```bash
node /home/admin/.openclaw/workspace/scripts/process-meeting.js read <task-id>
```

### Step 3: Summarize the Meeting

Use the `summarize` skill to create a concise summary:
- Key topics discussed
- Decisions made
- Action items
- Participants (if mentioned)

### Step 4: Send Discord Notification

Send the summary to the user via Discord with format:

```
📋 会议记录摘要

📅 会议时间: [timestamp]
🆔 会议 ID: [meeting-id]

## 主要内容
[summary content]

## 行动项
- [ ] Action item 1
- [ ] Action item 2

---
📝 完整记录已保存到 Google Doc: [link]
```

### Step 5: Create Google Doc

Use `gog` skill to create a Google Doc with:
- Title: "会议记录 - [date]"
- Content: Full transcription + summary

If Google Doc creation fails, use `notion` skill as fallback.

### Step 6: Mark Task as Processed

```bash
node /home/admin/.openclaw/workspace/scripts/process-meeting.js mark-processed <task-id>
```

## File Locations

| File | Path |
|------|------|
| Pending Tasks | `workspace/recall-record/pending-tasks.json` |
| Transcriptions | `workspace/recall-record/meeting-*.txt` |
| Processing Script | `workspace/scripts/process-meeting.js` |

## Error Handling

1. **Transcription file not found**: Log error, mark task as failed
2. **Google Doc creation fails**: Try Notion
3. **Notion also fails**: Save locally and notify user

## Bot Name

The Recall.ai bot is named: **丁丁的会议助理：小田**