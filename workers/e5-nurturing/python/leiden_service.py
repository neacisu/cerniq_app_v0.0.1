#!/usr/bin/env python3
"""
leiden_service.py — Python3 Leiden Community Detection Service (Plan §X FAZA 9e)

Acțiuni suportate:
  --action leiden          : Leiden community detection (D21) — resolution=1.0, min_community=3
  --action leiden_implicit : Leiden pentru clustere implicite (D24) — resolution=1.5
  --action centrality      : Calcul metrici centralitate (D22) — degree, betweenness, eigenvector, pagerank

Protocol I/O:
  --input  <path>  : JSON file cu {nodes, edges} (scris de D20)
  --output <path>  : JSON file output (citit de worker-ul Node.js)

Anti-halucin. FAZA 9e:
  (A) cdlib Leiden algorithm, NU Louvain
  (B) Python3 subprocess, NU embedding în Node.js
  (C) Resolution 1.0 pentru Leiden standard, 1.5 pentru implicit
  (F) min_community_size = 3 — filtrăm comunități mici
  (G) Normalizare scoruri [0,1] pentru centrality

Input format (graph JSON):
  {
    "nodes": [{"id": "uuid", "index": 0, "properties": {...}}],
    "edges": [{"source": 0, "target": 1, "weight": 0.8, "type": "NEIGHBOR"}]
  }

Output leiden:
  {
    "communities": [[0, 1, 2], [3, 4]],
    "node_community_map": {"0": 0, "1": 0, "2": 0, "3": 1, "4": 1},
    "modularity": 0.42,
    "n_communities": 2,
    "filtered_by_min_size": 1
  }

Output centrality:
  {
    "nodes": [
      {
        "index": 0,
        "id": "uuid",
        "degree_centrality": 0.15,
        "betweenness_centrality": 0.08,
        "eigenvector_centrality": 0.33,
        "pagerank": 0.05
      }
    ]
  }
"""

import json
import sys
import argparse
import os
import traceback

try:
    import igraph as ig
except ImportError as exc:
    print(f"[leiden_service] ERROR: python3-igraph not installed: {exc}", file=sys.stderr)
    sys.exit(2)

try:
    import leidenalg
except ImportError as exc:
    print(f"[leiden_service] ERROR: leidenalg not installed: {exc}", file=sys.stderr)
    sys.exit(2)

try:
    import numpy as np  # noqa: F401  (imported for leidenalg/scipy dependency)
except ImportError as exc:
    print(f"[leiden_service] ERROR: numpy not installed: {exc}", file=sys.stderr)
    sys.exit(2)

# ---------------------------------------------------------------------------
# Constante (Plan §X L2291)
# ---------------------------------------------------------------------------
MIN_COMMUNITY_SIZE = 3
LEIDEN_RESOLUTION_STANDARD = 1.0   # D21
LEIDEN_RESOLUTION_IMPLICIT = 1.5   # D24


# ---------------------------------------------------------------------------
# I/O helpers
# ---------------------------------------------------------------------------

def _load_graph_json(graph_path: str) -> dict:
    """Citește și returnează datele JSON ale graph-ului."""
    with open(graph_path, encoding="utf-8") as f:
        return json.load(f)


def _write_json(output_path: str, data: dict) -> None:
    """Scrie rezultatul JSON la output_path."""
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f)


def _empty_leiden_result(error_key: str) -> dict:
    """Returnează un rezultat Leiden gol cu cheia de eroare specificată."""
    return {
        "communities": [],
        "node_community_map": {},
        "modularity": 0.0,
        "n_communities": 0,
        "filtered_by_min_size": 0,
        "error": error_key,
    }


# ---------------------------------------------------------------------------
# Construcție graph igraph din input JSON
# ---------------------------------------------------------------------------

def _parse_edge(edge: dict, n: int) -> tuple[tuple[int, int], float] | None:
    """
    Parsează un edge din JSON. Returnează ((src, tgt), weight) sau None dacă invalid.
    Edge invalid: indici out-of-bounds, self-loop.
    """
    src = int(edge["source"])
    tgt = int(edge["target"])
    if src < 0 or src >= n or tgt < 0 or tgt >= n:
        return None
    if src == tgt:
        return None
    w = float(edge.get("weight", 1.0))
    if w <= 0:
        w = 0.001  # igraph needs positive weights
    return (src, tgt), w


def build_igraph(data: dict) -> ig.Graph:
    """
    Construiește graph igraph din formatul standard JSON al D20.

    Nodes: [{id, index, properties}]
    Edges: [{source, target, weight, type}]
    source/target sunt indecși întregi (0-based) — mapați din node IDs de D20.
    """
    nodes = data.get("nodes", [])
    edges_raw = data.get("edges", [])

    if not nodes:
        raise ValueError("Graph has no nodes")

    n = len(nodes)
    g = ig.Graph(n=n, directed=False)

    g.vs["node_id"] = [str(node.get("id", str(i))) for i, node in enumerate(nodes)]
    g.vs["node_index"] = list(range(n))

    edge_list = []
    weights = []
    for edge in edges_raw:
        parsed = _parse_edge(edge, n)
        if parsed is not None:
            (src, tgt), w = parsed
            edge_list.append((src, tgt))
            weights.append(w)

    if edge_list:
        g.add_edges(edge_list)
        g.es["weight"] = weights

    return g


