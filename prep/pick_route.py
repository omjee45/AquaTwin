# -*- coding: utf-8 -*-
"""
prep/pick_route.py
──────────────────
Reads  prep/out/roads_scored.json  and  prep/out/places.json  only.
Runs in seconds (no network, no satellite data).

Outputs
  prep/out/routing_params.json   — parameters used for this run
  prep/out/places.json           — updated with ambulance-start node
  prep/out/demo_segments.json    — updated (3 ALLOW, 3 BLOCK, 1 below-threshold confirmed)

Rules (from SPEC.md and user requirement):
  - Fixed seed = 42 everywhere (deterministic)
  - Score threshold for "flooded" = 0.5
  - Alert threshold = 0.85  (unchanged)
  - Score weights unchanged (0.5 SAR + 0.3 low_hand + 0.2 rain)  <- not used here
  - Do NOT re-run build_data; do NOT change roads_scored.json
"""

import json
import math
import heapq
import random
import argparse
import sys
import io
from collections import defaultdict
from pathlib import Path

# Force UTF-8 output on Windows consoles
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
except AttributeError:
    pass

# -- paths -------------------------------------------------------------------
ROOT      = Path(__file__).parent.parent
OUT       = ROOT / "prep" / "out"
ROADS_F   = OUT / "roads_scored.json"
PLACES_F  = OUT / "places.json"
PARAMS_F  = OUT / "routing_params.json"
DEMO_F    = OUT / "demo_segments.json"

# -- constants ----------------------------------------------------------------
SEED              = 42
FLOOD_THRESH      = 0.5          # above -> flooded
ALERT_THRESH      = 0.85         # cedar gate
ROUTE_MIN_KM      = 2.0
ROUTE_MAX_KM      = 15.0
RAND_ORIGIN_COUNT = 3_000        # random nodes for strict search
FLOOD_ORIGIN_KM   = 1.0          # flooded-edge proximity radius for origins
NAMED_ROAD_RADIUS = 300.0        # m -- nearest named road for origin label
PENALTY_MULT      = 4.0          # cost multiplier for 0.40-0.50 model edges


# -- helpers ------------------------------------------------------------------

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6_371_000.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


def dijkstra(graph, source, targets, max_cost=None):
    """
    graph  : dict  node_id -> list of (neighbour, edge_weight, edge_data)
    source : start node id
    targets: set of destination node ids
    Returns (dist_dict, prev_dict) truncated to max_cost if given.
    """
    dist = {source: 0.0}
    prev = {}
    pq   = [(0.0, source)]
    found = set()

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, float("inf")):
            continue
        if u in targets:
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
    """Return list of (u,v) edges along path with flood_probability >= FLOOD_THRESH."""
    flooded = []
    for u, v in zip(path[:-1], path[1:]):
        prob = edge_flood.get((u, v), edge_flood.get((v, u), 0.0))
        if prob >= FLOOD_THRESH:
            flooded.append((u, v))
    return flooded


def nearest_named_road(node_id, node_pos, named_edges, radius_m=300.0):
    """Return the name of the nearest named edge midpoint within radius_m, else None."""
    if node_id not in node_pos:
        return None
    lat0, lon0 = node_pos[node_id]
    best_name  = None
    best_dist  = radius_m

    for name, mlat, mlon in named_edges:
        d = haversine_m(lat0, lon0, mlat, mlon)
        if d < best_dist:
            best_dist = d
            best_name = name

    return best_name


# -- load data ----------------------------------------------------------------

