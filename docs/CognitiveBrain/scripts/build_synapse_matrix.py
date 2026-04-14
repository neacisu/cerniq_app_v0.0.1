#!/usr/bin/env python3
"""Generează SYNAPSE_MATRIX.csv și SYNAPSE_MATRIX.md din structura contracts/synapses/."""
from __future__ import annotations

import csv
import sys
from collections import defaultdict
from pathlib import Path

from synaptic_areal_pathway_map import GRAPH_PLAN_TOPOLOGY_DIR

ROOT = Path(__file__).resolve().parents[1]
SYN = ROOT / "contracts" / "synapses"
OUT_CSV = ROOT / "SYNAPSE_MATRIX.csv"
OUT_MD = ROOT / "SYNAPSE_MATRIX.md"
REPO_ROOT = ROOT.parent.parent

_MD_SEP_2 = "| --- | --- |"
_MD_SEP_4 = "| --- | --- | --- | --- |"
_MD_SEP_5 = "| --- | --- | --- | --- | --- |"


def _bucket_for(rel: Path) -> str:
    parts = rel.parts
    if (
        len(parts) >= 2
        and parts[0] == GRAPH_PLAN_TOPOLOGY_DIR
        and parts[1] in ("stage", "familyflow", "cross")
    ):
        return f"graph_{parts[1]}"
    return "pathway"


def _areal_and_pathway(rel: Path, bucket: str) -> tuple[str, str]:
    if not rel.parts:
        return "", ""
    areal_dir = rel.parts[0]
    if bucket.startswith("graph_"):
        return areal_dir, ""
    if len(rel.parts) >= 2:
        return areal_dir, rel.parts[1]
    return areal_dir, ""


def collect_rows() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    if not SYN.is_dir():
        print(f"Lipsește {SYN}", file=sys.stderr)
        sys.exit(2)
    for md in sorted(SYN.rglob("*.md")):
        rel_syn = md.relative_to(SYN)
        if rel_syn.parts and rel_syn.parts[-1] == "README.md" and len(rel_syn.parts) == 1:
            continue
        repo_rel = md.relative_to(REPO_ROOT)
        stem = md.stem
        bucket = _bucket_for(rel_syn)
        areal_dir, pathway_slug = _areal_and_pathway(rel_syn, bucket)
        rows.append(
            {
                "synapse_id": stem,
                "bucket": bucket,
                "areal_dir": areal_dir,
                "pathway_slug": pathway_slug,
                "contract_path": str(repo_rel).replace("\\", "/"),
            }
        )
    return rows


