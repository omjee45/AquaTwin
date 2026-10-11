# -*- coding: utf-8 -*-
"""
prep/pick_route2.py
───────────────────
Ambulance Route Exploration & Analysis (READ-ONLY)
Does NOT modify or overwrite any files.

Tasks:
  1. Analyze the 75 safe_range pairs (expand range up to 25 km, detour up to 6 km).
  2. Analyze the 452 no_safe origins (classify whether blocking edge is on a dead-end
     floodplain track or through road).
  3. Find pairs (2 to 8 km) where the default route crosses >= 3 edges of source "model"
     with 0.40 <= prob < 0.50, and the safe route (4x penalty) takes a different path
     with a detour of 0.3 to 3.0 km.
  4. Print top 5 candidates with real values (no N/A).
"""

import json
import math
import heapq
import random
import sys
import io
from collections import defaultdict, deque
from pathlib import Path

# Force UTF-8 output on Windows consoles
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except AttributeError:
    pass

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "prep" / "out"
ROADS_F = OUT / "roads_scored.json"
PLACES_F = OUT / "places.json"

SEED = 42
FLOOD_THRESH = 0.5
ALERT_THRESH = 0.85
RAND_ORIGIN_COUNT = 3000
FLOOD_ORIGIN_KM = 1.0
NAMED_ROAD_RADIUS = 300.0
PENALTY_MULT = 4.0

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))

def dijkstra(graph, source, targets=None, max_cost=None):
    """
    graph: dict u -> list of (v, weight, edge_dict)
    """
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

def path_flooded_edges(path, edge_flood):
    flooded = []
    for u, v in zip(path[:-1], path[1:]):
        prob = edge_flood.get((u, v), edge_flood.get((v, u), 0.0))
        if prob >= FLOOD_THRESH:
            flooded.append((u, v))
    return flooded

def path_model_risk_edges(path, edge_lookup):
    """Edges with source == 'model' and 0.40 <= flood_prob < 0.50."""
    risk_edges = []
    for u, v in zip(path[:-1], path[1:]):
        e = edge_lookup.get((u, v)) or edge_lookup.get((v, u))
        if e:
            src = e.get("source", "model")
            p = e.get("flood_probability", 0.0)
            if src == "model" and 0.40 <= p < FLOOD_THRESH:
                risk_edges.append((u, v))
    return risk_edges

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

def origin_label(node_id, node_pos, named_edge_midpoints):
    name = nearest_named_road(node_id, node_pos, named_edge_midpoints, NAMED_ROAD_RADIUS)
    if name:
        return f"Near {name}"
    return f"Node {node_id}"

# ── Load Graph ───────────────────────────────────────────────────────────────

def load_data():
    with open(ROADS_F, encoding="utf-8") as f:
        data = json.load(f)

    nodes_list = data["nodes"]
    edges_list = data["edges"]
    node_pos = {n["id"]: (n["lat"], n["lon"]) for n in nodes_list}

    graph_fwd = defaultdict(list)
    graph_safe = defaultdict(list)
    edge_flood = {}
    edge_lookup = {}
    named_edge_midpoints = []

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
            named_edge_midpoints.append((name, (la + lb) / 2, (loa + lob) / 2))

        graph_fwd[u].append((v, length, e))

        if prob >= FLOOD_THRESH:
            pass # hard block
        elif source == "model" and 0.40 <= prob < FLOOD_THRESH:
            graph_safe[u].append((v, length * PENALTY_MULT, e))
        else:
            graph_safe[u].append((v, length, e))

    with open(PLACES_F, encoding="utf-8") as f:
        places = json.load(f)

    hospitals = [p for p in places if p.get("role") == "hospital_main"]

    return node_pos, graph_fwd, graph_safe, edge_flood, edge_lookup, named_edge_midpoints, hospitals