def load_graph():
    print(f"  Loading {ROADS_F.name} ...", flush=True)
    with open(ROADS_F, encoding="utf-8") as f:
        data = json.load(f)

    nodes_list = data["nodes"]     # [{id, lat, lon}, ...]
    edges_list = data["edges"]     # [{u, v, length_m, flood_probability, source, ...}, ...]

    node_pos = {n["id"]: (n["lat"], n["lon"]) for n in nodes_list}

    # forward graph (for default / safe routing)
    graph_fwd  = defaultdict(list)   # u -> [(v, cost, edge_dict)]
    graph_safe = defaultdict(list)   # blocked/penalised version

    edge_flood = {}   # (u,v) -> flood_probability  (directed)
    all_edges  = []

    named_edge_midpoints = []   # [(name, lat, lon)] for label lookup

    for e in edges_list:
        u, v    = e["u"], e["v"]
        length  = e.get("length_m", 1.0) or 1.0
        prob    = e.get("flood_probability", 0.0)
        source  = e.get("source", "model")
        name    = e.get("name")

        edge_flood[(u, v)] = prob

        # collect named edge midpoints for label lookup
        if name and u in node_pos and v in node_pos:
            la, loa = node_pos[u]
            lb, lob = node_pos[v]
            named_edge_midpoints.append((name, (la + lb) / 2, (loa + lob) / 2))

        all_edges.append(e)

        # default graph: use raw length
        graph_fwd[u].append((v, length, e))

        # safe graph: hard-block >= 0.5; penalise 0.40-0.50 "model" edges
        if prob >= FLOOD_THRESH:
            pass   # hard block -- do not add
        elif source == "model" and 0.40 <= prob < FLOOD_THRESH:
            graph_safe[u].append((v, length * PENALTY_MULT, e))
        else:
            graph_safe[u].append((v, length, e))

    return node_pos, graph_fwd, graph_safe, edge_flood, all_edges, named_edge_midpoints


def load_places():
    with open(PLACES_F, encoding="utf-8") as f:
        return json.load(f)


# -- build origin / destination sets ------------------------------------------

def build_origins(node_pos, graph_fwd, edge_flood):
    rng = random.Random(SEED)

    # (a) nodes within FLOOD_ORIGIN_KM of any flooded edge endpoint
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

    print(f"  Origins within {FLOOD_ORIGIN_KM} km of flooded edges: {len(proximity_origins)}")

    # (b) 3,000 random nodes (seeded)
    all_nodes = list(node_pos.keys())
    rng.shuffle(all_nodes)
    rand_origins = set(all_nodes[:RAND_ORIGIN_COUNT])
    print(f"  Random seed-{SEED} origins: {len(rand_origins)}")

    combined = proximity_origins | rand_origins
    print(f"  Total candidate origins: {len(combined)}")
    return combined, proximity_origins


def build_hospitals(places):
    return [p for p in places if p.get("role") == "hospital_main"]


# -- strict search ------------------------------------------------------------

def strict_search(origins, hospitals, node_pos, graph_fwd, graph_safe, edge_flood,
                  named_edge_midpoints):
    """
    For each hospital, run Dijkstra on the safe graph (target => all sources) so
    we get safe distances to every node in one pass.

    Then for each origin: check the default route crosses >= 1 flooded edge AND
    a safe route exists, AND length within [2,15] km, AND first+last edge not flooded.
    """
    print("\n  [STRICT SEARCH]")

    # build reverse safe graph for destination-side Dijkstra
    graph_safe_rev = defaultdict(list)
    for u, nbrs in graph_safe.items():
        for v, w, e in nbrs:
            graph_safe_rev[v].append((u, w, e))

    graph_fwd_rev = defaultdict(list)
    for u, nbrs in graph_fwd.items():
        for v, w, e in nbrs:
            graph_fwd_rev[v].append((u, w, e))

    max_cost = ROUTE_MAX_KM * 1000

    results = []

    for hosp in hospitals:
        hid = hosp["node_id"]
        hname = hosp["name"]

        if hid not in node_pos:
            print(f"    Hospital {hname}: node {hid} not in graph -- skipped")
            continue

        print(f"    Hospital: {hname} (node {hid})")

        # Dijkstra on reversed safe graph from hospital -> all reachable origins
        safe_dist_from_hosp, safe_prev = dijkstra(graph_safe_rev, hid, set(), max_cost)

        # Dijkstra on reversed default graph from hospital -> all reachable origins
        def_dist_from_hosp, def_prev = dijkstra(graph_fwd_rev, hid, set(), max_cost)

        candidates = []
        dbg = {"no_safe": 0, "no_def": 0, "safe_range": 0, "def_range": 0,
               "no_path": 0, "first_last": 0, "no_flood": 0, "ok": 0}

        for orig in origins:
            safe_d = safe_dist_from_hosp.get(orig, None)
            def_d  = def_dist_from_hosp.get(orig, None)

            if safe_d is None:
                dbg["no_safe"] += 1
                continue
            if def_d is None:
                dbg["no_def"] += 1
                continue

            safe_km = safe_d / 1000.0
            def_km  = def_d  / 1000.0

            if not (ROUTE_MIN_KM <= safe_km <= ROUTE_MAX_KM):
                dbg["safe_range"] += 1
                continue
            if not (ROUTE_MIN_KM <= def_km  <= ROUTE_MAX_KM):
                dbg["def_range"] += 1
                continue

            # reconstruct default path (orig -> hosp) using reversed graph
            def_path = reconstruct_path(def_prev, hid, orig)
            if def_path is None:
                dbg["no_path"] += 1
                continue
            def_path = list(reversed(def_path))  # now orig -> hosp

            if len(def_path) < 2:
                dbg["no_path"] += 1
                continue

            # first edge (orig->next) must NOT be flooded
            first_prob = edge_flood.get((def_path[0], def_path[1]),
                         edge_flood.get((def_path[1], def_path[0]), 0.0))
            # last edge (prev->hosp) must NOT be flooded
            last_prob  = edge_flood.get((def_path[-2], def_path[-1]),
                         edge_flood.get((def_path[-1], def_path[-2]), 0.0))

            if first_prob >= FLOOD_THRESH or last_prob >= FLOOD_THRESH:
                dbg["first_last"] += 1
                continue

            # default route must cross at least 1 flooded edge
            flooded = path_flooded_edges(def_path, edge_flood)
            if not flooded:
                dbg["no_flood"] += 1
                continue

            dbg["ok"] += 1
            detour_km = safe_km - def_km

            candidates.append({
                "origin":           orig,
                "hospital_node":    hid,
                "hospital_name":    hname,
                "default_km":       round(def_km, 3),
                "safe_km":          round(safe_km, 3),
                "detour_km":        round(detour_km, 3),
                "flooded_segments": len(flooded),
                "default_path":     def_path,
                "safe_prev":        safe_prev,
                "safe_start":       hid,
            })

        candidates.sort(key=lambda x: x["detour_km"])
        results.extend(candidates[:5])
        print(f"      -> {len(candidates)} strict pairs found, top 5 kept")
        print(f"         Debug: {dbg}")

    # sort globally by detour and pick top 5
    results.sort(key=lambda x: x["detour_km"])
    return results[:5]