def write_csv(rows: list[dict[str, str]]) -> None:
    fieldnames = ["synapse_id", "bucket", "areal_dir", "pathway_slug", "contract_path"]
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def write_md(rows: list[dict[str, str]]) -> None:
    by_bucket: dict[str, int] = defaultdict(int)
    by_areal: dict[str, int] = defaultdict(int)
    by_pathway: dict[str, int] = defaultdict(int)
    has_manifest: dict[str, bool] = defaultdict(bool)
    pathway_areal: dict[str, str] = {}
    for r in rows:
        by_bucket[r["bucket"]] += 1
        by_areal[r["areal_dir"]] += 1
        if r["pathway_slug"]:
            by_pathway[r["pathway_slug"]] += 1
            pathway_areal[r["pathway_slug"]] = r["areal_dir"]
            if r["synapse_id"].endswith("-family"):
                has_manifest[r["pathway_slug"]] = True

    n = len(rows)
    n_path = len(by_pathway)
    n_missing_manifest = sum(1 for s in by_pathway if not has_manifest[s])

    lines = [
        "# SYNAPSE_MATRIX",
        "",
        "Generat de `docs/CognitiveBrain/scripts/build_synapse_matrix.py`. Un rând per fișier contract sinapsă (fără `synapses/README.md`).",
        "",
        "**Termeni:** **areal sinaptic** = director de nivel 1 (agregare funcțională); **traseu sinaptic** = subdirector al unui areal (contracte cu același stem canonic). `graph-plan/` = sinapse de topologie plan exportat.",
        "",
        f"- Contracte sinapsă indexate: **{n}** (așteptat **2305**).",
        f"- **Areale sinaptice** (nivel 1 sub `synapses/`): **{len(by_areal)}**.",
        f"- **Trasee sinaptice** distincte: **{n_path}**.",
        "",
        "## Structură directoare (contracte)",
        "",
        "| Zonă | Semnificație |",
        _MD_SEP_2,
        "| `contracts/synapses/<areal>/` | **Areal sinaptic** — regiune de grupare a traseelor; mapare în `synaptic_areal_pathway_map.py`. |",
        "| `contracts/synapses/<areal>/<traseu>/` | **Traseu sinaptic** — slug = numele directorului; reper: fișier manifest `*-family.md` (convenție nume istorică). |",
        f"| `contracts/synapses/{GRAPH_PLAN_TOPOLOGY_DIR}/stage/` | Sinapse `-stage` (registru §7 / plan exportat). |",
        f"| `contracts/synapses/{GRAPH_PLAN_TOPOLOGY_DIR}/familyflow/` | Sinapse `-familyflow`. |",
        f"| `contracts/synapses/{GRAPH_PLAN_TOPOLOGY_DIR}/cross/` | Sinapse `-cross`. |",
        "",
        "**Migrare:** `python3 docs/CognitiveBrain/scripts/migrate_synapse_contracts_to_family_dirs.py` apoi `python3 docs/CognitiveBrain/scripts/migrate_synapse_areal_layout.py`.",
        "",
        "## Rezumat pe areal sinaptic (`areal_dir`)",
        "",
        "| areal_dir | fișiere |",
        _MD_SEP_2,
    ]
    for a in sorted(by_areal.keys()):
        lines.append(f"| `{a}` | {by_areal[a]} |")
    lines.extend(
        [
            "",
            "## Rezumat pe bucket (`bucket`)",
            "",
            "| bucket | fișiere |",
            _MD_SEP_2,
        ]
    )
    for b in sorted(by_bucket.keys()):
        lines.append(f"| `{b}` | {by_bucket[b]} |")
    lines.extend(
        [
            "",
            "## Integritate traseu (manifest)",
            "",
            f"- Trasee fără fișier manifest `*-family.md`: **{n_missing_manifest}**.",
            "",
            "## Catalog trasee sinaptice (rezumat)",
            "",
            "| areal_dir | pathway_slug | md_count | has_pathway_manifest |",
            _MD_SEP_4,
        ]
    )
    for slug in sorted(by_pathway.keys()):
        cnt = by_pathway[slug]
        h = "yes" if has_manifest[slug] else "no"
        ad = pathway_areal.get(slug, "")
        lines.append(f"| `{ad}` | `{slug}` | {cnt} | {h} |")

    lines.extend(
        [
            "",
            "## Coloane (CSV)",
            "",
            "| Coloană | Semnificație |",
            _MD_SEP_2,
            "| synapse_id | Stem fișier (identificator sinapsă în contract). |",
            "| bucket | `pathway` (sub areal/traseu) sau `graph_stage` / `graph_familyflow` / `graph_cross`. |",
            f"| areal_dir | Director de nivel 1 sub `synapses/` (inclusiv `{GRAPH_PLAN_TOPOLOGY_DIR}` pentru topologie plan). |",
            "| pathway_slug | Pentru `pathway`, directorul traseului; gol pentru bucket-uri graph. |",
            "| contract_path | Cale relativă la root repo. |",
            "",
            "## Excerpt (primele 20 rânduri)",
            "",
            "| synapse_id | bucket | areal_dir | pathway_slug | contract_path |",
            _MD_SEP_5,
        ]
    )
    for r in rows[:20]:
        lines.append(
            f"| `{r['synapse_id']}` | `{r['bucket']}` | `{r['areal_dir']}` | `{r['pathway_slug']}` | `{r['contract_path']}` |"
        )
    lines.extend(
        [
            "",
            "Fișier complet: [`SYNAPSE_MATRIX.csv`](SYNAPSE_MATRIX.csv).",
            "",
        ]
    )
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    rows = collect_rows()
    write_csv(rows)
    write_md(rows)
    print(f"Scrie {OUT_CSV.relative_to(REPO_ROOT)} ({len(rows)} rânduri)")
    print(f"Scrie {OUT_MD.relative_to(REPO_ROOT)}")


if __name__ == "__main__":
    main()