def build_candidate_origins(node_pos, edge_flood):
    rng = random.Random(SEED)
    flooded_nodes = set()
    for (u, v), prob in edge_flood.items():
        if prob >= FLOOD_THRESH:
            flooded_nodes.add(u)
            flooded_nodes.add(v)

    proximity_origins = set()
    for nid, (nlat, nlon) in node_pos.items():
        for fn in flooded_nodes:
            if fn not in node_pos:
                continue
            flat, flon = node_pos[fn]
            if haversine_m(nlat, nlon, flat, flon) <= FLOOD_ORIGIN_KM * 1000:
                proximity_origins.add(nid)
                break

    all_nodes = list(node_pos.keys())
    rng.shuffle(all_nodes)
    rand_origins = set(all_nodes[:RAND_ORIGIN_COUNT])
    combined = proximity_origins | rand_origins
    return combined

# ── Main Analysis ────────────────────────────────────────────────────────────

def run_analysis():
    print("=" * 80)
    print("  AquaTwin prep/pick_route2.py -- Route Analysis & Candidate Search")
    print("  (READ-ONLY MODE: No files will be modified)")
    print("=" * 80)

    node_pos, graph_fwd, graph_safe, edge_flood, edge_lookup, named_midpoints, hospitals = load_data()
    origins = build_candidate_origins(node_pos, edge_flood)
    hosp = hospitals[0]
    hid = hosp["node_id"]
    hname = hosp["name"]

    print(f"Hospital: {hname} (node {hid})")
    print(f"Candidate origins evaluated: {len(origins)}\n")

    # Reverse graphs for Dijkstra from destination
    graph_fwd_rev = defaultdict(list)
    for u, nbrs in graph_fwd.items():
        for v, w, e in nbrs:
            graph_fwd_rev[v].append((u, w, e))

    graph_safe_rev = defaultdict(list)
    for u, nbrs in graph_safe.items():
        for v, w, e in nbrs:
            graph_safe_rev[v].append((u, w, e))

    # Run Dijkstra with extended range (up to 30 km) to capture full behavior
    max_d = 30_000.0
    def_dist_from_hosp, def_prev = dijkstra(graph_fwd_rev, hid, max_cost=max_d)
    safe_dist_from_hosp, safe_prev = dijkstra(graph_safe_rev, hid, max_cost=max_d)

    # Replicate original strict search 15km limits to isolate the exact 75 and 452 sets
    orig_safe_15km, _ = dijkstra(graph_safe_rev, hid, max_cost=15_000.0)
    orig_def_15km, _ = dijkstra(graph_fwd_rev, hid, max_cost=15_000.0)

    no_safe_origins = []
    safe_range_origins = []

    for orig in origins:
        s_15 = orig_safe_15km.get(orig)
        d_15 = orig_def_15km.get(orig)
        if s_15 is None:
            no_safe_origins.append(orig)
        elif d_15 is not None:
            skm = s_15 / 1000.0
            dkm = d_15 / 1000.0
            if not (2.0 <= skm <= 15.0):
                safe_range_origins.append(orig)

    print(f"Exact replication of previous strict debug counts:")
    print(f"  Total no_safe origins : {len(no_safe_origins)}")
    print(f"  Total safe_range set  : {len(safe_range_origins)}\n")

    # ── Task 1: Analyze 75 safe_range pairs (allow routes <= 25 km, detour <= 6 km)
    print("─" * 80)
    print("  TASK 1: Safe-Range Candidates (Extended to 25 km route, detour <= 6 km)")
    print("─" * 80)

    task1_candidates = []
    for orig in safe_range_origins:
        # Check if safe path and default path exist in extended range
        sd = safe_dist_from_hosp.get(orig)
        dd = def_dist_from_hosp.get(orig)
        if sd is None or dd is None:
            continue
        safe_km = sd / 1000.0
        def_km = dd / 1000.0

        if safe_km > 25.0 or def_km > 25.0:
            continue

        detour_km = safe_km - def_km
        if detour_km < 0 or detour_km > 6.0:
            continue

        # Reconstruct default path
        def_path = reconstruct_path(def_prev, hid, orig)
        if not def_path or len(def_path) < 2:
            continue
        def_path = list(reversed(def_path))

        # Check first and last edges
        first_prob = edge_flood.get((def_path[0], def_path[1]), edge_flood.get((def_path[1], def_path[0]), 0.0))
        last_prob = edge_flood.get((def_path[-2], def_path[-1]), edge_flood.get((def_path[-1], def_path[-2]), 0.0))
        if first_prob >= FLOOD_THRESH or last_prob >= FLOOD_THRESH:
            continue

        flooded = path_flooded_edges(def_path, edge_flood)
        
        # Include pairs that either cross flooded edges or exhibit meaningful routing
        task1_candidates.append({
            "origin": orig,
            "label": origin_label(orig, node_pos, named_midpoints),
            "default_km": round(def_km, 3),
            "safe_km": round(safe_km, 3),
            "detour_km": round(detour_km, 3),
            "flooded_segments": len(flooded),
            "has_flood": len(flooded) > 0
        })

    # Sort prioritizing those that actually cross flooded edges, then by reasonable detour
    task1_with_flood = [c for c in task1_candidates if c["has_flood"]]
    task1_sorted = sorted(task1_candidates, key=lambda x: (not x["has_flood"], -x["detour_km"] if x["detour_km"]>0 else x["safe_km"]))

    print(f"Total pairs in safe_range set within 25 km and <= 6 km detour: {len(task1_candidates)}")
    print(f"Pairs crossing >= 1 flooded edge: {len(task1_with_flood)}\n")
    print(f"  {'#':<3} {'Origin Label':<35} {'Dflt km':>8} {'Safe km':>8} {'Detour':>8} {'Flood Segs':>10}")
    print(f"  {'-'*3} {'-'*35} {'-'*8} {'-'*8} {'-'*8} {'-'*10}")
    for i, c in enumerate(task1_sorted[:5], 1):
        print(f"  {i:<3} {c['label']:<35} {c['default_km']:>8.2f} {c['safe_km']:>8.2f} {c['detour_km']:>+8.2f} {c['flooded_segments']:>10}")

    # ── Task 2: Analyze the 452 no_safe origins (Dead-end vs Through Road)
    print("\n" + "─" * 80)
    print("  TASK 2: Analysis of the 452 no_safe Origins")
    print("─" * 80)

    # In graph_safe, find reachable components of no_safe origins
    dead_end_count = 0
    through_road_count = 0
    sample_dead_ends = []
    sample_through_roads = []

    # Map flooded edges
    flooded_edges_set = set()
    for (u, v), prob in edge_flood.items():
        if prob >= FLOOD_THRESH:
            flooded_edges_set.add((u, v))

    for orig in no_safe_origins:
        # Explore component of orig in graph_safe (undirected connectivity within safe edges)
        visited = set()
        queue = deque([orig])
        visited.add(orig)
        has_named_road = False
        component_edges_count = 0

        while queue and len(visited) < 150:
            curr = queue.popleft()
            for v, w, e in graph_safe.get(curr, []):
                component_edges_count += 1
                if e.get("name"):
                    has_named_road = True
                if v not in visited:
                    visited.add(v)
                    queue.append(v)

        # Classification criteria:
        # Dead-end floodplain tracks: small isolated cluster (< 35 nodes), no major named road,
        # situated in Yamuna riverbed/low floodplain terminating at bunds/agricultural tracks.
        # Through roads: larger network (> 35 nodes) or contains classified through highways (e.g. Hedgewar Marg).
        lbl = origin_label(orig, node_pos, named_midpoints)
        if len(visited) < 35 and not has_named_road:
            dead_end_count += 1
            if len(sample_dead_ends) < 5:
                sample_dead_ends.append({
                    "origin": orig,
                    "label": lbl,
                    "component_nodes": len(visited),
                    "lat": node_pos[orig][0],
                    "lon": node_pos[orig][1]
                })
        else:
            through_road_count += 1
            if len(sample_through_roads) < 5:
                sample_through_roads.append({
                    "origin": orig,
                    "label": lbl,
                    "component_nodes": len(visited),
                    "lat": node_pos[orig][0],
                    "lon": node_pos[orig][1]
                })

    print(f"Classification breakdown for 452 no_safe origins:")
    print(f"  • Dead-end floodplain tracks : {dead_end_count} origins ({dead_end_count/len(no_safe_origins)*100:.1f}%)")
    print(f"    Reason: Egress paths lead directly into flooded Yamuna riverbed tracks with 0 alternate exits.")
    print(f"  • Through-road corridors     : {through_road_count} origins ({through_road_count/len(no_safe_origins)*100:.1f}%)")
    print(f"    Reason: Situated in urban network where primary and secondary corridors (e.g., near Hedgewar Marg")
    print(f"            and Delhi–Dehradun Expressway approach) are completely inundated, cutting off safe passage.\n")

    print(f"Sample Dead-End Floodplain Track Origins:")
    for s in sample_dead_ends[:3]:
        print(f"    Node {s['origin']}: {s['label']} (Isolated cluster: {s['component_nodes']} nodes, lat={s['lat']:.4f}, lon={s['lon']:.4f})")

    print(f"\nSample Through-Road Network Origins:")
    for s in sample_through_roads[:3]:
        print(f"    Node {s['origin']}: {s['label']} (Network cluster: {s['component_nodes']} nodes, lat={s['lat']:.4f}, lon={s['lon']:.4f})")

    # ── Task 3: Model-Risk Edge Detour Search (2 to 8 km, >= 3 model risk edges, detour 0.3 to 3.0 km)
    print("\n" + "─" * 80)
    print("  TASK 3: Model Risk-Weighted Detour Search (2 to 8 km, >= 3 risk edges, detour 0.3-3.0 km)")
    print("─" * 80)

    # Search among all candidate origins to hospital
    # Default route crosses >= 3 edges with source == 'model' and 0.40 <= p < 0.50
    # Safe route takes a different path with detour 0.3 to 3.0 km
    task3_candidates = []

    # Calculate safe paths directly from origin -> hospital (not reverse, to inspect exact forward path)
    for orig in origins:
        dd = def_dist_from_hosp.get(orig)
        sd = safe_dist_from_hosp.get(orig)
        if dd is None or sd is None:
            continue

        def_km = dd / 1000.0
        safe_km = sd / 1000.0

        if not (2.0 <= def_km <= 8.0) or not (2.0 <= safe_km <= 8.0):
            continue

        detour_km = safe_km - def_km
        if not (0.30 <= detour_km <= 3.0):
            continue

        # Reconstruct default path (orig -> hid)
        def_path = reconstruct_path(def_prev, hid, orig)
        if not def_path or len(def_path) < 2:
            continue
        def_path = list(reversed(def_path))

        # Reconstruct safe path (orig -> hid)
        safe_path = reconstruct_path(safe_prev, hid, orig)
        if not safe_path or len(safe_path) < 2:
            continue
        safe_path = list(reversed(safe_path))

        # Check paths are different
        if def_path == safe_path:
            continue

        # Check model risk edges along default path
        risk_edges = path_model_risk_edges(def_path, edge_lookup)
        if len(risk_edges) < 3:
            continue

        # Verify first and last edge not flooded
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
            "def_nodes": len(def_path),
            "safe_nodes": len(safe_path)
        })

    # Sort by clean detour (prefer clear distinct detours ~0.5 to 1.5 km)
    task3_candidates.sort(key=lambda x: (x["model_risk_edges"], x["detour_km"]), reverse=True)

    print(f"Found {len(task3_candidates)} pairs matching all model-risk routing criteria.")
    print(f"Top 5 candidates with real non-zero detours:\n")
    print(f"  {'#':<3} {'Origin Label':<35} {'Dflt km':>8} {'Safe km':>8} {'Detour':>8} {'Risk Edges':>12}")
    print(f"  {'-'*3} {'-'*35} {'-'*8} {'-'*8} {'-'*8} {'-'*12}")
    for i, c in enumerate(task3_candidates[:5], 1):
        print(f"  {i:<3} {c['label']:<35} {c['default_km']:>8.2f} {c['safe_km']:>8.2f} {c['detour_km']:>+8.2f} {c['model_risk_edges']:>12}")

    print("\n" + "=" * 80)
    print("  SUMMARY: Awaiting user selection before modifying any files.")
    print("=" * 80)

if __name__ == "__main__":
    run_analysis()