# -- risk-weighted fallback ---------------------------------------------------

def risk_weighted_search(origins, hospitals, node_pos, graph_safe, edge_flood,
                         named_edge_midpoints):
    """
    Hard-block >= 0.5.  Penalise 0.40-0.49 model edges (already in graph_safe).
    Find shortest safe path origin -> hospital, 2-15 km.
    """
    print("\n  [RISK-WEIGHTED FALLBACK]")

    graph_safe_rev = defaultdict(list)
    for u, nbrs in graph_safe.items():
        for v, w, e in nbrs:
            graph_safe_rev[v].append((u, w, e))

    max_cost = ROUTE_MAX_KM * 1000
    results  = []

    for hosp in hospitals:
        hid   = hosp["node_id"]
        hname = hosp["name"]

        if hid not in node_pos:
            continue

        print(f"    Hospital: {hname} (node {hid})")
        safe_dist, safe_prev = dijkstra(graph_safe_rev, hid, set(), max_cost)

        candidates = []
        for orig in origins:
            sd = safe_dist.get(orig, None)
            if sd is None:
                continue
            skm = sd / 1000.0
            if not (ROUTE_MIN_KM <= skm <= ROUTE_MAX_KM):
                continue
            candidates.append({
                "origin":           orig,
                "hospital_node":    hid,
                "hospital_name":    hname,
                "safe_km":          round(skm, 3),
                "default_km":       None,
                "detour_km":        None,
                "flooded_segments": 0,
                "safe_prev":        safe_prev,
                "safe_start":       hid,
            })

        candidates.sort(key=lambda x: x["safe_km"])
        results.extend(candidates[:5])
        print(f"      -> {len(candidates)} risk-weighted routes found, top 5 kept")

    results.sort(key=lambda x: x["safe_km"])
    return results[:5]


# -- label helpers ------------------------------------------------------------

def origin_label(node_id, node_pos, named_edge_midpoints):
    name = nearest_named_road(node_id, node_pos, named_edge_midpoints, NAMED_ROAD_RADIUS)
    if name:
        return f"Near {name}"
    return f"Node {node_id}"


# -- print table --------------------------------------------------------------

