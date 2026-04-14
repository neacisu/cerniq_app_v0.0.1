#!/usr/bin/env python3
"""Plasează **traseele sinaptice** sub **areale sinaptice** în contracts/synapses/.

Rulare (din root repo):
  python3 docs/CognitiveBrain/scripts/migrate_synapse_areal_layout.py
  python3 docs/CognitiveBrain/scripts/migrate_synapse_areal_layout.py --dry-run

Precondiție: câte un director per **traseu** la rădăcina `synapses/`, plus eventual
`_graph-plan/{stage,familyflow,cross}` sau variantă veche echivalentă la nivel 1.

Idempotent: dacă nu mai sunt mutări de făcut, ieșire 0.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

from synaptic_areal_pathway_map import (
    ALL_SYNAPTIC_AREAL_DIRS,
    GRAPH_PLAN_TOPOLOGY_DIR,
    areal_dir_for_pathway,
    assert_pathway_prefixes_covered,
)

REPO = Path(__file__).resolve().parents[3]
SYN = REPO / "docs" / "CognitiveBrain" / "contracts" / "synapses"
LEGACY_GRAPH = SYN / "_graph-plan"
LEGACY_GRAPH_TOPLEVEL_ALT = SYN / "clan-graph-plan"
_LEGACY_TOPLEVEL_PREFIX = "clan-"


def _git_mv(src: Path, dest: Path, dry_run: bool) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dry_run:
        print(f"mv {src.relative_to(REPO)} -> {dest.relative_to(REPO)}")
        return
    subprocess.run(["git", "mv", str(src), str(dest)], cwd=REPO, check=True)


def _strip_prefixed_legacy_top_level(dry_run: bool) -> int:
    """Redenumește directoare cu prefix vechi la nivel 1 (ex. `clan-alerts` → `alerts`)."""
    moved = 0
    for p in sorted(SYN.iterdir(), key=lambda x: x.name):
        if not p.is_dir() or not p.name.startswith(_LEGACY_TOPLEVEL_PREFIX):
            continue
        short = p.name[len(_LEGACY_TOPLEVEL_PREFIX) :]
        dest = SYN / short
        if dest.exists():
            print(f"Sari (există deja): {dest.relative_to(REPO)}", file=sys.stderr)
            continue
        _git_mv(p, dest, dry_run)
        moved += 1
    return moved


def _migrate_legacy_graph(dry_run: bool) -> int:
    moved = 0
    for legacy_root in (LEGACY_GRAPH, LEGACY_GRAPH_TOPLEVEL_ALT):
        if not legacy_root.is_dir():
            continue
        for sub in ("stage", "familyflow", "cross"):
            src = legacy_root / sub
            if not src.is_dir():
                continue
            dest = SYN / GRAPH_PLAN_TOPOLOGY_DIR / sub
            if dest.exists():
                print(f"Sari (există deja): {dest.relative_to(REPO)}", file=sys.stderr)
                continue
            _git_mv(src, dest, dry_run)
            moved += 1
        if not dry_run and legacy_root.is_dir() and not any(legacy_root.iterdir()):
            legacy_root.rmdir()
    return moved


def _pathway_dirs_at_synapses_root() -> list[Path]:
    out: list[Path] = []
    for p in SYN.iterdir():
        if not p.is_dir():
            continue
        name = p.name
        if name in ALL_SYNAPTIC_AREAL_DIRS:
            continue
        if name.startswith(_LEGACY_TOPLEVEL_PREFIX):
            continue
        if name in (LEGACY_GRAPH.name, LEGACY_GRAPH_TOPLEVEL_ALT.name):
            continue
        out.append(p)
    return sorted(out)


def _migrate_pathways_under_areals(dry_run: bool) -> int:
    pathway_dirs = _pathway_dirs_at_synapses_root()
    slugs = {p.name for p in pathway_dirs}
    assert_pathway_prefixes_covered(slugs)
    moved = 0
    for src in pathway_dirs:
        areal = areal_dir_for_pathway(src.name)
        dest = SYN / areal / src.name
        if dest.exists():
            print(f"Sari (există deja): {dest.relative_to(REPO)}", file=sys.stderr)
            continue
        _git_mv(src, dest, dry_run)
        moved += 1
    return moved


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not SYN.is_dir():
        print(f"Lipsește {SYN}", file=sys.stderr)
        sys.exit(2)

    moved = (
        _strip_prefixed_legacy_top_level(args.dry_run)
        + _migrate_legacy_graph(args.dry_run)
        + _migrate_pathways_under_areals(args.dry_run)
    )

    if moved == 0:
        print("Nimic de mutat — layout areal/traseu pare deja aplicat.")
    elif args.dry_run:
        print(f"(dry-run) {moved} operații afișate.")
    else:
        print(f"Finalizat: {moved} mutări git.")


if __name__ == "__main__":
    main()
