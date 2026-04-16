#!/usr/bin/env python3
"""
审批邮件数据提取脚本
⚠️ 此脚本只做数据提取，分析和分类由 OpenClaw 主智能体完成

工作流程：
1. 提取邮件数据 → 输出 JSON
2. 调用 OpenClaw API 触发主智能体分析
"""

import subprocess
import json
import datetime
import os
import sys
import base64
import re

# --- Configuration ---
GOG_ACCOUNT = "ding.ding@antalpha.com"
TELEGRAM_CHAT_ID = "6055174956"
OPENCLAW_WEBHOOK = "http://localhost:4242/v1/chat/webchat:default"

# --- Helper Functions ---
def run_gog_command(command_parts):
    env_vars = {
        "GOG_ACCOUNT": GOG_ACCOUNT,
        "GOG_KEYRING_BACKEND": "file",
        "GOG_KEYRING_PASSWORD": "beforever",
    }
    full_command = ["/home/linuxbrew/.linuxbrew/bin/gog"] + command_parts
    try:
        result = subprocess.run(full_command, capture_output=True, text=True, env={**os.environ, **env_vars})
        result.check_returncode()
        return json.loads(result.stdout)
    except Exception as e:
        print(f"DEBUG: GOG command failed. Error: {e}", file=sys.stderr)
        return None

def decode_base64_safe(data):
    try:
        missing_padding = len(data) % 4
        if missing_padding:
            data += '=' * (4 - missing_padding)
        return base64.urlsafe_b64decode(data).decode('utf-8', errors='ignore')
    except Exception:
        return ""

def extract_email_body_text(payload):
    if not payload: return ""
    if payload.get("mimeType") == "text/plain" and payload.get("body", {}).get("data"):
        return decode_base64_safe(payload["body"]["data"])
    if payload.get("mimeType") == "text/html" and payload.get("body", {}).get("data"):
        html_content = decode_base64_safe(payload["body"]["data"])
        text = re.sub(r'<style[^>]*>.*?</style>', '', html_content, flags=re.DOTALL)
        text = re.sub(r'<head[^>]*>.*?</head>', '', text, flags=re.DOTALL)
        text = re.sub(r'<[^>]+>', '\n', text)
        return re.sub(r'(\n\s*)+', '\n', text).strip()
    if payload.get("parts"):
        text = ""
        for part in payload["parts"]:
            text += extract_email_body_text(part) + "\n"
        return text.strip()
    return ""

def get_header(headers, name):
    for header in headers:
        if header['name'].lower() == name.lower():
            return header['value']
    return ""

def get_emails_for_approval():
    query = f'to:{GOG_ACCOUNT} OR cc:{GOG_ACCOUNT} ("审批" OR "审核" OR "Approve" OR "Review" OR "确认") newer_than:24h'
    search_result = run_gog_command(["gmail", "search", f"'{query}'", "--max", "10", "--json"])
    return search_result.get("threads", []) if search_result else []

def get_full_thread_content(thread_id):
    return run_gog_command(["gmail", "threads", "get", thread_id, "--full", "--json"]).get("thread", {})

async def main():
    print("=== 审批邮件数据提取 ===", file=sys.stderr)
    print(f"时间: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}", file=sys.stderr)
    
    threads_summary = get_emails_for_approval()
    if not threads_summary:
        print("No approval emails found in the last 24h", file=sys.stderr)
        return

    print(f"Found {len(threads_summary)} potential approval emails", file=sys.stderr)
    
    # 提取数据
    structured_threads = []
    for thread_sum in threads_summary:
        thread_id = thread_sum.get("id")
        subject = thread_sum.get("subject", "未知主题")
        
        if not thread_id: continue

        full_thread = get_full_thread_content(thread_id)
        if not full_thread or not full_thread.get("messages"):
            continue

        conversation = []
        for message in full_thread.get("messages", []):
            payload = message.get("payload", {})
            headers = payload.get("headers", [])
            
            from_email = get_header(headers, "From")
            date_str = get_header(headers, "Date")
            
            try:
                dt_obj = datetime.datetime.strptime(date_str.split(' (')[0].strip(), '%a, %d %b %Y %H:%M:%S %z')
                timestamp = dt_obj.timestamp()
            except:
                timestamp = message.get("internalDate", 0) / 1000

            body_text = extract_email_body_text(payload)
            
            conversation.append({
                "from": from_email,
                "timestamp": timestamp,
                "date": date_str,
                "body": body_text[:3000]  # 限制长度
            })

        conversation.sort(key=lambda x: x['timestamp'])

        structured_threads.append({
            "id": thread_id,
            "subject": subject,
            "link": f"https://mail.google.com/mail/u/{GOG_ACCOUNT}/#all/{thread_id}",
            "conversation": conversation
        })

    # 输出数据供大模型分析
    print("\n" + "="*80)
    print("📧 以下是需要分析的审批邮件数据，请用大模型能力进行分析：")
    print("="*80)
    print(json.dumps(structured_threads, ensure_ascii=False, indent=2))
    
    # 触发 OpenClaw 主智能体分析
    # 构造提示词
    prompt = f"""请分析以下审批邮件数据，按以下分组输出：
1. 🔴 待我审批的
2. 🟡 尚未到我审批的（前序审批人未完成）
3. ✅ 我已审批完的（我已确认，或同级其他人已确认"或签"）

注意：
- "/" 分隔表示"或签"关系（任一人确认即可）
- 需要包含邮件链接

数据：
{json.dumps(structured_threads, ensure_ascii=False, indent=2)[:8000]}
"""

    # 发送给主智能体分析
    try:
        import urllib.request
        data = json.dumps({"message": prompt}).encode('utf-8')
        req = urllib.request.Request(OPENCLAW_WEBHOOK, data=data, headers={'Content-Type': 'application/json'})
        response = urllib.request.urlopen(req, timeout=60)
        print(f"\n已触发主智能体分析", file=sys.stderr)
    except Exception as e:
        print(f"触发主智能体失败: {e}", file=sys.stderr)
        print("请手动分析上述数据", file=sys.stderr)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
