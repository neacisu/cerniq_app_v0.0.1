#!/usr/bin/env python3
"""Produce NEURON_MATRIX.csv și NEURON_MATRIX.md — un rând per bloc v2 §6 + merge cu registry/catalog."""
from __future__ import annotations

import csv
from pathlib import Path

from _v2_neuron_parse import (
    confirmed_queue,
    parse_neuron_blocks,
    slug_queue,
    stage_family,
)
from neuron_code_evidence import load_catalog_index, reset_catalog_cache

ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / "v2_cerniq_cognitive_brain_master_implementation_plan.md"
OUT_CSV = ROOT / "NEURON_MATRIX.csv"
OUT_MD = ROOT / "NEURON_MATRIX.md"
REPO = ROOT.parent.parent
REGISTRY = REPO / "workers" / "shared" / "src" / "queue-registry.ts"
CATALOG = REPO / "packages" / "shared" / "src" / "cognitive-node-catalog.ts"


def in_registry(q: str) -> str:
    if not REGISTRY.is_file():
        return ""
    t = REGISTRY.read_text(encoding="utf-8")
    if f'"{q}"' in t or f"'{q}'" in t:
        return "yes"
    return "no"


def catalog_nodekey_for_queue(q: str) -> str:
    if not CATALOG.is_file():
        return ""
    reset_catalog_cache()
    ent = load_catalog_index(CATALOG).get(q)
    return ent.node_key if ent else ""


def main() -> None:
    blocks = parse_neuron_blocks(V2)
    rows = []
    for b in sorted(blocks, key=lambda x: (x.line_start,)):
        st, fam = stage_family(b)
        q = confirmed_queue(b)
        slug = slug_queue(q)
        contract_rel = f"docs/CognitiveBrain/contracts/neurons/{st}/{slug}.md"
        rows.append(
            {
                "v2_line": str(b.line_start),
                "v2_queue": q,
                "stage": st,
                "family": fam,
                "v2_dup2": "yes" if b.is_dup2 else "no",
                "contract_path": contract_rel,
                "group_key": f"{st}|{slug}",
                "catalog_nodekey_v2": b.fields.get("Catalog nodeKey", ""),
                "catalog_nodekey_parsed": catalog_nodekey_for_queue(q),
                "queue_in_registry": in_registry(q),
            }
        )

    fieldnames = list(rows[0].keys()) if rows else []
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    # Markdown sumar
    md = [
        "# NEURON_MATRIX",
        "",
        "Generat de `docs/CognitiveBrain/scripts/build_neuron_matrix.py`. Un rând per antet `### NEURON` din v2 §6.",
        "",
        f"- Rânduri: **{len(rows)}** (așteptat 324).",
        "- `contract_path`: ținta unică per `(stage, slug)`; blocurile «duplicat #2» cu aceeași etapă și coadă împart fișierul.",
        "",
        "## Coloane",
        "",
        "| Coloană | Semnificație |",
        "| --- | --- |",
        "| v2_line | Linie aproximativă în v2 (antet NEURON) |",
        "| v2_queue | Confirmed queue field / antet |",
        "| contract_path | Fișier contract |",
        "| queue_in_registry | `yes` / `no` (căutare literală în queue-registry.ts) |",
        "",
        "## Excerpt (primele 15 rânduri)",
        "",
    ]
    excerpt_cols = ["v2_line", "v2_queue", "stage", "contract_path"]
    excerpt = rows[:15]
    if excerpt:
        md.append("| " + " | ".join(excerpt_cols) + " |")
        md.append("| " + " | ".join("---" for _ in excerpt_cols) + " |")
        for r in excerpt:
            md.append("| " + " | ".join(r[h] for h in excerpt_cols) + " |")
    md.append("")
    md.append("Fișier complet: [`NEURON_MATRIX.csv`](NEURON_MATRIX.csv).")
    md.append("")
    OUT_MD.write_text("\n".join(md), encoding="utf-8")
    print(f"Wrote {OUT_CSV} ({len(rows)} rows) and {OUT_MD}")


if __name__ == "__main__":
    main()
