#!/usr/bin/env python3
import sys
sys.path.insert(0, '/home/admin/.openclaw/workspace/skills/web3-investor/scripts')
from mcp_client import discover, format_response

result = discover(
    chain="ethereum",
    stablecoin_only=True,
    min_apy=3.7,
    limit=5,
    natural_language="stablecoin yield, conservative investor, minimum 4% APY"
)
print(format_response(result))