# ---------------------------------------------------------------------------
# Leiden helpers — extrase pentru a reduce Cognitive Complexity
# ---------------------------------------------------------------------------

def _run_leiden_algo(g: ig.Graph, resolution: float):
    """
    Rulează algoritmul Leiden via leidenalg.find_partition cu RBConfigurationVertexPartition.

    RBConfigurationVertexPartition cu resolution_parameter:
      - resolution=1.0 → comunități standard (D21)
      - resolution=1.5 → comunități mai fine, sub-comunități (D24)

    Returnează obiectul Partition leidenalg (suportă iterare ca list[set[int]]).
    """
    weights_arg = "weight" if g.ecount() > 0 else None
    return leidenalg.find_partition(
        g,
        leidenalg.RBConfigurationVertexPartition,
        weights=weights_arg,
        resolution_parameter=resolution,
    )


def _filter_communities(raw_communities: list, min_size: int) -> tuple[list, int]:
    """Filtrează comunitățile sub min_size. Returnează (filtered, filtered_count)."""
    filtered_count = sum(1 for c in raw_communities if len(c) < min_size)
    filtered = [c for c in raw_communities if len(c) >= min_size]
    return filtered, filtered_count


def _build_community_map(communities: list) -> dict:
    """Construiește map node_index → community_index din lista de comunități."""
    node_community_map: dict[str, int] = {}
    for comm_idx, members in enumerate(communities):
        for node_idx in members:
            node_community_map[str(node_idx)] = comm_idx
    return node_community_map


def _compute_leiden_modularity(partition, g: ig.Graph, communities: list) -> float:
    """
    Calculează modularity Newman-Girvan via igraph (leidenalg direct API).
    Returnează 0.0 dacă nu există comunități sau edges.
    """
    if not communities or g.ecount() == 0:
        return 0.0
    try:
        weights_arg = "weight" if g.ecount() > 0 else None
        return float(g.modularity(partition.membership, weights=weights_arg))
    except Exception:  # noqa: BLE001
        return 0.0


# ---------------------------------------------------------------------------
# Acțiune: Leiden community detection
# ---------------------------------------------------------------------------

def run_leiden(
    graph_path: str,
    output_path: str,
    resolution: float = LEIDEN_RESOLUTION_STANDARD,
    min_community_size: int = MIN_COMMUNITY_SIZE,
) -> None:
    """
    Leiden community detection (Plan §X D21, D24). CC ≤ 15.
    Filtrează comunitățile cu < min_community_size membri.
    Calculează modularity Newman-Girvan.
    Output: communities, node_community_map, modularity, n_communities.
    """
    data = _load_graph_json(graph_path)
    nodes = data.get("nodes", [])

    if not nodes:
        _write_json(output_path, _empty_leiden_result("empty_graph"))
        return

    g = build_igraph(data)

    if g.vcount() == 0:
        _write_json(output_path, _empty_leiden_result("empty_graph_after_build"))
        return

    communities_obj = _run_leiden_algo(g, resolution)
    raw_communities = [list(c) for c in communities_obj]
    communities, filtered_count = _filter_communities(raw_communities, min_community_size)
    node_community_map = _build_community_map(communities)
    modularity_score = _compute_leiden_modularity(communities_obj, g, communities)

    result = {
        "communities": communities,
        "node_community_map": node_community_map,
        "modularity": round(modularity_score, 6),
        "n_communities": len(communities),
        "filtered_by_min_size": filtered_count,
    }
    _write_json(output_path, result)

    print(
        f"[leiden_service] Leiden done: {len(communities)} communities "
        f"(resolution={resolution}, filtered={filtered_count}), "
        f"modularity={modularity_score:.4f}",
        file=sys.stderr,
    )


# ---------------------------------------------------------------------------
# Centrality helpers — extrase pentru a reduce Cognitive Complexity
# ---------------------------------------------------------------------------

def _normalize_max(values: list[float], fallback: float = 1.0) -> list[float]:
    """Normalizează o listă la [0,1] prin împărțire la valoarea maximă."""
    max_val = max(values) if values else fallback
    if max_val == 0:
        max_val = fallback
    return [float(v) / max_val for v in values]


def _compute_degree_norm(g: ig.Graph) -> tuple[list[int], list[float]]:
    """Returnează (degrees_raw, degrees_normalized)."""
    degrees = g.degree()
    return degrees, _normalize_max([float(d) for d in degrees])


def _compute_betweenness_norm(g: ig.Graph, n: int) -> list[float]:
    """Calculează betweenness normalizat. Returnează [0.0]*n dacă fără edges."""
    if g.ecount() == 0:
        return [0.0] * n
    raw = g.betweenness(weights="weight")
    return _normalize_max([float(b) for b in raw])


