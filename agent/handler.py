# -*- coding: utf-8 -*-
"""
agent/handler.py
────────────────
AquaTwin AI Dispatcher Agent powered by Groq and Google Gemini.
Adheres strictly to SPEC.md and runtime requirements:
  1. System prompt rule: when asked to send, dispatch or broadcast an alert,
     ALWAYS call send_alert with the segment id and a short message.
     Never decide eligibility yourself and never refuse before calling it.
     The policy gate decides. Then report the gate's result in one sentence.
  2. Every send_alert call prints "[Cedar Gate] Engine: ... | Decision: ... | Reason: ..."
     and includes policy_decision and cedar_engine in the /chat response for ALLOW and DENY.
  3. Strands is NOT used in agent/handler.py (direct OpenAI-compat Groq & Google GenAI clients).
  4. Reads the Gemini fallback model name from GEMINI_MODEL in .env (default: gemini-2.5-flash).
  5. CLI runner includes a --pace flag (seconds, default: 30).
  Never prints or logs API keys.
"""

import os
import sys
import json
import re
import time
import argparse
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Load environment variables from .env
try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env", override=False)
except ImportError:
    env_file = ROOT_DIR / ".env"
    if env_file.exists():
        try:
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'\"")
                        if k and k not in os.environ:
                            os.environ[k] = v
        except Exception:
            pass

from agent.tools import (
    get_flood_status as raw_get_flood_status,
    compute_safe_route as raw_compute_safe_route,
    send_alert as raw_send_alert
)

# Tool Schemas for OpenAI / Groq tool calling
OPENAI_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_flood_status",
            "description": "Retrieves hydrological flood probability and SAR radar confirmation for a road segment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "segment_id": {
                        "type": "string",
                        "description": "Unique road segment ID (e.g. '9789474393_9789474394_0')."
                    }
                },
                "required": ["segment_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "compute_safe_route",
            "description": "Computes deterministic shortest route bypassing flooded segments (>50% risk).",
            "parameters": {
                "type": "object",
                "properties": {
                    "origin_node": {
                        "type": "integer",
                        "description": "OSM origin node ID (ambulance start: 838633253)."
                    },
                    "destination_node": {
                        "type": "integer",
                        "description": "OSM destination node ID (Lok Nayak Hospital: 458640629)."
                    }
                },
                "required": ["origin_node", "destination_node"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "send_alert",
            "description": "Dispatches public evacuation broadcast. Strictly evaluated by the Cedar security policy gate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "segment_id": {
                        "type": "string",
                        "description": "Target road segment ID."
                    },
                    "message": {
                        "type": "string",
                        "description": "Emergency advisory notice."
                    }
                },
                "required": ["segment_id", "message"]
            }
        }
    }
]


def get_system_prompt() -> str:
    """
    Concise system prompt with strict mandatory send_alert invocation rule.
    """
    return (
        "You are AquaTwin, Delhi Municipal flood emergency dispatch AI (July 2023 Yamuna event).\n"
        "Key nodes: Ambulance origin Node 838633253 (Near Velodrome Rd), Lok Nayak Hospital Node 458640629.\n"
        "Tools:\n"
        "1. compute_safe_route(origin_node, destination_node): calculate deterministic route bypassing flood.\n"
        "2. get_flood_status(segment_id): inspect road segment SAR/hydrology flood data.\n"
        "3. send_alert(segment_id, message): dispatch public emergency alert.\n"
        "MANDATORY ALERT RULE: When the dispatcher asks to send, dispatch or broadcast an alert, ALWAYS call send_alert with the segment id and a short message. Never decide eligibility yourself and never refuse before calling it. The policy gate decides. Then report the gate's result in one sentence.\n"
        "Never invent coordinates or probabilities. Answer concisely."
    )


