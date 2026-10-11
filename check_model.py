# -*- coding: utf-8 -*-
"""
check_model.py
──────────────
Verification script for the Strands Agents SDK and Google Gemini integration.
Executes one tool-calling request to verify model reasoning and tool invocation.
Never prints or logs API keys.
"""

import os
import sys
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env", override=False)
except ImportError:
    pass

from agent.handler import AquaTwinAgent

def run_check():
    print("=" * 70)
    print("  AquaTwin Strands Agents SDK Verification (check_model.py)")
    print("=" * 70)

    # Resolve demo candidate from prep/out/demo_segments.json
    demo_file = ROOT_DIR / "prep" / "out" / "demo_segments.json"
    demo_id = "9789474393_9789474394_0"
    if demo_file.exists():
        try:
            with open(demo_file, "r", encoding="utf-8") as f:
                d = json.load(f)
            cand = d.get("allow_candidates", [])
            if cand:
                demo_id = cand[0]["id"]
        except Exception:
            pass

    query = f"What is the flood status of road segment {demo_id}?"
    print(f"\n[Request] Query: '{query}'")

    agent = AquaTwinAgent()
    result = agent.run(query)

    print(f"\n[Model Info]")
    print(f"  Provider        : {result.get('model_provider')}")
    print(f"  Model Name      : {result.get('model_name')}")
    print(f"  LLM Unavailable : {result.get('llm_unavailable')}")
    if result.get("llm_unavailable") and result.get("reason"):
        print(f"  Reason          : {result.get('reason')}")

    print(f"\n[Tool Execution Trace]")
    tool_calls = [t for t in result.get("trace", []) if t.get("stage") == "tool_call"]
    tool_results = [t for t in result.get("trace", []) if t.get("stage") == "tool_result"]

    if not tool_calls and not tool_results:
        print("  No tools were invoked.")
    else:
        for tc in tool_calls:
            print(f"  > Tool Called: {tc.get('tool')} with args: {tc.get('input')}")
        for tr in tool_results:
            out = tr.get("output", {})
            summary = {k: v for k, v in out.items() if k in ["display_name", "flood_probability", "flood_pct", "validation_source", "is_flooded", "is_alert_eligible"]}
            print(f"  < Tool Result: {tr.get('tool')} -> {summary}")

    print(f"\n[Agent Response]")
    print(f"  {result.get('response')}")
    print("\n" + "=" * 70)

if __name__ == "__main__":
    run_check()
