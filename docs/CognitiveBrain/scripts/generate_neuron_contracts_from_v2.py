#!/usr/bin/env python3
"""Generează structura contractelor din v2 §6. Coloana «În cod (dovadă)» = placeholder pentru research manual — fără „audit” generat automat."""
from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path

from _v2_neuron_parse import (
    NeuronBlock,
    confirmed_queue,
    group_key,
    parse_neuron_blocks,
    slug_queue,
    stage_family,
)

ROOT = Path(__file__).resolve().parents[1]
V2 = ROOT / "v2_cerniq_cognitive_brain_master_implementation_plan.md"
NEURONS = ROOT / "contracts" / "neurons"
REPO = ROOT.parent.parent
REGISTRY = REPO / "workers" / "shared" / "src" / "queue-registry.ts"
CATALOG = REPO / "packages" / "shared" / "src" / "cognitive-node-catalog.ts"

GEN_DATE = "2026-04-11"

# Dacă acest marker apare în fișier, regenerarea fără `--force` sare peste fișier (contract considerat închis de autor).
AUTHOR_COMPLETE_MARKER = "<!-- neuron-contract:author-complete -->"

S2 = frozenset(
    {"DeliberativeNeuron", "ExecutiveNeuron", "PredictiveNeuron", "EmotionNeuron"}
)
S1 = frozenset(
    {"ProceduralNeuron", "ReflexNeuron", "RulesNeuron", "AutonomicNeuron"}
)


def sofai_line(nt: str) -> str:
    nt = nt.strip("` ")
    if nt in S2:
        return "System2 (deliberativ) — clasificare din v2 §2.1 (SOFAI)."
    if nt in S1:
        return "System1 (reactiv) — clasificare din v2 §2.1 (SOFAI)."
    return f"Tip `{nt}` — mapare SOFAI: vezi v2 §2.1; nu forțați System1/2 fără sursă suplimentară."


def neuron_type(fields: dict[str, str]) -> str:
    return fields.get("Neuron type", fields.get("Inferred neuron type", "")).strip("` ")


def esc(s: str) -> str:
    return s.replace("\r", "").strip()


def in_registry_literal(q: str) -> bool:
    if not REGISTRY.is_file():
        return False
    t = REGISTRY.read_text(encoding="utf-8")
    return f'"{q}"' in t or f"'{q}'" in t


def catalog_nodekey_n_calls(q: str) -> str:
    """Potrivire mecanică în `n(` din catalog; goală dacă lipsește intrarea."""
    try:
        from neuron_code_evidence import load_catalog_index, reset_catalog_cache

        reset_catalog_cache()
        ent = load_catalog_index(CATALOG).get(q)
        return ent.node_key if ent else ""
    except Exception:
        return ""


def build_selfaware_table(blocks: list[NeuronBlock], primary_queue: str) -> str:
    """Tabel 1–13. «În cod» = placeholder identic până la research manual (fără rg/heuristic)."""
    b0 = blocks[0]
    f0 = b0.fields
    st, fam = stage_family(b0)
    nt = neuron_type(f0)
    swim = f0.get("Swimlane", "—")
    crit = f0.get("Criticality", f0.get("Inferred criticality", "—"))
    nodekey_v2 = f0.get("Catalog nodeKey", "")
    model_routing = f0.get("Model routing", "")

    lim = "v2 §2.4 — completare «În cod» doar după citire cod/teste; fără presupuneri între neuroni."
    lim8 = "N/A — Non-AI în v2" if "Non-AI" in model_routing else lim

    ph = (
        "**TODO manual (DOD 0–4):** parcurgeți v2 → catalog → registry → handler/payload → teste; "
        "notați fișier + simbol sau «lipsă la audit». Interzis completarea din șabloane familie sau din script."
    )
    ck = catalog_nodekey_n_calls(primary_queue)
    reg = in_registry_literal(primary_queue)
    row1_in = (
        ph
        + f" Indiciu mecanic (nu substituie citirea codului): registry literal `{'da' if reg else 'nu'}`; "
        f"catalog `n(` `nodeKey`: `{ck or '— (gap)'}`."
    )

    rows = [
        ("1", "Identitate canonică", row1_in, f"v2: `{primary_queue}`; Catalog nodeKey (v2 bloc): `{nodekey_v2 or '—'}`", lim),
        ("2", "Etapă, familie, swimlane", ph, f"Etapă `{st}`, familie `{fam}`, swimlane `{swim}` (v2).", lim),
        (
            "3",
            "Rol declarat",
            ph,
            esc(
                f"Funcție cognitivă: {f0.get('Cognitive function (from catalog)', f0.get('Operational purpose', '—'))}; "
                f"analogie: {f0.get('Biological analogy', '—')}"
            ),
            lim,
        ),
        ("4", f"NeuronType + SOFAI (`{nt or '—'}`)", ph, sofai_line(nt or "Unknown"), lim),
        ("5", "Criticitate", ph, f"`{crit}` (v2).", lim),
        (
            "6",
            "Înveliș telemetrie",
            ph,
            f"OTel span (v2): `{f0.get('OTel span name', '—')}`; "
            "mapare `cognitive.nodeKey` vs `cognitive.neuron.*`: vezi ADR-0003 + `withCognitiveSpan`.",
            lim,
        ),
        (
            "7",
            "Înveliș politică",
            ph,
            f"Autonomy tier (v2): `{f0.get('Autonomy tier', '—')}`; "
            f"Guardrail/HITL policy (v2): {esc(f0.get('Guardrail/HITL policy', '—')[:200])}…"
            if len(f0.get("Guardrail/HITL policy", "")) > 200
            else f"Autonomy tier (v2): `{f0.get('Autonomy tier', '—')}`; "
            f"Guardrail/HITL policy (v2): {f0.get('Guardrail/HITL policy', '—')}",
            lim,
        ),
        ("8", "Rutare model (dacă AI)", ph, esc(model_routing), lim8),
        (
            "9",
            "Guardrails",
            ph,
            "NeMo / verificări deterministe; țintă ADR-0007; detaliu per-neuron numai cu cod.",
            lim,
        ),
        (
            "10",
            "Escaladare HITL",
            ph,
            "Motor transversal: ADR-0008; cozi `human:*` / `hitl:*`: verificare registry la audit manual.",
            lim,
        ),
        ("11", "Micro-OODA", ph, esc(f0.get("OODA micro-cycle", "—")), lim),
        (
            "12",
            "Tier + de-escaladare",
            ph,
            "Trigger-e (încredere, 2σ, schemă API): invariant numai dacă apare în cod/test la audit.",
            lim,
        ),
        (
            "13",
            "Stack v2 §2.3 (subset)",
            ph,
            "BullMQ, Kafka, SGLang, … — versiuni în v2 §2.3 + ADR-uri.",
            lim,
        ),
    ]

    T = "\u021a"
    lines = [
        f"| # | Criteriu | În cod (dovadă) | {T}intă v2 / research | Limită evidență |",
        "| --- | --- | --- | --- | --- |",
    ]
    for r in rows:
        lines.append(f"| {r[0]} | {r[1]} | {r[2]} | {r[3]} | {r[4]} |")
    return "\n".join(lines)


