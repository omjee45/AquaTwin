# -*- coding: utf-8 -*-
"""
routing/engine.py
─────────────────
Deterministic routing engine for AquaTwin using NetworkX.
Reads prep/out/roads_scored.json and computes:
  - Default route (shortest physical distance)
  - Safe route (hard-blocks edges >= 0.5; penalises 0.40-0.50 model edges 4x)
Returns route coordinates, distances, flooded segments avoided, and detour km.
No LLM involved -- pure deterministic graph algorithm.
"""

import os
import json
import math
import heapq
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import networkx as nx

ROOT_DIR = Path(__file__).resolve().parent.parent
ROADS_PATH = ROOT_DIR / "prep" / "out" / "roads_scored.json"
PLACES_PATH = ROOT_DIR / "prep" / "out" / "places.json"
ROUTING_PARAMS_PATH = ROOT_DIR / "prep" / "out" / "routing_params.json"

FLOOD_THRESHOLD = 0.5
PENALTY_MULTIPLIER = 4.0


class RoutingEngine:
    def __init__(self, roads_path: Optional[Path] = None):
        self.roads_path = roads_path or ROADS_PATH
        self.node_coords: Dict[int, Tuple[float, float]] = {}  # node_id -> (lat, lon)
        self.edge_lookup: Dict[str, Dict[str, Any]] = {}       # edge_id -> edge_dict
        self.uv_edges: Dict[Tuple[int, int], Dict[str, Any]] = {} # (u, v) -> edge_dict
        
        self.graph_default = nx.DiGraph()
        self.graph_safe = nx.DiGraph()
        self._load_network()

    def _load_network(self):
        if not self.roads_path.exists():
            bucket = os.environ.get("DATA_BUCKET", "").strip()
            tmp_roads = Path("/tmp/data/roads_scored.json")
            if tmp_roads.exists():
                self.roads_path = tmp_roads
            elif bucket:
                try:
                    import boto3
                    s3 = boto3.client("s3", region_name=os.environ.get("AWS_REGION", "us-east-1"))
                    tmp_roads.parent.mkdir(parents=True, exist_ok=True)
                    prefix = os.environ.get("DATA_PREFIX", "data/").strip()
                    print(f"Downloading roads_scored.json from s3://{bucket}/{prefix}roads_scored.json to {tmp_roads}...")
                    s3.download_file(bucket, f"{prefix}roads_scored.json", str(tmp_roads))
                    self.roads_path = tmp_roads
                except Exception as e:
                    print(f"[Warning] Failed to fetch roads from S3: {e}")

        if not self.roads_path.exists():
            raise FileNotFoundError(f"Roads file not found at: {self.roads_path}")

        with open(self.roads_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        nodes = data.get("nodes", [])
        edges = data.get("edges", [])

        for n in nodes:
            nid = n["id"]
            lat = n["lat"]
            lon = n["lon"]
            self.node_coords[nid] = (lat, lon)
            self.graph_default.add_node(nid, lat=lat, lon=lon)
            self.graph_safe.add_node(nid, lat=lat, lon=lon)

        for e in edges:
            u = e["u"]
            v = e["v"]
            eid = e.get("id", f"{u}_{v}_0")
            length_m = e.get("length_m", 1.0) or 1.0
            prob = e.get("flood_probability", 0.0) or 0.0
            source = e.get("source", "model")
            
            self.edge_lookup[eid] = e
            self.uv_edges[(u, v)] = e

            # Default graph uses physical distance in meters
            self.graph_default.add_edge(u, v, weight=length_m, edge_id=eid, length_m=length_m, flood_prob=prob)

            # Safe graph:
            # - Hard block edges with flood_probability >= FLOOD_THRESHOLD
            # - Penalise edges with 0.40 <= prob < FLOOD_THRESHOLD from model source
            if prob >= FLOOD_THRESHOLD:
                # Do not add flooded edge to safe graph
                continue
            elif source == "model" and 0.40 <= prob < FLOOD_THRESHOLD:
                safe_weight = length_m * PENALTY_MULTIPLIER
                self.graph_safe.add_edge(u, v, weight=safe_weight, edge_id=eid, length_m=length_m, flood_prob=prob)
            else:
                self.graph_safe.add_edge(u, v, weight=length_m, edge_id=eid, length_m=length_m, flood_prob=prob)

    def get_edge_geometry(self, u: int, v: int) -> List[List[float]]:
        """Returns [[lon, lat], ...] for the edge between u and v."""
        edge = self.uv_edges.get((u, v))
        if edge and "geometry" in edge and edge["geometry"]:
            return edge["geometry"]
        if u in self.node_coords and v in self.node_coords:
            lat1, lon1 = self.node_coords[u]
            lat2, lon2 = self.node_coords[v]
            return [[lon1, lat1], [lon2, lat2]]
        return []

    def compute_route(self, origin_node: int, destination_node: int) -> Dict[str, Any]:
        """
        Computes both the default route and safe route between two nodes.
        Returns detailed route geometry, distance, and avoidance statistics.
        """
        if origin_node not in self.node_coords:
            return {"success": False, "error": f"Origin node {origin_node} not found in graph"}
        if destination_node not in self.node_coords:
            return {"success": False, "error": f"Destination node {destination_node} not found in graph"}

        # 1. Compute default shortest route
        default_path = None
        default_km = None
        default_flooded_edges = []
        default_coords: List[List[float]] = []

        try:
            default_path = nx.shortest_path(self.graph_default, source=origin_node, target=destination_node, weight="weight")
            # Calculate physical distance and check for flooded edges
            total_dist = 0.0
            for u, v in zip(default_path[:-1], default_path[1:]):
                edge_data = self.graph_default[u][v]
                total_dist += edge_data.get("length_m", 0.0)
                if edge_data.get("flood_prob", 0.0) >= FLOOD_THRESHOLD:
                    default_flooded_edges.append({
                        "u": u, "v": v,
                        "edge_id": edge_data.get("edge_id"),
                        "flood_probability": edge_data.get("flood_prob", 0.0)
                    })
                geom = self.get_edge_geometry(u, v)
                if not default_coords:
                    default_coords.extend(geom)
                else:
                    default_coords.extend(geom[1:])
            default_km = round(total_dist / 1000.0, 3)
        except nx.NetworkXNoPath:
            pass

        # 2. Compute safe route
        safe_path = None
        safe_km = None
        safe_coords: List[List[float]] = []
        penalized_segments = 0

        try:
            safe_path = nx.shortest_path(self.graph_safe, source=origin_node, target=destination_node, weight="weight")
            total_safe_dist = 0.0
            for u, v in zip(safe_path[:-1], safe_path[1:]):
                edge_data = self.graph_safe[u][v]
                # length_m is true physical length
                length_m = edge_data.get("length_m", 0.0)
                total_safe_dist += length_m
                if edge_data.get("weight", length_m) > length_m:
                    penalized_segments += 1
                geom = self.get_edge_geometry(u, v)
                if not safe_coords:
                    safe_coords.extend(geom)
                else:
                    safe_coords.extend(geom[1:])
            safe_km = round(total_safe_dist / 1000.0, 3)
        except nx.NetworkXNoPath:
            pass

        if safe_path is None and default_path is None:
            return {
                "success": False,
                "error": f"No path found between node {origin_node} and node {destination_node}"
            }

        detour_km = None
        if safe_km is not None and default_km is not None:
            detour_km = round(safe_km - default_km, 3)

        return {
            "success": True,
            "origin_node": origin_node,
            "destination_node": destination_node,
            "default_route": {
                "exists": default_path is not None,
                "node_count": len(default_path) if default_path else 0,
                "distance_km": default_km,
                "flooded_segments_count": len(default_flooded_edges),
                "flooded_edges": default_flooded_edges,
                "coordinates": default_coords
            },
            "safe_route": {
                "exists": safe_path is not None,
                "node_count": len(safe_path) if safe_path else 0,
                "distance_km": safe_km,
                "detour_km": detour_km,
                "flooded_segments_avoided": len(default_flooded_edges),
                "risk_penalized_segments": penalized_segments,
                "coordinates": safe_coords
            }
        }


# Singleton engine instance for fast reuse
_ENGINE_INSTANCE: Optional[RoutingEngine] = None

def get_engine() -> RoutingEngine:
    global _ENGINE_INSTANCE
    if _ENGINE_INSTANCE is None:
        _ENGINE_INSTANCE = RoutingEngine()
    return _ENGINE_INSTANCE


if __name__ == "__main__":
    import sys
    print("Testing AquaTwin Routing Engine...")
    engine = get_engine()
    print(f"Graph nodes: {engine.graph_default.number_of_nodes()}")
    print(f"Graph default edges: {engine.graph_default.number_of_edges()}")
    print(f"Graph safe edges: {engine.graph_safe.number_of_edges()}")

    # Test with demo route from routing_params.json
    if ROUTING_PARAMS_PATH.exists():
        with open(ROUTING_PARAMS_PATH, "r", encoding="utf-8") as f:
            params = json.load(f)
        best = params.get("best_route", {})
        orig = best.get("origin_node")
        hosp = best.get("hospital_node")
        if orig and hosp:
            res = engine.compute_route(orig, hosp)
            print(f"Route from {orig} to {hosp}:")
            print(f"  Safe distance: {res['safe_route']['distance_km']} km")
            print(f"  Detour: {res['safe_route']['detour_km']} km")
            print(f"  Safe coordinates count: {len(res['safe_route']['coordinates'])}")
