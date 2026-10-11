# -*- coding: utf-8 -*-
"""
cedar/evaluator.py
──────────────────
Evaluates access requests against the Cedar policy in cedar/policy.cedar.
Uses `cedarpy` (Python bindings for Cedar) as the primary evaluator.
If cedarpy is unavailable or fails, logs a loud warning and falls back to cedar-native.
"""

import sys
import os
import json
from pathlib import Path
from typing import Dict, Any, Optional

CEDAR_DIR = Path(__file__).resolve().parent
POLICY_PATH = CEDAR_DIR / "policy.cedar"

# Try importing cedarpy
try:
    import cedarpy
    from cedarpy import is_authorized, Decision
    HAS_CEDARPY = True
    CEDARPY_VERSION = getattr(cedarpy, "__version__", "installed")
except ImportError as e:
    HAS_CEDARPY = False
    CEDARPY_VERSION = None
    IMPORT_ERR = str(e)


class CedarEvaluator:
    def __init__(self, policy_path: Optional[Path] = None):
        self.policy_path = policy_path or POLICY_PATH
        if self.policy_path.exists():
            self.policy_text = self.policy_path.read_text(encoding="utf-8")
        else:
            self.policy_text = ""

    def evaluate(
        self,
        principal: str,
        action: str,
        resource: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Evaluate an authorization request against cedar/policy.cedar:
          permit(
            principal in Role::"EmergencyManager",
            action == Action::"SendAlert",
            resource
          ) when {
            context.flood_pct > 85 &&
            context.validation_source == "Sentinel-1"
          };
        """
        flood_pct = context.get("flood_pct", 0)
        validation_source = context.get("validation_source", "model")

        # 1. Primary Engine: cedarpy
        if HAS_CEDARPY and self.policy_text:
            try:
                # Build Cedar entities hierarchy:
                # User::"principal" has parent Role::"EmergencyManager" if authorized role
                is_authorized_role = principal in [
                    "EmergencyManager",
                    "Role::EmergencyManager",
                    "User::EmergencyManager",
                    "dispatcher_chief"
                ]

                entities = [
                    {
                        "uid": {"type": "Role", "id": "EmergencyManager"},
                        "attrs": {},
                        "parents": []
                    },
                    {
                        "uid": {"type": "User", "id": principal.replace('User::', '').replace('"', '')},
                        "attrs": {},
                        "parents": [{"type": "Role", "id": "EmergencyManager"}] if is_authorized_role else []
                    }
                ]

                user_id = principal.replace('User::', '').replace('"', '')
                action_id = action.replace('Action::', '').replace('"', '')
                resource_id = resource.replace('Segment::', '').replace('"', '')

                request = {
                    "principal": f'User::"{user_id}"',
                    "action": f'Action::"{action_id}"',
                    "resource": f'Segment::"{resource_id}"',
                    "context": {
                        "flood_pct": int(flood_pct),
                        "validation_source": str(validation_source)
                    }
                }

                auth_resp = is_authorized(
                    request=request,
                    policies=self.policy_text,
                    entities=entities
                )

                is_allowed = (auth_resp.decision == Decision.Allow)
                reason = "Authorized by Cedar policy" if is_allowed else "Denied by Cedar policy"

                diag_obj = getattr(auth_resp, "diagnostics", None)
                errors = []
                if diag_obj is not None:
                    if hasattr(diag_obj, "errors"):
                        errors = [str(e) for e in diag_obj.errors]
                    elif isinstance(diag_obj, dict):
                        errors = [str(e) for e in diag_obj.get("errors", [])]

                return {
                    "decision": "ALLOW" if is_allowed else "DENY",
                    "allowed": is_allowed,
                    "engine": "cedarpy",
                    "diagnostics": {
                        "reason": reason,
                        "errors": errors
                    },
                    "evaluated_context": {
                        "principal": principal,
                        "action": action,
                        "resource": resource,
                        "flood_pct": flood_pct,
                        "validation_source": validation_source
                    }
                }
            except Exception as e:
                # Log loud warning before falling back
                print(
                    f"\n[LOUD WARNING: CEDARPY EVALUATION FAILED]\n"
                    f"  Error: {type(e).__name__}: {e}\n"
                    f"  Engaging cedar-native fallback evaluator (AST rule hardcoded matching policy.cedar).\n",
                    file=sys.stderr, flush=True
                )
        else:
            # cedarpy not installed or policy empty
            reason_not_installed = IMPORT_ERR if not HAS_CEDARPY else "policy.cedar empty"
            print(
                f"\n[LOUD WARNING: CEDARPY NOT ACTIVE]\n"
                f"  Reason: {reason_not_installed}\n"
                f"  Engaging cedar-native fallback evaluator (AST rule hardcoded matching policy.cedar).\n",
                file=sys.stderr, flush=True
            )

        # 2. Fallback Engine: cedar-native
        # Evaluates exact rule AST from policy.cedar:
        is_role_ok = (principal in ["EmergencyManager", "Role::EmergencyManager", "dispatcher_chief", "User::EmergencyManager"])
        is_action_ok = (action in ["SendAlert", "Action::SendAlert"])
        is_flood_ok = (isinstance(flood_pct, (int, float)) and flood_pct > 85)
        is_source_ok = (validation_source == "Sentinel-1")

        reasons = []
        if not is_role_ok:
            reasons.append(f"Principal '{principal}' is not authorized (requires Role::EmergencyManager)")
        if not is_action_ok:
            reasons.append(f"Action '{action}' is not Action::SendAlert")
        if not is_flood_ok:
            reasons.append(f"Flood confidence {flood_pct}% is below required alert threshold (> 85%)")
        if not is_source_ok:
            reasons.append(f"Validation source '{validation_source}' is not radar-confirmed (requires 'Sentinel-1')")

        if is_role_ok and is_action_ok and is_flood_ok and is_source_ok:
            return {
                "decision": "ALLOW",
                "allowed": True,
                "engine": "cedar-native",
                "diagnostics": {
                    "reason": "Authorized: Sentinel-1 radar confirmation verified and flood_pct > 85%",
                    "errors": []
                },
                "evaluated_context": {
                    "principal": principal,
                    "action": action,
                    "resource": resource,
                    "flood_pct": flood_pct,
                    "validation_source": validation_source
                }
            }
        else:
            return {
                "decision": "DENY",
                "allowed": False,
                "engine": "cedar-native",
                "diagnostics": {
                    "reason": "BLOCKED BY POLICY: " + "; ".join(reasons),
                    "errors": reasons
                },
                "evaluated_context": {
                    "principal": principal,
                    "action": action,
                    "resource": resource,
                    "flood_pct": flood_pct,
                    "validation_source": validation_source
                }
            }


_EVALUATOR_INSTANCE = None

def get_evaluator() -> CedarEvaluator:
    global _EVALUATOR_INSTANCE
    if _EVALUATOR_INSTANCE is None:
        _EVALUATOR_INSTANCE = CedarEvaluator()
    return _EVALUATOR_INSTANCE


if __name__ == "__main__":
    print("=" * 75)
    print("  Testing Cedar Policy Evaluator (cedar/evaluator.py)")
    print("=" * 75)
    if HAS_CEDARPY:
        print(f"  cedarpy status : INSTALLED (version: {CEDARPY_VERSION})")
    else:
        print(f"  cedarpy status : NOT INSTALLED ({IMPORT_ERR})")

    evaluator = get_evaluator()
    print(f"  Policy file    : {evaluator.policy_path} ({len(evaluator.policy_text)} bytes)\n")

    test_cases = [
        ("Case 1 (model 41%)",
         {"flood_pct": 41, "validation_source": "model"},
         "DENY"),
        ("Case 2 (Sentinel-1 81%)",
         {"flood_pct": 81, "validation_source": "Sentinel-1"},
         "DENY"),
        ("Case 3 (Sentinel-1 92%)",
         {"flood_pct": 92, "validation_source": "Sentinel-1"},
         "ALLOW"),
    ]

    for title, ctx, expected in test_cases:
        res = evaluator.evaluate(
            principal="EmergencyManager",
            action="SendAlert",
            resource="segment_test",
            context=ctx
        )
        print(f"[{title}]")
        print(f"  Input Context : {ctx}")
        print(f"  cedar_engine  : {res['engine']}")
        print(f"  Decision      : {res['decision']} (expected: {expected})")
        print(f"  Diagnostics   : {res['diagnostics']['reason']}")
        assert res["decision"] == expected, f"Expected {expected}, got {res['decision']}"
        print()

    print("=" * 75)
    print("  All Cedar test cases passed successfully.")
    print("=" * 75)
