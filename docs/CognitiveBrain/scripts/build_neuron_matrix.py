#!/usr/bin/env python3
"""Produce NEURON_MATRIX.csv — un rând per bloc v2 (secțiunea 6) + catalog + registry + contract (metadata runtime).

Documentarea cu «Scop în context real» / scop_rational: fișier editorial `docs/CognitiveBrain/NEURON_MATRIX.md` (nu este suprascris de acest script)."""
from __future__ import annotations

import csv
import re
import sys
from pathlib import Path

from _v2_neuron_parse import (
    confirmed_queue,
    parse_neuron_blocks,
    slug_queue,
    stage_family,
)
from neuron_code_evidence import CatalogEntry, load_catalog_index, reset_catalog_cache

ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / "v2_cerniq_cognitive_brain_master_implementation_plan.md"
OUT_CSV = ROOT / "NEURON_MATRIX.csv"
REPO = ROOT.parent.parent
REGISTRY = REPO / "workers" / "shared" / "src" / "queue-registry.ts"
CATALOG = REPO / "packages" / "shared" / "src" / "cognitive-node-catalog.ts"

_METADATA_KEY_HINT = re.compile(
    r"runtime|coadă|cozi|mapare|aprox|lanț|canonic|semantic|efectiv|registry|\(graf\)",
    re.I,
)
_NODEKEY_RE = re.compile(r"^e[1-5](?::[a-z0-9_-]+)+$", re.I)
# Fără `\d` în aceeași clasă cu `a-z` (evită duplicate raportate de analizor pe clase).
_QUEUEISH_RE = re.compile(r"^[a-z][a-z0-9_]*(?::[a-z0-9_.-]+)+$", re.I)


def _metadata_body(md: str) -> str:
    i = md.find("## Metadata")
    if i < 0:
        return ""
    rest = md[i + len("## Metadata") :].lstrip("\n")
    j = rest.find("\n## ")
    return rest if j < 0 else rest[:j]


