import subprocess
import json
import datetime
import re
import os
import base64
import asyncio
import sys

# --- Configuration ---
GOG_ACCOUNT = "ding.ding@antalpha.com"
GOG_KEYRING_BACKEND = "file"
GOG_KEYRING_PASSWORD = "beforever"
APPROVAL_KEYWORDS = ["审批", "pending approval"]
REVOKE_KEYWORDS = ["撤销", "作废", "cancelled", "revoked", "revoke", "cancel"]

# --- Helper Functions ---
def run_gog_command(command_parts):
    env_vars = {
        "GOG_ACCOUNT": GOG_ACCOUNT,
        "GOG_KEYRING_BACKEND": GOG_KEYRING_BACKEND,
        "GOG_KEYRING_PASSWORD": GOG_KEYRING_PASSWORD,
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
    query_parts = []
    query_parts.append(f"to:{GOG_ACCOUNT} OR cc:{GOG_ACCOUNT}") # Also check CC
    approval_query = " OR ".join([f'"{kw}"' for kw in APPROVAL_KEYWORDS])
    query_parts.append(f"({approval_query})")
    full_query = " ".join(query_parts) + " newer_than:24h"
    search_result = run_gog_command(["gmail", "search", f"'{full_query}'", "--max", "10", "--json"])
    return search_result.get("threads", []) if search_result else []

def get_full_thread_content(thread_id):
    return run_gog_command(["gmail", "threads", "get", thread_id, "--full", "--json"]).get("thread", {})

async def main():
    threads_summary = get_emails_for_approval()
    if not threads_summary:
        print(json.dumps([]))
        return

    structured_threads = []
    for thread_sum in threads_summary:
        thread_id = thread_sum.get("id")
        subject = thread_sum.get("subject", "未知主题")
        
        if not thread_id: continue

        # Simple keyword check on snippet to pre-filter revoked emails
        if any(kw in thread_sum.get("snippet", "") for kw in REVOKE_KEYWORDS):
            continue
            
        full_thread = get_full_thread_content(thread_id)
        if not full_thread or not full_thread.get("messages"):
            continue

        conversation = []
        for message in full_thread.get("messages", []):
            payload = message.get("payload", {})
            headers = payload.get("headers", [])
            
            from_email = get_header(headers, "From")
            date_str = get_header(headers, "Date")
            
            # Very basic date parsing, might need improvement for different formats
            # The goal is just to have a comparable value for sorting.
            try:
                # Example: 'Thu, 26 Feb 2026 18:46:05 +0800'
                dt_obj = datetime.datetime.strptime(date_str.split(' (')[0].strip(), '%a, %d %b %Y %H:%M:%S %z')
                timestamp = dt_obj.timestamp()
            except:
                timestamp = message.get("internalDate", 0) / 1000 # fallback to internalDate

            body_text = extract_email_body_text(payload)
            
            conversation.append({
                "from": from_email,
                "timestamp": timestamp,
                "date": date_str,
                "body": body_text[:4000] # Limit text to keep context reasonable
            })

        # Sort conversation by time
        conversation.sort(key=lambda x: x['timestamp'])

        structured_threads.append({
            "id": thread_id,
            "subject": subject,
            "link": f"https://mail.google.com/mail/u/{GOG_ACCOUNT}/#all/{thread_id}",
            "conversation": conversation
        })

    print(json.dumps(structured_threads, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
