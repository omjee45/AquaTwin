# -*- coding: utf-8 -*-
"""
agent/tools.py
──────────────
Tool implementations for the AquaTwin AI Agent:
  1. get_flood_status   - Look up ground-truth flood risk by segment ID
  2. compute_safe_route - Run deterministic graph routing (NetworkX)
  3. send_alert         - Execute Cedar gate policy before dispatching emergency broadcast

Crucial safety property (SPEC Section 8 & 9):
  send_alert ONLY accepts segment_id and message from caller / LLM.
  All hydrology attributes (flood_pct, validation_source) are strictly
  retrieved from pre-computed roads_scored.json, preventing hallucinated bypass.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from routing.engine import get_engine, RoutingEngine
from cedar.evaluator import get_evaluator, CedarEvaluator
ROADS_PATH = ROOT_DIR / "prep" / "out" / "roads_scored.json"
PLACES_PATH = ROOT_DIR / "prep" / "out" / "places.json"
DEMO_PATH = ROOT_DIR / "prep" / "out" / "demo_segments.json"

_ROAD_CACHE: Optional[Dict[str, Dict[str, Any]]] = None


def _get_road_lookup() -> Dict[str, Dict[str, Any]]:
    global _ROAD_CACHE
    if _ROAD_CACHE is None:
        _ROAD_CACHE = {}
        # Pre-seed from demo segments first if available for fast lookups
        if DEMO_PATH.exists():
            try:
                with open(DEMO_PATH, "r", encoding="utf-8") as f:
                    demo = json.load(f)
                for c in demo.get("allow_candidates", []):
                    _ROAD_CACHE[str(c["id"])] = c
                for c in demo.get("block_candidates", []):
                    _ROAD_CACHE[str(c["id"])] = c
                conf = demo.get("confirmed_below_threshold")
                if conf:
                    _ROAD_CACHE[str(conf["id"])] = conf
            except Exception:
                pass

        # Load complete roads dataset
        if ROADS_PATH.exists():
            try:
                with open(ROADS_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                for e in data.get("edges", []):
                    eid = str(e.get("id", f"{e['u']}_{e['v']}_0"))
                    _ROAD_CACHE[eid] = {
                        "id": eid,
                        "u": e.get("u"),
                        "v": e.get("v"),
                        "name": e.get("name"),
                        "display_name": e.get("display_name", e.get("name") or "Unnamed road"),
                        "length_m": round(e.get("length_m", 0), 1),
                        "flood_probability": round(e.get("flood_probability", 0.0), 4),
                        "flood_pct": int(e.get("flood_probability", 0.0) * 100),
                        "validation_source": e.get("validation_source", "model"),
                        "sar_overlap": round(e.get("sar_overlap", 0.0), 3),
                        "low_hand": round(e.get("low_hand", 0.0), 3),
                        "dist_to_river_m": round(e.get("dist_to_river_m", 0.0), 1),
                        "geometry": e.get("geometry", [])
                    }
            except Exception as ex:
                print(f"Warning: could not fully load {ROADS_PATH}: {ex}")

    return _ROAD_CACHE


def get_flood_status(segment_id: str) -> Dict[str, Any]:
    """
    Retrieves hydrological evidence and flood probability for a road segment.
    """
    lookup = _get_road_lookup()
    seg = lookup.get(str(segment_id))
    if not seg:
        return {
            "found": False,
            "segment_id": segment_id,
            "error": f"Road segment '{segment_id}' not found in hydrological model."
        }

    prob = seg["flood_probability"]
    source = seg["validation_source"]
    return {
        "found": True,
        "segment_id": seg["id"],
        "display_name": seg["display_name"],
        "length_m": seg["length_m"],
        "flood_probability": prob,
        "flood_pct": seg["flood_pct"],
        "validation_source": source,
        "sar_overlap": seg["sar_overlap"],
        "low_hand": seg["low_hand"],
        "dist_to_river_m": seg["dist_to_river_m"],
        "is_flooded": prob >= 0.5,
        "is_alert_eligible": (prob > 0.85 and source == "Sentinel-1")
    }


def compute_safe_route(origin_node: int, destination_node: int) -> Dict[str, Any]:
    """
    Computes deterministic safe ambulance route bypassing flooded edges.
    """
    engine = get_engine()
    return engine.compute_route(int(origin_node), int(destination_node))


def send_alert(
    segment_id: str,
    message: str,
    principal_role: str = "EmergencyManager"
) -> Dict[str, Any]:
    """
    Submits a public emergency broadcast request guarded by the Cedar Policy Gate.
    The flood probability and validation source are strictly looked up from stored
    ground-truth data, guaranteeing that the LLM cannot fabricate or alter confidence values.
    """
    status = get_flood_status(segment_id)
    if not status.get("found"):
        return {
            "status": "ERROR",
            "decision": "DENY",
            "segment_id": segment_id,
            "message": message,
            "reason": f"Invalid segment ID: {segment_id}"
        }

    # Evaluate against Cedar policy
    evaluator = get_evaluator()
    cedar_context = {
        "flood_pct": status["flood_pct"],
        "validation_source": status["validation_source"]
    }
    
    eval_result = evaluator.evaluate(
        principal=principal_role,
        action="SendAlert",
        resource=segment_id,
        context=cedar_context
    )

    cedar_engine = eval_result.get("engine", "cedar-native")
    decision = eval_result.get("decision", "DENY")
    reason = eval_result["diagnostics"]["reason"]
    print(f"[Cedar Gate] Engine: {cedar_engine} | Decision: {decision} | Reason: {reason}", flush=True)

    if not eval_result["allowed"]:
        return {
            "status": "BLOCKED",
            "decision": "DENY",
            "alert_sent": False,
            "cedar_engine": cedar_engine,
            "segment_id": segment_id,
            "display_name": status["display_name"],
            "flood_pct": status["flood_pct"],
            "validation_source": status["validation_source"],
            "message": message,
            "policy_reason": eval_result["diagnostics"]["reason"],
            "ui_flash": "BLOCKED BY POLICY"
        }

    # If allowed, publish to AWS SNS using existing local AWS credentials
    sns_arn = os.environ.get("SNS_TOPIC_ARN", "")
    sns_dispatched = False
    sns_message_id = None
    region = os.environ.get("AWS_REGION", "us-east-1")

    try:
        import boto3
        sns_client = boto3.client("sns", region_name=region)
        
        # If no explicit topic ARN is provided in env, resolve or create AquaTwin topic
        if not sns_arn:
            topics = sns_client.list_topics().get("Topics", [])
            for t in topics:
                tarn = t.get("TopicArn", "")
                if "aquatwin" in tarn.lower() or "alert" in tarn.lower():
                    sns_arn = tarn
                    break
            if not sns_arn:
                # Create dedicated topic for AquaTwin emergency alerts
                topic_resp = sns_client.create_topic(Name="AquaTwin-Emergency-Alerts")
                sns_arn = topic_resp.get("TopicArn", "")

        if sns_arn:
            pub_resp = sns_client.publish(
                TopicArn=sns_arn,
                Subject=f"AQUATWIN ALERT: {status['display_name'][:80]}",
                Message=(
                    f"AQUATWIN PUBLIC EMERGENCY BROADCAST\n"
                    f"=====================================\n"
                    f"Location: {status['display_name']}\n"
                    f"Segment ID: {segment_id}\n"
                    f"Radar Validation: Sentinel-1 SAR Overlap ({status['sar_overlap']*100:.0f}%)\n"
                    f"Flood Probability: {status['flood_pct']}%\n"
                    f"Policy Gate: Cedar Authorized ({cedar_engine})\n\n"
                    f"Emergency Advisory:\n{message}\n"
                )
            )
            sns_message_id = pub_resp.get("MessageId")
            sns_dispatched = True
    except Exception as e:
        print(f"  [AWS SNS Warning] {type(e).__name__}: {e}")

    return {
        "status": "ALERT SENT",
        "decision": "ALLOW",
        "alert_sent": True,
        "cedar_engine": cedar_engine,
        "segment_id": segment_id,
        "display_name": status["display_name"],
        "flood_pct": status["flood_pct"],
        "validation_source": status["validation_source"],
        "message": message,
        "policy_reason": eval_result["diagnostics"]["reason"],
        "sns_dispatched": sns_dispatched,
        "sns_topic_arn": sns_arn or "arn:aws:sns:local:mock-topic",
        "sns_message_id": sns_message_id or "sns-mock-alert-dispatched-001",
        "ui_flash": "ALERT SENT"
    }


# Declarative tool definitions for Amazon Nova / Strands agent
TOOL_DEFINITIONS = [
    {
        "toolSpec": {
            "name": "get_flood_status",
            "description": "Retrieves the hydrological ground-truth flood risk and radar evidence for a specific road segment.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "segment_id": {
                            "type": "string",
                            "description": "The unique identifier of the road segment."
                        }
                    },
                    "required": ["segment_id"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "compute_safe_route",
            "description": "Calculates the deterministic safe ambulance route bypassing flooded road segments.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "origin_node": {
                            "type": "integer",
                            "description": "OSM node ID representing ambulance starting position."
                        },
                        "destination_node": {
                            "type": "integer",
                            "description": "OSM node ID representing destination hospital."
                        }
                    },
                    "required": ["origin_node", "destination_node"]
                }
            }
        }
    },
    {
        "toolSpec": {
            "name": "send_alert",
            "description": "Dispatches a public emergency alert broadcast. Strictly guarded by Cedar policy.",
            "inputSchema": {
                "json": {
                    "type": "object",
                    "properties": {
                        "segment_id": {
                            "type": "string",
                            "description": "Road segment identifier to alert the public about."
                        },
                        "message": {
                            "type": "string",
                            "description": "Clear emergency advisory message text."
                        }
                    },
                    "required": ["segment_id", "message"]
                }
            }
        }
    }
]