def _compute_eigenvector_norm(g: ig.Graph, n: int) -> list[float]:
    """
    Calculează eigenvector centrality normalizat.
    Returnează [0.0]*n dacă nu converge sau graph cu un singur nod.
    """
    if g.ecount() == 0 or n <= 1:
        return [0.0] * n
    try:
        raw = g.eigenvector_centrality(directed=False, weights="weight")
        return _normalize_max([float(ev) for ev in raw])
    except Exception:  # noqa: BLE001
        return [0.0] * n


def _compute_pagerank_norm(g: ig.Graph, n: int) -> list[float]:
    """
    Calculează PageRank normalizat.
    Fallback uniform 1/n dacă fără edges sau eroare.
    """
    if g.ecount() == 0:
        uniform = 1.0 / n
        return [uniform] * n
    try:
        raw = g.pagerank(weights="weight")
        return _normalize_max([float(pr) for pr in raw])
    except Exception:  # noqa: BLE001
        uniform = 1.0 / n
        return [uniform] * n


def _build_centrality_output(
    g: ig.Graph,
    n: int,
    degrees: list[int],
    degree_norm: list[float],
    betweenness_norm: list[float],
    eigenvector_norm: list[float],
    pagerank_norm: list[float],
) -> list[dict]:
    """Construiește lista de noduri cu metrici per nod pentru output JSON."""
    node_ids = g.vs["node_id"]
    return [
        {
            "index": i,
            "id": str(node_ids[i]),
            "degree": int(degrees[i]),
            "degree_centrality": round(degree_norm[i], 6),
            "betweenness_centrality": round(betweenness_norm[i], 6),
            "eigenvector_centrality": round(eigenvector_norm[i], 6),
            "pagerank": round(pagerank_norm[i], 6),
        }
        for i in range(n)
    ]


# ---------------------------------------------------------------------------
# Acțiune: Centrality calculation
# ---------------------------------------------------------------------------

def run_centrality(graph_path: str, output_path: str) -> None:
    """
    Calculează metrici de centralitate pentru fiecare nod (Plan §X D22). CC ≤ 15.
      - degree_centrality (normalizat)
      - betweenness_centrality (normalizat)
      - eigenvector_centrality (normalizat)
      - pagerank (normalizat)

    Normalizare la [0,1] prin max-normalizare.
    """
    data = _load_graph_json(graph_path)
    nodes = data.get("nodes", [])

    if not nodes:
        _write_json(output_path, {"nodes": [], "error": "empty_graph"})
        return

    g = build_igraph(data)
    n = g.vcount()

    if n == 0:
        _write_json(output_path, {"nodes": [], "error": "empty_graph_after_build"})
        return

    degrees, degree_norm = _compute_degree_norm(g)
    betweenness_norm = _compute_betweenness_norm(g, n)
    eigenvector_norm = _compute_eigenvector_norm(g, n)
    pagerank_norm = _compute_pagerank_norm(g, n)

    output_nodes = _build_centrality_output(
        g, n, degrees, degree_norm, betweenness_norm, eigenvector_norm, pagerank_norm,
    )

    _write_json(output_path, {"nodes": output_nodes})
    print(f"[leiden_service] Centrality done: {n} nodes processed", file=sys.stderr)


# ---------------------------------------------------------------------------
# Main CLI
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Leiden Community Detection + Centrality Service pentru CerniqAPP E5",
    )
    parser.add_argument(
        "--action",
        required=True,
        choices=["leiden", "leiden_implicit", "centrality"],
        help="Acțiunea de executat",
    )
    parser.add_argument("--input", required=True, help="Calea fișierului JSON de input")
    parser.add_argument("--output", required=True, help="Calea fișierului JSON de output")
    parser.add_argument(
        "--resolution",
        type=float,
        default=None,
        help="Resolution parameter pentru Leiden (default: 1.0 sau 1.5 per acțiune)",
    )
    parser.add_argument(
        "--min-community-size",
        type=int,
        default=MIN_COMMUNITY_SIZE,
        help=f"Mărimea minimă a comunității (default: {MIN_COMMUNITY_SIZE})",
    )

    args = parser.parse_args()

    if not os.path.isfile(args.input):
        print(f"[leiden_service] ERROR: Input file not found: {args.input}", file=sys.stderr)
        sys.exit(1)

    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.isdir(output_dir):
        print(f"[leiden_service] ERROR: Output directory not found: {output_dir}", file=sys.stderr)
        sys.exit(1)

    try:
        if args.action == "leiden":
            resolution = args.resolution if args.resolution is not None else LEIDEN_RESOLUTION_STANDARD
            run_leiden(args.input, args.output, resolution=resolution, min_community_size=args.min_community_size)
        elif args.action == "leiden_implicit":
            resolution = args.resolution if args.resolution is not None else LEIDEN_RESOLUTION_IMPLICIT
            run_leiden(args.input, args.output, resolution=resolution, min_community_size=args.min_community_size)
        elif args.action == "centrality":
            run_centrality(args.input, args.output)

        sys.exit(0)

    except (ValueError, KeyError) as exc:
        print(f"[leiden_service] ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    except Exception as exc:  # noqa: BLE001
        print(f"[leiden_service] FATAL: {type(exc).__name__}: {exc}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
