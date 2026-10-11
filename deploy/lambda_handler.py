# -*- coding: utf-8 -*-
"""
deploy/lambda_handler.py
────────────────────────
AWS Lambda entrypoint providing the AquaTwin HTTP API for:
  - GET  /health : Health check and service status
  - GET  /state  : Hydrology stats, demo segments, and places
  - POST /chat   : Agent dispatch reasoning and tool orchestration
  - POST /route  : Deterministic NetworkX routing calculation

Supports dynamic loading & caching from Amazon S3 (DATA_BUCKET / DATA_PREFIX)
with fallback to local bundle files. Includes full CORS headers for API Gateway & Amplify.
"""

import os
import sys
import json
from pathlib import Path
from typing import Dict, Any, Optional

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

_AGENT_INSTANCE = None
_DATA_CACHE: Dict[str, Any] = {}


def get_cors_headers() -> Dict[str, str]:
    allowed_origin = os.environ.get("ALLOWED_ORIGIN", "*").strip() or "*"
    return {
        "Access-Control-Allow-Origin": allowed_origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Content-Type": "application/json"
    }


def get_agent():
    global _AGENT_INSTANCE
    if _AGENT_INSTANCE is None:
        _AGENT_INSTANCE = AquaTwinAgent()
    return _AGENT_INSTANCE


def load_dataset(filename: str) -> Any:
    """
    Loads dataset file with in-memory caching.
    Tries Amazon S3 first if DATA_BUCKET is configured, then falls back to local bundle.
    """
    global _DATA_CACHE
    if filename in _DATA_CACHE:
        return _DATA_CACHE[filename]

    bucket = os.environ.get("DATA_BUCKET", "").strip()
    prefix = os.environ.get("DATA_PREFIX", "data/").strip()
    region = os.environ.get("AWS_REGION", "us-east-1").strip()

    if bucket:
        try:
            import boto3
            s3 = boto3.client("s3", region_name=region)
            s3_key = f"{prefix}{filename}"
            obj = s3.get_object(Bucket=bucket, Key=s3_key)
            data = json.loads(obj["Body"].read().decode("utf-8"))
            _DATA_CACHE[filename] = data
            return data
        except Exception as e:
            print(f"[Warning] S3 fetch failed for s3://{bucket}/{prefix}{filename}: {e}. Falling back to local file.")

    # Local fallback
    local_path = OUT_DIR / filename
    if local_path.exists():
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                _DATA_CACHE[filename] = data
                return data
        except Exception as e:
            print(f"[Warning] Failed loading local {local_path}: {e}")

    return {}


def handle_health() -> Dict[str, Any]:
    bucket = os.environ.get("DATA_BUCKET", "").strip()
    return {
        "statusCode": 200,
        "headers": get_cors_headers(),
        "body": json.dumps({
            "status": "healthy",
            "service": "aquatwin-api",
            "region": os.environ.get("AWS_REGION", "us-east-1"),
            "data_source": f"s3://{bucket}" if bucket else "local"
        })
    }


def handle_state() -> Dict[str, Any]:
    stats = load_dataset("stats.json")
    demo = load_dataset("demo_segments.json")
    places = load_dataset("places.json")
    params = load_dataset("routing_params.json")

    return {
        "statusCode": 200,
        "headers": get_cors_headers(),
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
        "headers": get_cors_headers(),
        "body": json.dumps(result)
    }


def handle_route(body: Dict[str, Any]) -> Dict[str, Any]:
    origin_node = body.get("origin_node", 838633253)
    dest_node = body.get("destination_node", 458640629)

    res = compute_safe_route(origin_node, dest_node)
    return {
        "statusCode": 200 if res.get("success") else 400,
        "headers": get_cors_headers(),
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
            "headers": get_cors_headers(),
            "body": json.dumps({"status": "ok"})
        }

    body = {}
    if event.get("body"):
        try:
            body = json.loads(event["body"]) if isinstance(event["body"], str) else event["body"]
        except Exception:
            body = {}

    if path.endswith("/health"):
        return handle_health()
    elif path.endswith("/chat") and http_method == "POST":
        return handle_chat(body)
    elif path.endswith("/route") and http_method == "POST":
        return handle_route(body)
    elif path.endswith("/state") or path == "/" or path.endswith("/api"):
        return handle_state()
    else:
        return {
            "statusCode": 404,
            "headers": get_cors_headers(),
            "body": json.dumps({"error": f"Path '{path}' not found"})
        }


# Local standalone development server (WSGI / HTTP)
if __name__ == "__main__":
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class LocalDevServer(BaseHTTPRequestHandler):
        def _set_headers(self, status=200):
            self.send_response(status)
            for k, v in get_cors_headers().items():
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
