# -*- coding: utf-8 -*-
"""
Copies static hydrology datasets from prep/out to frontend/public/data.
"""
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "prep" / "out"
DST_DIR = ROOT_DIR / "frontend" / "public" / "data"

DST_DIR.mkdir(parents=True, exist_ok=True)

files = [
    "flood_extent.geojson",
    "roads_scored.json",
    "places.json",
    "demo_segments.json",
    "routing_params.json",
    "stats.json",
    "preview.png"
]

for f in files:
    src = SRC_DIR / f
    dst = DST_DIR / f
    if src.exists():
        shutil.copy2(src, dst)
        print(f"Copied {f} ({src.stat().st_size / 1024:.1f} KB)")
    else:
        print(f"Missing: {f}")

print("Frontend data sync complete.")