def _dedupe_strs(xs: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for x in xs:
        if x not in seen:
            seen.add(x)
            out.append(x)
    return out


def _append_queue_or_nodekey(piece: str, queues: list[str], nodekeys: list[str]) -> None:
    if not piece or "/" in piece:
        return
    if _NODEKEY_RE.match(piece):
        nodekeys.append(piece)
    elif _QUEUEISH_RE.match(piece):
        queues.append(piece)


def _consume_backtick_tokens(val: str, queues: list[str], nodekeys: list[str]) -> None:
    for raw in re.findall(r"`([^`]+)`", val):
        tok = raw.strip()
        if not tok or "/" in tok or tok.endswith(".md") or "http" in tok.lower():
            continue
        if _NODEKEY_RE.match(tok):
            nodekeys.append(tok)
            continue
        for piece in re.split(r"\s*→\s*|\s*\+\s*", tok):
            piece = piece.strip().strip("`").strip()
            piece = re.sub(r"\s*\([^)]*\)\s*$", "", piece).strip()
            _append_queue_or_nodekey(piece, queues, nodekeys)


def extract_contract_runtime_tokens(md: str) -> tuple[list[str], list[str]]:
    """Din tabelul Metadata: rânduri care descriu runtime → (cozi, nodeKey-uri explicite)."""
    body = _metadata_body(md)
    queues: list[str] = []
    nodekeys: list[str] = []
    if body:
        for line in body.splitlines():
            line = line.strip()
            if not line.startswith("|"):
                continue
            parts = [p.strip() for p in line.split("|")]
            if len(parts) < 3:
                continue
            key_cell, val_cell = parts[1], parts[2]
            if not _METADATA_KEY_HINT.search(key_cell):
                continue
            _consume_backtick_tokens(val_cell, queues, nodekeys)
    return _dedupe_strs(queues), _dedupe_strs(nodekeys)


def extract_identity_canonical_tokens(md: str) -> tuple[list[str], list[str]]:
    """Rândul |1 | … Identitate canonică | — backtick-uri din dovadă, cu excepții anti-halucinare."""
    queues: list[str] = []
    nodekeys: list[str] = []
    # «**Fără** coadă» = gap dedicat în registry pentru acest v2 — nu mapăm „Alternative:” la catalog.
    gap_fara_coada = re.compile(r"\*\*[Ff]ără\*\*\s+coadă")
    for line in md.splitlines():
        s = line.strip()
        if not s.startswith("| 1 |"):
            continue
        low = s.lower()
        if "identitate" not in low:
            continue
        if gap_fara_coada.search(s):
            continue
        _consume_backtick_tokens(s, queues, nodekeys)
    return _dedupe_strs(queues), _dedupe_strs(nodekeys)


def in_registry(reg_text: str, q: str) -> bool:
    return f'"{q}"' in reg_text or f"'{q}'" in reg_text


def registry_status(reg_text: str, v2_queue: str, extra_queues: list[str]) -> str:
    for q in [v2_queue, *extra_queues]:
        if in_registry(reg_text, q):
            return "yes"
    return "no"


def merged_catalog_nodekeys(
    cat: dict[str, CatalogEntry],
    v2_queue: str,
    extra_queues: list[str],
    explicit_nodekeys: list[str],
) -> str:
    """nodeKey-uri unice: explicite din contract + lookup catalog pentru cozi (v2 + extra)."""
    out: list[str] = []
    seen: set[str] = set()

    def add_nk(nk: str) -> None:
        nk = nk.strip()
        if nk and nk not in seen:
            seen.add(nk)
            out.append(nk)

    for nk in explicit_nodekeys:
        add_nk(nk)
    for q in [v2_queue, *extra_queues]:
        ent = cat.get(q)
        if ent:
            add_nk(ent.node_key)
    return "|".join(out)


def build_matrix_rows(
    cat: dict[str, CatalogEntry],
    reg_text: str,
) -> tuple[list[dict[str, str]], list[str]]:
    blocks = parse_neuron_blocks(V2)
    rows: list[dict[str, str]] = []
    missing_contracts: list[str] = []

    for b in sorted(blocks, key=lambda x: (x.line_start,)):
        st, fam = stage_family(b)
        q = confirmed_queue(b)
        slug = slug_queue(q)
        contract_rel = f"docs/CognitiveBrain/contracts/neurons/{st}/{slug}.md"
        contract_abs = REPO / contract_rel
        v2_nk = b.fields.get("Catalog nodeKey", "").strip().strip("`")

        extra_q: list[str] = []
        explicit_nk: list[str] = []
        if contract_abs.is_file():
            ctext = contract_abs.read_text(encoding="utf-8")
            q_meta, nk_meta = extract_contract_runtime_tokens(ctext)
            q_id, nk_id = extract_identity_canonical_tokens(ctext)
            extra_q = _dedupe_strs(q_meta + q_id)
            explicit_nk = _dedupe_strs(nk_meta + nk_id)
        else:
            missing_contracts.append(contract_rel)

        parsed_nk = merged_catalog_nodekeys(cat, q, extra_q, explicit_nk)

        rows.append(
            {
                "v2_line": str(b.line_start),
                "v2_queue": q,
                "stage": st,
                "family": fam,
                "v2_dup2": "yes" if b.is_dup2 else "no",
                "contract_path": contract_rel,
                "group_key": f"{st}|{slug}",
                "catalog_nodekey_v2": v2_nk,
                "catalog_nodekey_parsed": parsed_nk,
                "queue_in_registry": registry_status(reg_text, q, extra_q),
            }
        )
    return rows, missing_contracts


def _write_csv(rows: list[dict[str, str]]) -> None:
    fieldnames = list(rows[0].keys()) if rows else []
    OUT_CSV.parent.mkdir(parents=True, exist_ok=True)
    with OUT_CSV.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)


def main() -> None:
    reset_catalog_cache()
    cat = load_catalog_index(CATALOG) if CATALOG.is_file() else {}
    reg_text = REGISTRY.read_text(encoding="utf-8") if REGISTRY.is_file() else ""

    rows, missing_contracts = build_matrix_rows(cat, reg_text)
    _write_csv(rows)

    print(f"Wrote {OUT_CSV} ({len(rows)} rows)")
    if missing_contracts:
        print(f"WARNING: {len(missing_contracts)} contract paths missing on disk", file=sys.stderr)
        for p in missing_contracts[:20]:
            print(f"  - {p}", file=sys.stderr)
        if len(missing_contracts) > 20:
            print(f"  ... +{len(missing_contracts) - 20} more", file=sys.stderr)


if __name__ == "__main__":
    main()