def print_table(results, node_pos, named_edge_midpoints, mode):
    sep = "-" * 90
    print(f"\n{sep}")
    print(f"  TOP {len(results)} ROUTES  [{mode}]")
    print(sep)
    hdr = f"  {'Origin':<35}  {'Hospital':<30}  {'Dflt':>6}  {'Safe':>6}  {'Detour':>7}  {'Flood':>5}"
    print(hdr)
    print(f"  {'-'*35}  {'-'*30}  {'km':>6}  {'km':>6}  {'km':>7}  {'segs':>5}")
    for r in results:
        lbl   = origin_label(r["origin"], node_pos, named_edge_midpoints)
        dflt  = f"{r['default_km']:.2f}" if r["default_km"] is not None else "  N/A"
        safe  = f"{r['safe_km']:.2f}"
        det   = f"{r['detour_km']:+.2f}" if r["detour_km"] is not None else "  N/A"
        fseg  = str(r["flooded_segments"])
        print(f"  {lbl:<35}  {r['hospital_name']:<30}  {dflt:>6}  {safe:>6}  {det:>7}  {fseg:>5}")
    print(f"{sep}\n")


# -- update places.json with ambulance-start ----------------------------------

def update_places(places, best, node_pos, named_edge_midpoints):
    # remove any previously added ambulance_start entry
    places = [p for p in places if p.get("role") != "ambulance_start"]

    orig  = best["origin"]
    label = origin_label(orig, node_pos, named_edge_midpoints)
    lat, lon = node_pos[orig]

    places.append({
        "id":      "ambulance_1",
        "name":    f"Ambulance 4 start  ({label})",
        "role":    "ambulance_start",
        "node_id": orig,
        "lat":     lat,
        "lon":     lon,
    })
    return places


# -- update demo_segments.json ------------------------------------------------

def update_demo_segments(best, all_edges, edge_flood):
    """
    Keep 3 ALLOW (>=0.5, Sentinel-1), 3 BLOCK (model, 0.40-0.50),
    1 confirmed_below_threshold (Sentinel-1, 0.40-0.85).
    Pull from all_edges, not from the route itself.
    """
    with open(DEMO_F, encoding="utf-8") as f:
        demo = json.load(f)

    allow_pool = [e for e in all_edges
                  if e.get("flood_probability", 0) > ALERT_THRESH
                  and e.get("validation_source") == "Sentinel-1"]

    block_pool = [e for e in all_edges
                  if e.get("source", "model") == "model"
                  and 0.40 <= e.get("flood_probability", 0) < FLOOD_THRESH]

    below_pool = [e for e in all_edges
                  if e.get("validation_source") == "Sentinel-1"
                  and 0.40 <= e.get("flood_probability", 0) < ALERT_THRESH]

    def edge_entry(e):
        return {
            "id":                  e.get("id", f"{e['u']}_{e['v']}_0"),
            "u":                   e["u"],
            "v":                   e["v"],
            "length_m":            round(e.get("length_m", 0), 1),
            "name":                e.get("name"),
            "flood_probability":   round(e.get("flood_probability", 0), 4),
            "flood_pct":           int(e.get("flood_probability", 0) * 100),
            "validation_source":   e.get("validation_source", "model"),
            "sar_overlap":         round(e.get("sar_overlap", 0), 3),
            "low_hand":            round(e.get("low_hand", 0), 3),
            "dist_to_river_m":     round(e.get("dist_to_river_m", 0), 1),
            "geometry":            e.get("geometry", []),
            "display_name":        e.get("display_name", e.get("name") or "Unnamed road"),
        }

    rng = random.Random(SEED)

    allow_3 = [edge_entry(e) for e in rng.sample(allow_pool, min(3, len(allow_pool)))]
    block_3 = [edge_entry(e) for e in rng.sample(block_pool, min(3, len(block_pool)))]
    below_1 = edge_entry(rng.choice(below_pool)) if below_pool else demo.get("confirmed_below_threshold", {})

    demo["allow_candidates"]          = allow_3
    demo["block_candidates"]          = block_3
    demo["confirmed_below_threshold"] = below_1

    # attach route info
    demo["ambulance_route"] = {
        "origin_node":       best["origin"],
        "hospital_node":     best["hospital_node"],
        "hospital_name":     best["hospital_name"],
        "default_km":        best["default_km"],
        "safe_km":           best["safe_km"],
        "detour_km":         best["detour_km"],
        "flooded_segments":  best["flooded_segments"],
    }

    with open(DEMO_F, "w", encoding="utf-8") as f:
        json.dump(demo, f, indent=2, ensure_ascii=False)
    print(f"  v  demo_segments.json updated")


