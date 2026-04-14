#!/usr/bin/env python3
"""Mută contractele din contracts/synapses/*.md în structură pe **traseu sinaptic** + `_graph-plan/`.

Un traseu = un subdirector care conține manifestul `*-family.md` (convenție istorică de nume) și
toate fișierele al căror identificator începe cu același slug. Pasul următor plasează traseele sub
**areale sinaptice**: `migrate_synapse_areal_layout.py`.

Rulare (din root repo):
  python3 docs/CognitiveBrain/scripts/migrate_synapse_contracts_to_family_dirs.py
  python3 docs/CognitiveBrain/scripts/migrate_synapse_contracts_to_family_dirs.py --dry-run

Idempotent: dacă nu mai există fișiere .md direct în synapses/ (în afară de README opțional),
scrie mesaj și ieșire 0.
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
SYN = REPO / "docs" / "CognitiveBrain" / "contracts" / "synapses"
GRAPH = SYN / "_graph-plan"


def _pathway_slugs_from_manifest() -> set[str]:
    """Slug-uri de traseu din fișierele manifest `*-family.md` (convenție istorică de nume)."""
    return {p.name[: -len("-family.md")] for p in SYN.glob("*-family.md") if p.is_file()}


def _longest_pathway_prefix(name: str, ordered: list[str]) -> str | None:
    for prefix in ordered:
        if name == prefix or name.startswith(prefix + "-"):
            return prefix
    return None


def _dest_for(
    path: Path, pathway_slugs: set[str], ordered: list[str]
) -> tuple[Path, str]:
    """Întoarce (cale_destinație_relativă_SYN, motiv_bucket)."""
    stem = path.stem
    if stem.endswith("-family"):
        tr = stem[: -len("-family")]
        if tr not in pathway_slugs:
            msg = f"Manifest traseu fără slug în set: {path.name}"
            raise SystemExit(msg)
        return SYN / tr / path.name, "pathway_root"
    matched = _longest_pathway_prefix(stem, ordered)
    if matched is not None:
        return SYN / matched / path.name, "pathway_member"
    if stem.endswith("-stage"):
        return GRAPH / "stage" / path.name, "graph_stage"
    if stem.endswith("-familyflow"):
        return GRAPH / "familyflow" / path.name, "graph_familyflow"
    if stem.endswith("-cross"):
        return GRAPH / "cross" / path.name, "graph_cross"
    raise SystemExit(f"Nu pot clasifica: {path.name}")


def _git_mv(src: Path, dest: Path, dry_run: bool) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dry_run:
        print(f"mv {src.relative_to(REPO)} -> {dest.relative_to(REPO)}")
        return
    subprocess.run(
        ["git", "mv", str(src), str(dest)],
        cwd=REPO,
        check=True,
    )


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="Afișează mutările fără a executa git mv.",
    )
    args = ap.parse_args()

    if not SYN.is_dir():
        print(f"Lipsește directorul {SYN}", file=sys.stderr)
        sys.exit(2)

    flat = sorted(p for p in SYN.glob("*.md") if p.is_file())
    if not flat:
        print("Nu există fișiere .md la rădăcina synapses/ — migrarea pare deja aplicată.")
        return

    pathway_slugs = _pathway_slugs_from_manifest()
    ordered = sorted(pathway_slugs, key=len, reverse=True)

    for p in flat:
        if p.name == "README.md":
            continue
        dest, _ = _dest_for(p, pathway_slugs, ordered)
        _git_mv(p, dest, args.dry_run)

    if args.dry_run:
        print("(dry-run) rulare fără modificări.")
    else:
        print(f"Mutate {len([x for x in flat if x.name != 'README.md'])} fișiere.")


if __name__ == "__main__":
    main()
