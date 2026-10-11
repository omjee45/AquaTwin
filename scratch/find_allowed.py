import json
from pathlib import Path

ROADS_PATH = Path("prep/out/roads_scored.json")
with open(ROADS_PATH, "r", encoding="utf-8") as f:
    data = json.load(f)

edges = data.get("edges", [])
above_85 = [
    e for e in edges
    if e.get("flood_probability", 0) > 0.85 and e.get("validation_source") == "Sentinel-1"
]

print(f"Total above 0.85 with Sentinel-1: {len(above_85)}")
for e in above_85[:5]:
    eid = e.get("id", f"{e['u']}_{e['v']}_0")
    print(f"ID: {eid}, Prob: {e.get('flood_probability')}, Source: {e.get('validation_source')}, Name: {e.get('display_name') or e.get('name')}")