# -- write routing_params.json ------------------------------------------------

def write_params(mode, best, node_pos):
    lat, lon = node_pos[best["origin"]]
    params = {
        "seed":                SEED,
        "flood_threshold":     FLOOD_THRESH,
        "alert_threshold":     ALERT_THRESH,
        "route_min_km":        ROUTE_MIN_KM,
        "route_max_km":        ROUTE_MAX_KM,
        "rand_origin_count":   RAND_ORIGIN_COUNT,
        "flood_origin_km":     FLOOD_ORIGIN_KM,
        "penalty_multiplier":  PENALTY_MULT,
        "mode":                mode,
        "best_route": {
            "origin_node":      best["origin"],
            "origin_lat":       lat,
            "origin_lon":       lon,
            "hospital_node":    best["hospital_node"],
            "hospital_name":    best["hospital_name"],
            "default_km":       best["default_km"],
            "safe_km":          best["safe_km"],
            "detour_km":        best["detour_km"],
            "flooded_segments": best["flooded_segments"],
        }
    }
    with open(PARAMS_F, "w", encoding="utf-8") as f:
        json.dump(params, f, indent=2)
    print(f"  v  routing_params.json written")


# -- main ---------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Pick ambulance route from roads_scored.json")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print results but do not update places.json or demo_segments.json")
    args = parser.parse_args()

    print("=" * 70)
    print("  prep/pick_route.py  --  Ambulance Route Selector")
    print("=" * 70)
    print(f"  Seed         : {SEED}")
    print(f"  Flood thresh : >= {FLOOD_THRESH}")
    print(f"  Alert thresh : >= {ALERT_THRESH}")
    print(f"  Route range  : {ROUTE_MIN_KM}--{ROUTE_MAX_KM} km")
    print()

    # -- load --
    node_pos, graph_fwd, graph_safe, edge_flood, all_edges, named_edge_midpoints = load_graph()
    places    = load_places()
    hospitals = build_hospitals(places)

    print(f"  Nodes          : {len(node_pos):,}")
    print(f"  Edges          : {len(all_edges):,}")
    print(f"  Flooded (>=0.5): {sum(1 for p in edge_flood.values() if p >= FLOOD_THRESH)}")
    print(f"  Hospitals      : {len(hospitals)}")
    print()

    # -- build origin sets --
    origins, _ = build_origins(node_pos, graph_fwd, edge_flood)

    # -- strict search --
    results = strict_search(origins, hospitals, node_pos, graph_fwd, graph_safe,
                            edge_flood, named_edge_midpoints)

    mode = "strict"
    if not results:
        print("  No strict routes found -- falling back to risk-weighted search.")
        results = risk_weighted_search(origins, hospitals, node_pos, graph_safe,
                                       edge_flood, named_edge_midpoints)
        mode = "risk-weighted"

    if not results:
        print("\n  X  No routes found under either strategy.")
        sys.exit(1)

    # -- print table --
    print_table(results, node_pos, named_edge_midpoints, mode)

    best = results[0]
    print(f"  Best pair selected:")
    print(f"    Origin  : {origin_label(best['origin'], node_pos, named_edge_midpoints)}")
    print(f"    Hospital: {best['hospital_name']}")
    if best["default_km"] is not None:
        print(f"    Default : {best['default_km']:.3f} km  ({best['flooded_segments']} flooded segment(s))")
    print(f"    Safe    : {best['safe_km']:.3f} km")
    if best["detour_km"] is not None:
        print(f"    Detour  : {best['detour_km']:+.3f} km")

    if args.dry_run:
        print("\n  [DRY RUN] -- no files updated.")
        return

    # -- update outputs --
    print()
    updated_places = update_places(places, best, node_pos, named_edge_midpoints)
    with open(PLACES_F, "w", encoding="utf-8") as f:
        json.dump(updated_places, f, indent=2, ensure_ascii=False)
    print(f"  v  places.json updated  ({len(updated_places)} entries)")

    update_demo_segments(best, all_edges, edge_flood)
    write_params(mode, best, node_pos)

    print()
    print("  Done.")


if __name__ == "__main__":
    main()
