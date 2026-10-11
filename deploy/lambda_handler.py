# -*- coding: utf-8 -*-
"""
deploy/lambda_handler.py
────────────────────────
AWS Lambda entrypoint providing the AquaTwin HTTP API for:
  - POST /chat  : Agent dispatch reasoning and tool orchestration
  - GET  /state : Hydrology stats, demo segments, and places
  - POST /route : Deterministic NetworkX routing calculation

Includes full CORS headers for API Gateway & Amplify / CloudFront frontend.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env", override=False)
except ImportError:
    pass

from agent.handler import AquaTwinAgent
from agent.tools import compute_safe_route
from cedar.evaluator import get_evaluator

OUT_DIR = ROOT_DIR / "prep" / "out"

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Content-Type": "application/json"
}

_AGENT_INSTANCE = None


def get_agent():
    global _AGENT_INSTANCE
    if _AGENT_INSTANCE is None:
        _AGENT_INSTANCE = AquaTwinAgent()
    return _AGENT_INSTANCE


def load_json_file(path: Path) -> Any:
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def handle_state() -> Dict[str, Any]:
    stats = load_json_file(OUT_DIR / "stats.json")
    demo = load_json_file(OUT_DIR / "demo_segments.json")
    places = load_json_file(OUT_DIR / "places.json")
    params = load_json_file(OUT_DIR / "routing_params.json")

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps({
            "stats": stats,
            "demo_segments": demo,
            "places": places,
            "routing_params": params
        })
    }


def handle_chat(body: Dict[str, Any]) -> Dict[str, Any]:
    message = body.get("message", "")
    agent = get_agent()
    result = agent.run(message)

    return {
        "statusCode": 200,
        "headers": CORS_HEADERS,
        "body": json.dumps(result)
    }


def handle_route(body: Dict[str, Any]) -> Dict[str, Any]:
    origin_node = body.get("origin_node", 838633253)
    dest_node = body.get("destination_node", 458640629)

    res = compute_safe_route(origin_node, dest_node)
    return {
        "statusCode": 200 if res.get("success") else 400,
        "headers": CORS_HEADERS,
        "body": json.dumps(res)
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """AWS Lambda entry point for API Gateway proxy integration."""
    http_method = event.get("httpMethod") or event.get("requestContext", {}).get("http", {}).get("method", "GET")
    path = event.get("path") or event.get("rawPath", "/")

    # Preflight CORS
    if http_method == "OPTIONS":
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({"status": "ok"})
        }

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
        except Exception:
            body = {}

    if path.endswith("/chat") and http_method == "POST":
        return handle_chat(body)
    elif path.endswith("/route") and http_method == "POST":
        return handle_route(body)
    elif path.endswith("/state") or path == "/" or path.endswith("/api"):
        return handle_state()
    else:
        return {
            "statusCode": 404,
            "headers": CORS_HEADERS,
            "body": json.dumps({"error": f"Path '{path}' not found"})
        }


# Local standalone development server (WSGI / HTTP)
if __name__ == "__main__":
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class LocalDevServer(BaseHTTPRequestHandler):
        def _set_headers(self, status=200):
            self.send_response(status)
            for k, v in CORS_HEADERS.items():
                self.send_header(k, v)
            self.end_headers()

        def do_OPTIONS(self):
            self._set_headers(200)

        def do_GET(self):
            event = {"httpMethod": "GET", "path": self.path}
            resp = lambda_handler(event, None)
            self._set_headers(resp["statusCode"])
            self.wfile.write(resp["body"].encode("utf-8"))

        def do_POST(self):
            length = int(self.headers.get("content-length", 0))
            data = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            event = {"httpMethod": "POST", "path": self.path, "body": data}
            resp = lambda_handler(event, None)
            self._set_headers(resp["statusCode"])
            self.wfile.write(resp["body"].encode("utf-8"))

    port = int(os.environ.get("PORT", 8000))
    print(f"Starting AquaTwin local API server on http://localhost:{port} ...")
    server = HTTPServer(("0.0.0.0", port), LocalDevServer)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server.")