def adr_rel(stage: str, family: str) -> str:
    ed = stage.replace("E", "e").lower()
    return f"../../adr/families/{ed}/{family}.md"


_KEYS_SHOW = [
    "Stage",
    "Family",
    "Catalog nodeKey",
    "Neuron type",
    "Inferred neuron type",
    "Swimlane",
    "Criticality",
    "Inferred criticality",
    "Autonomy tier",
    "Contract evidence status",
]

_EXTRAS_KEYS = (
    "OODA micro-cycle",
    "Model routing",
    "Guardrail/HITL policy",
    "Prometheus metrics",
    "OTel span name",
)


def _metadata_table(st: str, slug: str, q: str, fam0: str) -> str:
    meta_rows = [
        ("v2_queue", f"`{q}`"),
        ("etapa", st),
        ("familie (v2, prima instanță)", f"`{fam0}`"),
        ("contract_path", f"`contracts/neurons/{st}/{slug}.md`"),
        ("ADR familie (indicativ)", f"[{fam0}]({adr_rel(st, fam0)})"),
    ]
    body = "\n".join(f"| {a} | {b} |" for a, b in meta_rows)
    return "| Câmp | Valoare |\n| --- | --- |\n" + body


def _purpose_from_blocks(blocks: list[NeuronBlock]) -> str:
    purpose_bits: list[str] = []
    seen_p: set[str] = set()
    for b in blocks:
        p = b.fields.get("Operational purpose", "").strip()
        if p and p not in seen_p:
            seen_p.add(p)
            purpose_bits.append(p)
    return " ".join(purpose_bits).strip().rstrip(".")


def _scop_paragraph(purpose: str) -> str:
    return (
        f"**Scop declarat în v2:** {purpose or '—'}. "
        "**Comportament în repo:** neaudit până la research manual (DOD 0): handler BullMQ/API, payload, teste — vezi `_CONTRACT_SCHEMA.md`. "
        "Acest text nu trebuie generat sau extins automat de scripturi; doar de autor după dovezi."
    )


def _surse_audit_lines(blocks: list[NeuronBlock]) -> list[str]:
    return [
        f"- v2 §6: `{V2.relative_to(REPO)}` — linia ~{blocks[0].line_start} (`### NEURON`).",
        "- Schema: [`_CONTRACT_SCHEMA.md`](_CONTRACT_SCHEMA.md).",
        "- Checklist: [`CONTRACT_AUTHORING_CHECKLIST.md`](CONTRACT_AUTHORING_CHECKLIST.md).",
    ]


