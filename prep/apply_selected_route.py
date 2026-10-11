# -*- coding: utf-8 -*-
"""
prep/apply_selected_route.py
────────────────────────────
Applies the user-selected Route 3 from pick_route2.py:
  1. Updates places.json with "Ambulance 4 start (Near Qutab Road)"
  2. Updates routing_params.json with the chosen route parameters
  3. Updates preview.png with default (dashed red) and safe (solid green) route overlays
"""

import json
import math
import heapq
import sys
import os
from collections import defaultdict
from pathlib import Path
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "prep" / "out"
ROADS_F = OUT / "roads_scored.json"
PLACES_F = OUT / "places.json"
PARAMS_F = OUT / "routing_params.json"
DEMO_F = OUT / "demo_segments.json"
PREVIEW_F = OUT / "preview.png"

FLOOD_THRESH = 0.5
ALERT_THRESH = 0.85
PENALTY_MULT = 4.0

def dijkstra(graph, source, targets=None, max_cost=None):
    dist = {source: 0.0}
    prev = {}
    pq = [(0.0, source)]
    found = set()

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")):
            continue
        if targets and u in targets:
            found.add(u)
            if found >= targets:
                break
        for v, w, _ in graph.get(u, []):
            nd = d + w
            if max_cost is not None and nd > max_cost:
                continue
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))

    return dist, prev

def reconstruct_path(prev, source, target):
    path = []
    cur = target
    while cur != source:
        path.append(cur)
        cur = prev.get(cur)
        if cur is None:
            return None
    path.append(source)
    path.reverse()
    return path

def path_model_risk_edges(path, edge_lookup):
    risk_edges = []
    for u, v in zip(path[:-1], path[1:]):
        e = edge_lookup.get((u, v)) or edge_lookup.get((v, u))
        if e:
            src = e.get("source", "model")
            p = e.get("flood_probability", 0.0)
            if src == "model" and 0.40 <= p < FLOOD_THRESH:
                risk_edges.append((u, v))
    return risk_edges

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

def nearest_named_road(node_id, node_pos, named_edges, radius_m=300.0):
    if node_id not in node_pos:
        return None
    lat0, lon0 = node_pos[node_id]
    best_name = None
    best_dist = radius_m
    for name, mlat, mlon in named_edges:
        d = haversine_m(lat0, lon0, mlat, mlon)
        if d < best_dist:
            best_dist = d
            best_name = name
    return best_name

def origin_label(node_id, node_pos, named_midpoints):
    name = nearest_named_road(node_id, node_pos, named_midpoints, 300.0)
    if name:
        return f"Near {name}"
    return f"Node {node_id}"

