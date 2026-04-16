#!/usr/bin/env python3
"""Register agent with Antalpha Skills MCP server to get agent_id + api_key."""
import json
import urllib.request
import urllib.error

SERVER_URL = "https://mcp-skills.ai.antalpha.com/mcp"

def send_jsonrpc(url, payload, session_id=None, timeout=60):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if session_id:
        headers["Mcp-Session-Id"] = session_id

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            session_id_out = resp.headers.get("mcp-session-id")
            text = resp.read().decode("utf-8")
            return session_id_out, text
    except urllib.error.HTTPError as e:
        return None, f"HTTP {e.code}: {e.reason}"
    except Exception as e:
        return None, str(e)

def parse_sse(text):
    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("data: ") or line.startswith("data:"):
            data_str = line[5:].strip()
            if data_str and data_str != "[DONE]":
                try:
                    return json.loads(data_str)
                except json.JSONDecodeError:
                    pass
    return {}

# Step 1: Initialize
print("=== Step 1: Initialize ===")
sid, text = send_jsonrpc(SERVER_URL, {
    "jsonrpc": "2.0", "method": "initialize", "params": {
        "protocolVersion": "2024-11-05", "capabilities": {},
        "clientInfo": {"name": "web3-investor-study", "version": "1.0.0"}
    }, "id": 1
})
print(f"Session ID: {sid}")
print(f"Response: {text[:300]}")

# Step 2: Send initialized notification
if sid:
    send_jsonrpc(SERVER_URL, {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}}, session_id=sid)
    print("\n=== Step 2: Registered notification sent ===")

    # Step 3: Call antalpha-register
    print("\n=== Step 3: Call antalpha-register ===")
    _, resp = send_jsonrpc(SERVER_URL, {
        "jsonrpc": "2.0", "method": "tools/call", "params": {
            "name": "antalpha-register",
            "arguments": {"agent_name": "web3-investor-study", "email": "bevan@antalpha.com"}
        }, "id": 3
    }, session_id=sid)
    result = parse_sse(resp)
    print(json.dumps(result, indent=2))