def _one_instance_md(i: int, b: NeuronBlock) -> str:
    _, fam_b = stage_family(b)
    dup = " — v2 «duplicat #2»" if b.is_dup2 else ""
    lines_i = [f"### Instanță {i}{dup} — `{fam_b}` (linia v2 ~{b.line_start})", ""]
    for k in _KEYS_SHOW:
        if k in b.fields:
            lines_i.append(f"- **{k}:** {b.fields[k]}")
    return "\n".join(lines_i)


def _instances_v2_md(blocks: list[NeuronBlock]) -> str:
    return "\n\n".join(_one_instance_md(i, b) for i, b in enumerate(blocks, start=1))


def _extras_first_block_md(blocks: list[NeuronBlock]) -> str:
    lines = ["### Extras câmpuri v2 (prima instanță)", ""]
    f0 = blocks[0].fields
    for key in _EXTRAS_KEYS:
        if key in f0:
            lines.append(f"- **{key}:** {f0[key]}")
    return "\n".join(lines)


def _otel_section() -> str:
    return (
        "### Mapare OTel\n"
        "\n"
        "- **v2 / plan:** pot menționa `cognitive.neuron.id`, `cognitive.processing.stage`, etc.\n"
        "- **Cod:** `withCognitiveSpan` — `cognitive.nodeKey`, `cognitive.neuronType`, `cognitive.swimlane`, "
        "`cognitive.etapa`, `cognitive.function` (vezi `workers/shared/src/cognitive-helpers.ts`).\n"
        f"- **Stare la {GEN_DATE}:** neînchis până la research; marcați *aliniat* / *migrare planificată* cu dovezi în tabel."
    )


def render_contract(st: str, slug: str, blocks: list[NeuronBlock]) -> str:
    blocks = sorted(blocks, key=lambda b: b.line_start)
    q = confirmed_queue(blocks[0])
    _, fam0 = stage_family(blocks[0])

    meta = _metadata_table(st, slug, q, fam0)
    scop = _scop_paragraph(_purpose_from_blocks(blocks))
    surse = "\n".join(_surse_audit_lines(blocks))
    instances_txt = _instances_v2_md(blocks)
    extras_txt = _extras_first_block_md(blocks)
    table = build_selfaware_table(blocks, q)
    otel = _otel_section()

    return f"""# Neuron `{q}`

> **Status:** structură din v2 §6 ({GEN_DATE}). Coloana «În cod (dovadă)» = **placeholder** până la research manual. După DOD, adăugați `{AUTHOR_COMPLETE_MARKER}` ca să blocați regenerarea accidentală.

## Metadata

{meta}

## Scop în context real

{scop}

## Surse audit

{surse}

## Instanțe v2

{instances_txt}

{extras_txt}

## Tabel self-aware (13 criterii)

{table}

{otel}

---
*Generator:* `docs/CognitiveBrain/scripts/generate_neuron_contracts_from_v2.py`
"""


def _skip_author_complete(path: Path, force: bool) -> bool:
    if not path.is_file() or force:
        return False
    return AUTHOR_COMPLETE_MARKER in path.read_text(encoding="utf-8")


def _write_contract_groups(
    groups: dict[tuple[str, str], list[NeuronBlock]], force: bool
) -> tuple[int, int]:
    written = 0
    skipped = 0
    for st, slug in sorted(groups.keys(), key=lambda x: (x[0], x[1])):
        sub = NEURONS / st
        sub.mkdir(parents=True, exist_ok=True)
        path = sub / f"{slug}.md"
        if _skip_author_complete(path, force):
            skipped += 1
            continue
        path.write_text(render_contract(st, slug, groups[(st, slug)]), encoding="utf-8")
        written += 1
    return written, skipped


def _prune_orphan_contracts(groups: dict[tuple[str, str], list[NeuronBlock]]) -> int:
    valid = {(st, f"{slug}.md") for st, slug in groups}
    stages = {f"E{i}" for i in range(1, 6)}
    pruned = 0
    for stage_dir in NEURONS.iterdir():
        if not stage_dir.is_dir() or stage_dir.name not in stages:
            continue
        for f in stage_dir.glob("*.md"):
            if (stage_dir.name, f.name) not in valid:
                f.unlink()
                pruned += 1
    return pruned


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="Rescrie inclusiv fișiere cu marker author-complete.")
    ap.add_argument(
        "--prune-orphans",
        action="store_true",
        help="Sterge fisiere .md din E1-E5 care nu apar in v2 sectiunea 6 (dupa grupare).",
    )
    args = ap.parse_args()

    blocks = parse_neuron_blocks(V2)
    groups: dict[tuple[str, str], list[NeuronBlock]] = defaultdict(list)
    for b in blocks:
        groups[group_key(b)].append(b)

    NEURONS.mkdir(parents=True, exist_ok=True)
    written, skipped = _write_contract_groups(groups, args.force)
    pruned = _prune_orphan_contracts(groups) if args.prune_orphans else 0

    print(
        f"Blocuri v2: {len(blocks)}; grupuri (fișiere): {len(groups)}; "
        f"scrise: {written}; sărite: {skipped}; prune: {pruned}"
    )


if __name__ == "__main__":
    main()