def apply_route(choice_idx=2): # 0-indexed: index 2 is Route 3
    print("=" * 75)
    print(f"  Applying User Selection: Route {choice_idx + 1}")
    print("=" * 75)

    with open(ROADS_F, encoding="utf-8") as f:
        roads_data = json.load(f)

    nodes_list = roads_data["nodes"]
    edges_list = roads_data["edges"]
    node_pos = {n["id"]: (n["lat"], n["lon"]) for n in nodes_list}

    graph_fwd = defaultdict(list)
    graph_safe = defaultdict(list)
    edge_flood = {}
    edge_lookup = {}
    named_midpoints = []

    for e in edges_list:
        u, v = e["u"], e["v"]
        length = e.get("length_m", 1.0) or 1.0
        prob = e.get("flood_probability", 0.0) or 0.0
        source = e.get("source", "model")
        name = e.get("name")

        edge_flood[(u, v)] = prob
        edge_lookup[(u, v)] = e

        if name and u in node_pos and v in node_pos:
            la, loa = node_pos[u]
            lb, lob = node_pos[v]
            named_midpoints.append((name, (la + lb) / 2, (loa + lob) / 2))

        graph_fwd[u].append((v, length, e))

        if prob >= FLOOD_THRESH:
            pass
        elif source == "model" and 0.40 <= prob < FLOOD_THRESH:
            graph_safe[u].append((v, length * PENALTY_MULT, e))
        else:
            graph_safe[u].append((v, length, e))

    with open(PLACES_F, encoding="utf-8") as f:
        places = json.load(f)

    hosp = [p for p in places if p.get("role") == "hospital_main"][0]
    hid = hosp["node_id"]
    hname = hosp["name"]

    # Reconstruct candidate origins exactly
    import random
    rng = random.Random(42)
    flooded_nodes = set()
    for (u, v), prob in edge_flood.items():
        if prob >= FLOOD_THRESH:
            flooded_nodes.add(u)
            flooded_nodes.add(v)

    proximity_origins = set()
    for nid, (nlat, nlon) in node_pos.items():
        for fn in flooded_nodes:
            if fn in node_pos:
                flat, flon = node_pos[fn]
                if haversine_m(nlat, nlon, flat, flon) <= 1000.0:
                    proximity_origins.add(nid)
                    break

    all_nodes = list(node_pos.keys())
    rng.shuffle(all_nodes)
    rand_origins = set(all_nodes[:3000])
    origins = proximity_origins | rand_origins

    # Reverse graphs
    graph_fwd_rev = defaultdict(list)
    for u, nbrs in graph_fwd.items():
        for v, w, e in nbrs:
            graph_fwd_rev[v].append((u, w, e))

    graph_safe_rev = defaultdict(list)
    for u, nbrs in graph_safe.items():
        for v, w, e in nbrs:
            graph_safe_rev[v].append((u, w, e))

    def_dist, def_prev = dijkstra(graph_fwd_rev, hid, max_cost=30_000.0)
    safe_dist, safe_prev = dijkstra(graph_safe_rev, hid, max_cost=30_000.0)

    task3_candidates = []
    for orig in origins:
        dd = def_dist.get(orig)
        sd = safe_dist.get(orig)
        if dd is None or sd is None:
            continue

        def_km = dd / 1000.0
        safe_km = sd / 1000.0

        if not (2.0 <= def_km <= 8.0) or not (2.0 <= safe_km <= 8.0):
            continue

        detour_km = safe_km - def_km
        if not (0.30 <= detour_km <= 3.0):
            continue

        def_path = reconstruct_path(def_prev, hid, orig)
        if not def_path or len(def_path) < 2:
            continue
        def_path = list(reversed(def_path))

        safe_path = reconstruct_path(safe_prev, hid, orig)
        if not safe_path or len(safe_path) < 2:
            continue
        safe_path = list(reversed(safe_path))

        if def_path == safe_path:
            continue

        risk_edges = path_model_risk_edges(def_path, edge_lookup)
        if len(risk_edges) < 3:
            continue

        first_prob = edge_flood.get((def_path[0], def_path[1]), 0.0)
        last_prob = edge_flood.get((def_path[-2], def_path[-1]), 0.0)
        if first_prob >= FLOOD_THRESH or last_prob >= FLOOD_THRESH:
            continue

        lbl = origin_label(orig, node_pos, named_midpoints)
        task3_candidates.append({
            "origin": orig,
            "label": lbl,
            "default_km": round(def_km, 3),
            "safe_km": round(safe_km, 3),
            "detour_km": round(detour_km, 3),
            "model_risk_edges": len(risk_edges),
            "def_path": def_path,
            "safe_path": safe_path
        })

    task3_candidates.sort(key=lambda x: (x["model_risk_edges"], x["detour_km"]), reverse=True)
    selected = task3_candidates[choice_idx]

    orig_id = selected["origin"]
    olat, olon = node_pos[orig_id]
    olabel = selected["label"]
    def_km = selected["default_km"]
    safe_km = selected["safe_km"]
    detour_km = selected["detour_km"]
    risk_edges_count = selected["model_risk_edges"]
    def_path = selected["def_path"]
    safe_path = selected["safe_path"]

    print(f"Selected Pair Details:")
    print(f"  Origin Node ID   : {orig_id}")
    print(f"  Origin Landmark  : {olabel}")
    print(f"  Coordinates      : lat={olat:.6f}, lon={olon:.6f}")
    print(f"  Hospital         : {hname} (Node {hid})")
    print(f"  Default Distance : {def_km:.3f} km")
    print(f"  Safe Distance    : {safe_km:.3f} km")
    print(f"  Detour           : {detour_km:+.3f} km")
    print(f"  Model Risk Edges : {risk_edges_count}\n")

    # 1. Update places.json
    places_updated = [p for p in places if p.get("role") != "ambulance_start"]
    places_updated.append({
        "id": "ambulance_1",
        "name": f"Ambulance 4 start  ({olabel})",
        "role": "ambulance_start",
        "node_id": orig_id,
        "lat": olat,
        "lon": olon
    })
    with open(PLACES_F, "w", encoding="utf-8") as f:
        json.dump(places_updated, f, indent=2, ensure_ascii=False)
    print("  v places.json updated with 'Ambulance 4 start'")

    # 2. Update routing_params.json
    params = {
        "seed": 42,
        "flood_threshold": FLOOD_THRESH,
        "alert_threshold": ALERT_THRESH,
        "route_min_km": 2.0,
        "route_max_km": 8.0,
        "rand_origin_count": 3000,
        "flood_origin_km": 1.0,
        "penalty_multiplier": PENALTY_MULT,
        "mode": "risk-weighted",
        "best_route": {
            "origin_node": orig_id,
            "origin_lat": olat,
            "origin_lon": olon,
            "hospital_node": hid,
            "hospital_name": hname,
            "default_km": def_km,
            "safe_km": safe_km,
            "detour_km": detour_km,
            "model_risk_edges": risk_edges_count,
            "flooded_segments": 0
        }
    }
    with open(PARAMS_F, "w", encoding="utf-8") as f:
        json.dump(params, f, indent=2, ensure_ascii=False)
    print("  v routing_params.json updated with selected route parameters")

    # Update demo_segments.json ambulance_route block
    if DEMO_F.exists():
        with open(DEMO_F, "r", encoding="utf-8") as f:
            demo_data = json.load(f)
        demo_data["ambulance_route"] = {
            "origin_node": orig_id,
            "hospital_node": hid,
            "hospital_name": hname,
            "default_km": def_km,
            "safe_km": safe_km,
            "detour_km": detour_km,
            "flooded_segments": 0,
            "model_risk_edges": risk_edges_count
        }
        with open(DEMO_F, "w", encoding="utf-8") as f:
            json.dump(demo_data, f, indent=2, ensure_ascii=False)
        print("  v demo_segments.json ambulance_route block updated")

    # 3. Regenerate preview.png
    print("  Generating preview.png with default & safe route overlay...")
    fig, ax = plt.subplots(figsize=(11, 10), dpi=140)
    ax.set_facecolor("#0a0e17")
    fig.patch.set_facecolor("#0a0e17")

    # Roads
    cmap_ = plt.cm.RdYlGn_r
    norm_ = mcolors.Normalize(vmin=0, vmax=1)
    for e in edges_list:
        c = e.get("geometry", [])
        if len(c) < 2:
            continue
        p = e.get("flood_probability", 0.0)
        if p < 0.5:
            ax.plot([x[0] for x in c], [x[1] for x in c],
                    color=cmap_(norm_(p)), linewidth=0.5, alpha=0.5, zorder=3)

    # Flooded roads (>= 0.5)
    fl_done = False
    for e in edges_list:
        p = e.get("flood_probability", 0.0)
        if p >= 0.5:
            c = e.get("geometry", [])
            if len(c) < 2: continue
            ax.plot([x[0] for x in c], [x[1] for x in c],
                    color="#ef4444", linewidth=2.6, alpha=0.9, zorder=4,
                    label="Flooded Roads (Risk ≥ 0.5)" if not fl_done else "")
            fl_done = True

    # Overlay routes
    d_pts = [(node_pos[n][1], node_pos[n][0]) for n in def_path] # lon, lat
    s_pts = [(node_pos[n][1], node_pos[n][0]) for n in safe_path]

    ax.plot([p[0] for p in d_pts], [p[1] for p in d_pts],
            color="#f87171", linestyle="--", linewidth=2.8, alpha=0.95, zorder=6,
            label=f"Default Route ({def_km:.2f} km, {risk_edges_count} risk edges)")

    ax.plot([p[0] for p in s_pts], [p[1] for p in s_pts],
            color="#10b981", linestyle="-", linewidth=2.5, alpha=0.95, zorder=7,
            label=f"Safe Reroute ({safe_km:.2f} km, Detour: +{detour_km:.2f} km)")

    # Plot hospital and ambulance start
    ax.plot(node_pos[hid][1], node_pos[hid][0], "P", color="#10b981", markersize=13,
            markeredgecolor="white", markeredgewidth=1.2, zorder=8)
    ax.annotate(hname, (node_pos[hid][1], node_pos[hid][0]), xytext=(7, 7), textcoords="offset points",
                fontsize=7.5, fontweight="bold", color="#10b981", zorder=9,
                bbox=dict(boxstyle="round,pad=0.2", fc="#0a0e17", ec="#10b981", alpha=0.85))

    ax.plot(olon, olat, "*", color="#f97316", markersize=14,
            markeredgecolor="white", markeredgewidth=1.0, zorder=8)
    ax.annotate(f"Ambulance Start ({olabel})", (olon, olat), xytext=(7, 7), textcoords="offset points",
                fontsize=7.5, fontweight="bold", color="#f97316", zorder=9,
                bbox=dict(boxstyle="round,pad=0.2", fc="#0a0e17", ec="#f97316", alpha=0.85))

    ax.set_title(
        f"AquaTwin Emergency Routing — Replay July 2023 Flood\n"
        f"Origin: {olabel} → {hname} | Default: {def_km:.2f} km | Safe Reroute: {safe_km:.2f} km (Detour: +{detour_km:.2f} km)",
        color="#f9fafb", fontsize=9.5, pad=8
    )
    ax.set_xlabel("Longitude", color="#9ca3af", fontsize=9)
    ax.set_ylabel("Latitude", color="#9ca3af", fontsize=9)
    ax.tick_params(colors="#9ca3af", labelsize=7)
    for sp in ax.spines.values(): sp.set_edgecolor("#374151")
    ax.legend(facecolor="#111827", edgecolor="#374151", labelcolor="#f3f4f6", loc="upper left", fontsize=8)

    plt.tight_layout()
    fig.savefig(PREVIEW_F, dpi=140, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print("  v preview.png regenerated and saved")

    print("\nAll files successfully updated. Ready to verify with routing engine.")

if __name__ == "__main__":
    apply_route(2)
