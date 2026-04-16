#!/usr/bin/env python3
"""DeFi Investment Comparative Study: Web3-Investor MCP vs LLM Web Search"""
import json
import sys
import urllib.request
import urllib.error
import time

AGENT_ID = "ac5b73fe-aebd-4f4d-bbcf-76b54d4297d2"
API_KEY = "sk_CwYCQvPAeNpiC9d6Czj-MVE0oG4SFuCXh1pY-Wa5IwY"
SERVER_URL = "https://mcp-skills.ai.antalpha.com/mcp"

def mcp_call(tool_name, arguments, session_id=None, timeout=120):
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "x-antalpha-agent-api-key": API_KEY,
    }
    if session_id:
        headers["Mcp-Session-Id"] = session_id

    payload = {
        "jsonrpc": "2.0",
        "method": "tools/call",
        "params": {"name": tool_name, "arguments": arguments},
        "id": 2,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(SERVER_URL, data=data, headers=headers, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            sid_out = resp.headers.get("mcp-session-id")
            text = resp.read().decode("utf-8")
            for line in text.split("\n"):
                line = line.strip()
                if line.startswith("data: ") or line.startswith("data:"):
                    data_str = line[5:].strip()
                    if data_str and data_str != "[DONE]":
                        return sid_out or session_id, json.loads(data_str)
            return sid_out or session_id, {}
    except Exception as e:
        return session_id, {"error": str(e)}

def mcp_init():
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
        "x-antalpha-agent-api-key": API_KEY,
    }
    payload = {
        "jsonrpc": "2.0", "method": "initialize", "params": {
            "protocolVersion": "2024-11-05", "capabilities": {},
            "clientInfo": {"name": "web3-investor-study", "version": "1.0.0"}
        }, "id": 1
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(SERVER_URL, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        sid = resp.headers.get("mcp-session-id")
        # Send initialized notification
        notify_payload = {
            "jsonrpc": "2.0", "method": "notifications/initialized", "params": {}
        }
        notify_data = json.dumps(notify_payload).encode("utf-8")
        notify_req = urllib.request.Request(SERVER_URL, data=notify_data, headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
            "x-antalpha-agent-api-key": API_KEY,
            "Mcp-Session-Id": sid,
        }, method="POST")
        urllib.request.urlopen(notify_req, timeout=10)
        return sid

# ── STUDY 1: Stablecoin Discovery ──────────────────────────────────────────────
print("=" * 60)
print("STUDY 1: Stablecoin DeFi Yield (≥4% APY)")
print("=" * 60)
print()

sid = mcp_init()
print("🎯 Track A (Web3-Investor MCP):")
t0 = time.time()
sid, result = mcp_call("investor_discover", {
    "structured_preferences": {
        "chain": "ethereum",
        "asset_type": "stablecoin",
        "min_apy": 3.7,
    },
    "natural_language": "stablecoin yield, conservative investor, minimum 4% APY",
    "limit": 5,
}, session_id=sid)
elapsed = time.time() - t0
print(f"   ⏱ 耗时: {elapsed:.1f}s")
if "error" in result:
    print(f"   ❌ Error: {result['error']}")
else:
    sc = result.get("result", {}).get("structuredContent", {})
    recs = sc.get("recommendations", [])
    print(f"   ✅ 返回 {len(recs)} 个推荐")
    for r in recs[:5]:
        apy = r.get("yield", {}).get("apy", 0)
        name = r.get("name", "?")
        tvl = r.get("scale", {}).get("tvl_usd", 0)
        print(f"   - {name}: APY {apy:.1f}%, TVL ${tvl/1e6:.0f}M")
    if sc.get("suggested_next_actions"):
        print(f"   💡 suggested_next_actions: {len(sc['suggested_next_actions'])} 个")

print()

# ── STUDY 2: Merkl Protocol Analysis ─────────────────────────────────────────
print("=" * 60)
print("STUDY 2: Merkl Protocol Deep Analysis")
print("=" * 60)
print()

# First discover Merkl
print("🎯 Track A (Web3-Investor MCP):")
print("  [Step 1] discover Merkl...")
t0 = time.time()
sid, result = mcp_call("investor_discover", {
    "structured_preferences": {"chain": "ethereum"},
    "natural_language": "Merkl Finance protocol yield",
    "limit": 3,
}, session_id=sid)
discover_elapsed = time.time() - t0

sc = result.get("result", {}).get("structuredContent", {})
recs = sc.get("recommendations", [])
merkl_rec = None
for r in recs:
    name = r.get("name", "").lower()
    if "merkl" in name:
        merkl_rec = r
        break
# Also use first result if no merkl-specific found
if not merkl_rec and recs:
    merkl_rec = recs[0]

print(f"   ⏱  discover 耗时: {discover_elapsed:.1f}s")
print(f"   ✅ 发现 {len(recs)} 个相关协议")

if merkl_rec:
    pid = merkl_rec.get("id")
    pname = merkl_rec.get("name")
    print(f"   📌 分析对象: {pname} (id: {pid})")

    print("  [Step 2] analyze...")
    t1 = time.time()
    sid, result = mcp_call("investor_analyze", {
        "product_id": pid,
        "analysis_depth": "detailed",
    }, session_id=sid)
    analyze_elapsed = time.time() - t1
    print(f"   ⏱  analyze 耗时: {analyze_elapsed:.1f}s")

    if "error" in result:
        print(f"   ❌ Error: {result['error']}")
    else:
        sc = result.get("result", {}).get("structuredContent", {})
        product = sc.get("product", {})
        llm = sc.get("llm_insights", {})
        meta = sc.get("analysis_meta", {})
        print(f"   ✅ 分析完成")
        print(f"   📊 产品: {product.get('name', '?')}")
        print(f"   💰 APY: {product.get('yield', {}).get('apy', '?')}%")
        print(f"   🧠 LLM used: {meta.get('llm_used')}")
        print(f"   🔍 洞察: {llm.get('yield_source', '?')} / {llm.get('sustainability_assessment', '?')}")
        if llm.get('risk_narrative'):
            print(f"   ⚠️  风险: {llm['risk_narrative'][:150]}")
        total_elapsed = discover_elapsed + analyze_elapsed
        print(f"\n   📈 总耗时: {total_elapsed:.1f}s")
else:
    print("   ⚠️  未找到 Merkl 相关协议")

print()
print("=" * 60)
print("Web3-Investor MCP 研究完成")
print("=" * 60)