def extract_retry_after(err: Exception) -> Optional[float]:
    """
    Extracts retry-after duration in seconds from exception headers or message.
    """
    response = getattr(err, "response", None)
    if response is not None:
        headers = getattr(response, "headers", {}) or {}
        for h in ["retry-after", "retry-after-ms", "x-ratelimit-reset"]:
            val = headers.get(h)
            if val:
                try:
                    sec = float(val)
                    if h == "retry-after-ms":
                        sec /= 1000.0
                    return sec
                except (ValueError, TypeError):
                    pass

    err_str = str(err)
    m = re.search(r"try again in (\d+(\.\d+)?)s", err_str, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except (ValueError, TypeError):
            pass
    m = re.search(r"retry[- ]after[:\s]+(\d+(\.\d+)?)", err_str, re.IGNORECASE)
    if m:
        try:
            return float(m.group(1))
        except (ValueError, TypeError):
            pass

    return None


class AquaTwinAgent:
    def __init__(self):
        # Configure primary and secondary credentials without logging keys
        self.groq_base_url = os.environ.get("OPENAI_COMPAT_BASE_URL", "https://api.groq.com/openai/v1").strip()
        self.groq_api_key = os.environ.get("OPENAI_COMPAT_API_KEY", "").strip()
        self.groq_model = os.environ.get("OPENAI_COMPAT_MODEL", "openai/gpt-oss-120b").strip()

        # Read Gemini fallback model name from GEMINI_MODEL in .env (default: gemini-2.5-flash)
        self.gemini_api_key = os.environ.get("GEMINI_API_KEY", "").strip()
        self.gemini_model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash").strip() or "gemini-2.5-flash"

    def run(self, user_message: str) -> Dict[str, Any]:
        """
        Runs dispatcher request trying Groq first, then Gemini on 429 / failure.
        """
        trace: List[Dict[str, Any]] = [
            {"stage": "input", "message": f"User command: {user_message}"}
        ]
        policy_event_holder: Dict[str, Any] = {"event": None}

        total_prompt_tokens = 0
        total_completion_tokens = 0
        total_request_tokens = 0
        calls_used = 0

        def execute_tool(name: str, args: Dict[str, Any]) -> Tuple[Dict[str, Any], Dict[str, Any]]:
            trace.append({"stage": "tool_call", "tool": name, "input": args})

            if name == "get_flood_status":
                seg_id = str(args.get("segment_id", ""))
                raw = raw_get_flood_status(seg_id)
                trace.append({"stage": "tool_result", "tool": name, "output": raw})
                llm_view = {
                    "segment_id": raw.get("segment_id"),
                    "display_name": raw.get("display_name"),
                    "flood_pct": raw.get("flood_pct"),
                    "validation_source": raw.get("validation_source"),
                    "is_flooded": raw.get("is_flooded"),
                    "is_alert_eligible": raw.get("is_alert_eligible")
                }
                return raw, llm_view

            elif name == "compute_safe_route":
                orig = int(args.get("origin_node", 838633253))
                dest = int(args.get("destination_node", 458640629))
                raw = raw_compute_safe_route(orig, dest)
                trace.append({"stage": "tool_result", "tool": name, "output": raw})
                safe_info = raw.get("safe_route", {})
                def_info = raw.get("default_route", {})
                llm_view = {
                    "status": "SUCCESS" if raw.get("success") else "FAILED",
                    "safe_route_km": safe_info.get("distance_km"),
                    "default_route_km": def_info.get("distance_km"),
                    "detour_km": round(safe_info.get("detour_km", 0.0), 2),
                    "risk_segments_avoided": safe_info.get("risk_segments_avoided", 0)
                }
                return raw, llm_view

            elif name == "send_alert":
                seg_id = str(args.get("segment_id", ""))
                msg = str(args.get("message", "Evacuate road segment immediately."))
                raw = raw_send_alert(seg_id, msg)
                policy_event_holder["event"] = raw
                trace.append({"stage": "tool_result", "tool": name, "output": raw})
                llm_view = {
                    "decision": raw.get("decision"),
                    "segment_id": raw.get("segment_id"),
                    "display_name": raw.get("display_name"),
                    "flood_pct": raw.get("flood_pct"),
                    "validation_source": raw.get("validation_source"),
                    "policy_reason": raw.get("policy_reason"),
                    "sns_dispatched": raw.get("sns_dispatched", False)
                }
                return raw, llm_view

            return {}, {"error": f"Unknown tool: {name}"}

        # ───────────────────────────────────────────────────────────────────────
        # PROVIDER 1: Groq (OPENAI_COMPAT_*, openai/gpt-oss-120b)
        # ───────────────────────────────────────────────────────────────────────
        groq_err_reason = None
        groq_retry_after = None

        if self.groq_api_key:
            try:
                from openai import OpenAI
                client = OpenAI(
                    base_url=self.groq_base_url,
                    api_key=self.groq_api_key
                )

                messages = [
                    {"role": "system", "content": get_system_prompt()},
                    {"role": "user", "content": user_message}
                ]

                for step in range(4):
                    calls_used += 1

                    def call_groq():
                        params = {
                            "model": self.groq_model,
                            "messages": messages,
                            "tools": OPENAI_TOOLS,
                            "tool_choice": "auto",
                            "temperature": 0.2,
                            "max_tokens": 800
                        }
                        try:
                            p_copy = dict(params)
                            p_copy["reasoning_effort"] = "low"
                            return client.chat.completions.create(**p_copy)
                        except TypeError:
                            try:
                                p_copy = dict(params)
                                p_copy["extra_body"] = {"reasoning_effort": "low"}
                                return client.chat.completions.create(**p_copy)
                            except Exception:
                                return client.chat.completions.create(**params)
                        except Exception as e_re:
                            e_str = str(e_re).lower()
                            if "reasoning_effort" in e_str or "unrecognized" in e_str or "unknown" in e_str:
                                return client.chat.completions.create(**params)
                            raise e_re

                    try:
                        resp = call_groq()
                    except Exception as call_err:
                        is_429 = "429" in str(call_err) or "rate" in str(call_err).lower()
                        ra = extract_retry_after(call_err) if is_429 else None
                        if is_429 and ra is not None and ra <= 10.0:
                            print(f"[RateLimit 429] Provider: groq | retry-after: {ra:.1f}s <= 10s. Waiting once and retrying...", flush=True)
                            time.sleep(ra)
                            resp = call_groq()
                        else:
                            raise call_err

                    usage = getattr(resp, "usage", None)
                    p_tok = getattr(usage, "prompt_tokens", 0) if usage else 0
                    c_tok = getattr(usage, "completion_tokens", 0) if usage else 0
                    t_tok = getattr(usage, "total_tokens", 0) if usage else (p_tok + c_tok)

                    total_prompt_tokens += p_tok
                    total_completion_tokens += c_tok
                    total_request_tokens += t_tok

                    print(f"  [Token Usage] Provider: groq | Model: {self.groq_model} | Call #{calls_used} -> Prompt: {p_tok}, Completion: {c_tok}, Total: {t_tok}", flush=True)

                    choice = resp.choices[0]
                    msg_obj = choice.message

                    if msg_obj.tool_calls:
                        messages.append(msg_obj)
                        for tc in msg_obj.tool_calls:
                            t_name = tc.function.name
                            try:
                                t_args = json.loads(tc.function.arguments or "{}")
                            except Exception:
                                t_args = {}
                            _, tool_view = execute_tool(t_name, t_args)
                            messages.append({
                                "role": "tool",
                                "tool_call_id": tc.id,
                                "name": t_name,
                                "content": json.dumps(tool_view)
                            })
                    else:
                        final_text = msg_obj.content or ""
                        print(f"  [Request Tokens] Total Calls: {calls_used} | Prompt: {total_prompt_tokens} | Completion: {total_completion_tokens} | Total: {total_request_tokens}", flush=True)
                        
                        pe = policy_event_holder["event"]
                        return {
                            "model_provider": "groq",
                            "model_name": self.groq_model,
                            "llm_unavailable": False,
                            "response": final_text,
                            "trace": trace,
                            "policy_decision": pe.get("decision") if pe else None,
                            "cedar_engine": pe.get("cedar_engine") if pe else None,
                            "policy_event": pe,
                            "calls_used": calls_used,
                            "prompt_tokens": total_prompt_tokens,
                            "completion_tokens": total_completion_tokens,
                            "total_tokens": total_request_tokens
                        }

            except Exception as e_groq:
                groq_retry_after = extract_retry_after(e_groq)
                groq_err_reason = f"Groq Error: {type(e_groq).__name__}: {str(e_groq)[:100]}"
                print(f"[Provider Fallback] Groq failed ({groq_err_reason}). Moving to Gemini...", flush=True)
        else:
            groq_err_reason = "OPENAI_COMPAT_API_KEY not configured"

        # ───────────────────────────────────────────────────────────────────────
        # PROVIDER 2: Google Gemini (Fallback)
        # ───────────────────────────────────────────────────────────────────────
        gemini_err_reason = None
        gemini_retry_after = None

        if self.gemini_api_key:
            try:
                from google import genai
                from google.genai import types

                client_gemini = genai.Client(api_key=self.gemini_api_key)

                gemini_calls = 0
                gemini_prompt_tokens = 0
                gemini_comp_tokens = 0
                gemini_total_tokens = 0

                def tool_get_flood_status(segment_id: str) -> str:
                    _, view = execute_tool("get_flood_status", {"segment_id": segment_id})
                    return json.dumps(view)

                def tool_compute_safe_route(origin_node: int, destination_node: int) -> str:
                    _, view = execute_tool("compute_safe_route", {"origin_node": origin_node, "destination_node": destination_node})
                    return json.dumps(view)

                def tool_send_alert(segment_id: str, message: str) -> str:
                    _, view = execute_tool("send_alert", {"segment_id": segment_id, "message": message})
                    return json.dumps(view)

                config = types.GenerateContentConfig(
                    system_instruction=get_system_prompt(),
                    temperature=0.2,
                    max_output_tokens=800,
                    tools=[tool_get_flood_status, tool_compute_safe_route, tool_send_alert]
                )

                def call_gemini():
                    return client_gemini.models.generate_content(
                        model=self.gemini_model,
                        contents=user_message,
                        config=config
                    )

                try:
                    resp_gemini = call_gemini()
                except Exception as g_err:
                    is_429 = "429" in str(g_err) or "RESOURCE_EXHAUSTED" in str(g_err)
                    gra = extract_retry_after(g_err) if is_429 else None
                    if is_429 and gra is not None and gra <= 10.0:
                        print(f"[RateLimit 429] Provider: gemini | retry-after: {gra:.1f}s <= 10s. Waiting once and retrying...", flush=True)
                        time.sleep(gra)
                        resp_gemini = call_gemini()
                    else:
                        raise g_err

                gemini_calls += 1
                usage_meta = getattr(resp_gemini, "usage_metadata", None)
                p_tok = getattr(usage_meta, "prompt_token_count", 0) if usage_meta else 0
                c_tok = getattr(usage_meta, "candidates_token_count", 0) if usage_meta else 0
                t_tok = getattr(usage_meta, "total_token_count", 0) if usage_meta else (p_tok + c_tok)

                gemini_prompt_tokens += p_tok
                gemini_comp_tokens += c_tok
                gemini_total_tokens += t_tok

                print(f"  [Token Usage] Provider: gemini | Model: {self.gemini_model} | Call #1 -> Prompt: {p_tok}, Completion: {c_tok}, Total: {t_tok}", flush=True)
                print(f"  [Request Tokens] Total Calls: {gemini_calls} | Prompt: {gemini_prompt_tokens} | Completion: {gemini_comp_tokens} | Total: {gemini_total_tokens}", flush=True)

                final_text = getattr(resp_gemini, "text", "") or ""
                pe = policy_event_holder["event"]
                return {
                    "model_provider": "gemini",
                    "model_name": self.gemini_model,
                    "llm_unavailable": False,
                    "response": final_text,
                    "trace": trace,
                    "policy_decision": pe.get("decision") if pe else None,
                    "cedar_engine": pe.get("cedar_engine") if pe else None,
                    "policy_event": pe,
                    "calls_used": gemini_calls,
                    "prompt_tokens": gemini_prompt_tokens,
                    "completion_tokens": gemini_comp_tokens,
                    "total_tokens": gemini_total_tokens
                }

            except Exception as e_gemini:
                gemini_retry_after = extract_retry_after(e_gemini)
                gemini_err_reason = f"Gemini Error: {type(e_gemini).__name__}: {str(e_gemini)[:100]}"
                print(f"[Provider Fallback] Gemini failed ({gemini_err_reason})", flush=True)
        else:
            gemini_err_reason = "GEMINI_API_KEY not configured"

        # ───────────────────────────────────────────────────────────────────────
        # ALL PROVIDERS FAILED -> Return llm_unavailable=True with deterministic fallback
        # ───────────────────────────────────────────────────────────────────────
        combined_reason = f"{groq_err_reason}; {gemini_err_reason}"
        active_retry_after = groq_retry_after or gemini_retry_after or 15.0

        return self._handle_llm_unavailable(
            user_message=user_message,
            reason=combined_reason,
            retry_after=active_retry_after,
            trace=trace
        )

    def _handle_llm_unavailable(
        self,
        user_message: str,
        reason: str,
        retry_after: Optional[float],
        trace: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Graceful degradation state when all LLMs fail. Executes deterministic rule-based dispatch.
        """
        trace.append({
            "stage": "fallback",
            "reason": reason,
            "retry_after": retry_after,
            "action": "Engaging deterministic rule-based dispatch fallback"
        })

        policy_event = None
        lower_msg = user_message.lower()

        if "alert" in lower_msg or "broadcast" in lower_msg or "evacuation" in lower_msg:
            seg_id = None
            m = re.search(r"(\d+_\d+_\d+)", user_message)
            if m:
                seg_id = m.group(1)
            elif "sansad" in lower_msg or "block" in lower_msg or "low" in lower_msg:
                seg_id = "5799663725_4083435383_0"
            else:
                seg_id = "9789474393_9789474394_0"

            alert_res = raw_send_alert(segment_id=seg_id, message=f"Urgent flood hazard broadcast: {seg_id}")
            policy_event = alert_res
            trace.append({"stage": "tool_result", "tool": "send_alert", "output": alert_res})

            if alert_res.get("decision") == "ALLOW":
                fallback_response = (
                    f"[FALLBACK MODE - Cedar Authorized via {alert_res.get('cedar_engine')}] Emergency evacuation alert "
                    f"authorized for {alert_res.get('display_name')} (Sentinel-1 SAR confirmed: {alert_res.get('flood_pct')}%). "
                    f"SNS Message ID: {alert_res.get('sns_message_id')}."
                )
            else:
                fallback_response = (
                    f"[FALLBACK MODE - Cedar Blocked via {alert_res.get('cedar_engine')}] Public alert denied: "
                    f"{alert_res.get('display_name')} flood confidence {alert_res.get('flood_pct')}% is below 85% requirement."
                )

        elif "route" in lower_msg or "ambulance" in lower_msg:
            orig = 838633253
            dest = 458640629
            route_res = raw_compute_safe_route(orig, dest)
            trace.append({"stage": "tool_result", "tool": "compute_safe_route", "output": route_res})
            safe_km = route_res.get("safe_route", {}).get("distance_km")
            detour_km = route_res.get("safe_route", {}).get("detour_km", 0.0)
            fallback_response = (
                f"[FALLBACK MODE] Safe ambulance corridor calculated: {safe_km} km to Lok Nayak Hospital "
                f"(Detour: {detour_km:+.2f} km) bypassing all flooded segments."
            )
        else:
            fallback_response = "[FALLBACK MODE] Operational flood dispatch online. Ready to compute routes or evaluate alert policies."

        return {
            "model_provider": None,
            "model_name": None,
            "llm_unavailable": True,
            "reason": reason,
            "retry_after": retry_after,
            "response": fallback_response,
            "trace": trace,
            "policy_decision": policy_event.get("decision") if policy_event else None,
            "cedar_engine": policy_event.get("cedar_engine") if policy_event else None,
            "policy_event": policy_event,
            "calls_used": 0,
            "prompt_tokens": 0,
            "completion_tokens": 0,
            "total_tokens": 0
        }


def run_cli():
    parser = argparse.ArgumentParser(description="AquaTwin Dispatch Agent CLI")
    parser.add_argument(
        "--pace",
        type=float,
        default=30.0,
        help="Seconds to wait between test scenarios (default: 30)"
    )
    args = parser.parse_args()

    print("=" * 78)
    print("  AquaTwin Dispatch Agent CLI (Groq gpt-oss-120b -> Gemini Fallback)")
    print(f"  Execution pacing between scenarios: {args.pace:.1f}s")
    print("=" * 78)
    agent = AquaTwinAgent()

    test_queries = [
        ("Ambulance Route Request",
         "Check flood status and route ambulance from Near Velodrome Road to Lok Nayak Hospital."),
        ("Blocked Alert Request (Model segment, low probability)",
         "Dispatch emergency evacuation alert for Sansad Marg segment 5799663725_4083435383_0."),
        ("Allowed Alert Request (Sentinel-1 SAR confirmed, >85%)",
         "Broadcast emergency flood alert for confirmed high-risk radar segment 9789474393_9789474394_0.")
    ]

    for i, (title, q) in enumerate(test_queries, 1):
        print(f"\n[{i}/3] Scenario: {title}")
        print(f"    Query       : {q}")
        t0 = time.time()
        res = agent.run(q)
        duration = time.time() - t0

        print(f"    Provider    : {res.get('model_provider') or 'None (Fallback)'}")
        print(f"    Model       : {res.get('model_name') or 'Rule-based'}")
        print(f"    Calls Used  : {res.get('calls_used', 0)}")
        print(f"    Total Tokens: {res.get('total_tokens', 0)} (Prompt: {res.get('prompt_tokens', 0)}, Completion: {res.get('completion_tokens', 0)})")
        print(f"    Unavailable : {res.get('llm_unavailable')}")
        if res.get("llm_unavailable"):
            print(f"    Reason      : {res.get('reason')}")
            print(f"    Retry After : {res.get('retry_after')}s")
        if res.get("policy_decision"):
            pe = res.get("policy_event") or {}
            print(f"    Policy Gate : {res.get('policy_decision')} ({pe.get('ui_flash')}) via {res.get('cedar_engine')}")
            if pe.get("policy_reason"):
                print(f"    Gate Reason : {pe.get('policy_reason')}")
        print(f"    Elapsed     : {duration:.2f}s")
        print(f"    Response    :\n      {res.get('response')}\n")

        # Pacing between scenarios
        if i < len(test_queries) and args.pace > 0:
            print(f"    Waiting {args.pace:.1f} seconds before next scenario...", flush=True)
            time.sleep(args.pace)

    print("=" * 78)


if __name__ == "__main__":
    run_cli()
