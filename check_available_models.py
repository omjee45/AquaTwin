# -*- coding: utf-8 -*-
"""
check_available_models.py
Probes available Google Gemini models for the current API key.
Never prints or logs API keys.
"""

import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT_DIR / ".env", override=False)
except ImportError:
    pass

api_key = os.environ.get("GEMINI_API_KEY", "").strip()
if not api_key:
    print("Error: GEMINI_API_KEY is not set.")
    sys.exit(1)

try:
    from google import genai
    client = genai.Client(api_key=api_key)
    print("=" * 70)
    print("  Listing Models Available to Current GEMINI_API_KEY")
    print("=" * 70)

    models_found = []
    for m in client.models.list():
        m_name = getattr(m, "name", "")
        if "gemini" in m_name:
            models_found.append(m_name)

    print(f"Total Gemini models found: {len(models_found)}\n")

    # Probe each model with a quick ping
    for m_name in models_found:
        short_name = m_name.replace("models/", "")
        try:
            resp = client.models.generate_content(
                model=short_name,
                contents="Say 'OK'"
            )
            reply = resp.text.strip() if resp and resp.text else "No text"
            print(f"[OK]   {short_name:<30} -> Response: {reply[:30]}")
        except Exception as e:
            err_type = type(e).__name__
            err_str = str(e)
            if "RESOURCE_EXHAUSTED" in err_str or "429" in err_str:
                print(f"[QUOTA] {short_name:<30} -> 429 Quota Exceeded")
            elif "NOT_FOUND" in err_str or "404" in err_str:
                print(f"[404]   {short_name:<30} -> Not Found")
            else:
                print(f"[FAIL]  {short_name:<30} -> {err_type}: {err_str[:60]}")

    print("=" * 70)

except Exception as e:
    print(f"Error querying Gemini API: {type(e).__name__}: {e}")
