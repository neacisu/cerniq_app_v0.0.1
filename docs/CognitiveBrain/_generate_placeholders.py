#!/usr/bin/env python3
"""Generează placeholder-e pentru neuroni și sinapse din planul master."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
MASTER = ROOT.parent / "cerniq_cognitive_brain_master_implementation_plan.md"


def slug_queue(name: str) -> str:
    s = re.sub(r"[^\w\-.]+", "--", name.strip())
    return s.strip("-").lower() or "unnamed"


def compact_two_col(header: tuple[str, str], body: list[tuple[str, str]]) -> str:
    """Tabel Markdown MD060 stil compact (spații în jurul `|` și separator | --- |)."""
    lines = [
        f"| {header[0]} | {header[1]} |",
        "| --- | --- |",
    ]
    lines.extend(f"| {a} | {b} |" for a, b in body)
    return "\n".join(lines)


def parse_neurons(text: str) -> list[tuple[str, str, str]]:
    """Returnează liste de (queue_name, stage, family)."""
    out: list[tuple[str, str, str]] = []
    for m in re.finditer(r"^### NEURON `([^`]+)`\s*$", text, re.MULTILINE):
        start = m.end()
        block = text[start : start + 2500]
        st = re.search(r"^\-\s\*\*Stage:\*\*\s*(E[1-5])", block, re.MULTILINE)
        fam = re.search(r"^\-\s\*\*Family:\*\*\s*(\S+)", block, re.MULTILINE)
        stage = st.group(1) if st else "E?"
        family = fam.group(1) if fam else "unknown"
        out.append((m.group(1), stage, family))
    return out


def parse_synapses(text: str) -> list[str]:
    start = re.search(
        r"^## 7\. Complete synapse contract register\s*$",
        text,
        re.MULTILINE,
    )
    end = re.search(r"^## 8\.", text, re.MULTILINE)
    if not start or not end or end.start() <= start.end():
        return []
    chunk = text[start.start() : end.start()]
    return re.findall(r"^### SYNAPSE `([^`]+)`\s*$", chunk, re.MULTILINE)


def neuron_doc(queue: str, stage: str, family: str) -> str:
    table = compact_two_col(
        ("Câmp", "Valoare (din export/plan)"),
        [
            ("Etapă", stage),
            ("Familie", f"`{family}`"),
            ("Coadă", f"`{queue}`"),
        ],
    )
    return f"""# Neuron `{queue}`

> **Status:** placeholder — textul canonic complet este în `docs/cerniq_cognitive_brain_master_implementation_plan.md`, secțiunea *Complete neuron contract register*.

{table}

Migră aici câmpurile detaliate (graf, telemetrie, model, guardrail) din planul master.
"""


def synapse_doc(name: str) -> str:
    table = compact_two_col(
        ("Câmp", "Valoare"),
        [("Identificator sinapsă", f"`{name}`")],
    )
    return f"""# Sinapsă `{name}`

> **Status:** placeholder — textul canonic complet este în `docs/cerniq_cognitive_brain_master_implementation_plan.md`, secțiunea *Complete synapse contract register*.

{table}

Completează sursă, țintă, tip muchie, descriere și statusuri (payload, retry, siguranță, telemetrie) din planul master.
"""


def main() -> None:
    if not MASTER.is_file():
        raise SystemExit(f"Lipsește planul master: {MASTER}")

    text = MASTER.read_text(encoding="utf-8")
    neurons_dir = ROOT / "contracts" / "neurons"
    synapses_dir = ROOT / "contracts" / "synapses"

    for d in (neurons_dir, synapses_dir):
        d.mkdir(parents=True, exist_ok=True)

    seen_syn: set[str] = set()
    n_count = 0
    for queue, stage, family in parse_neurons(text):
        sub = neurons_dir / stage
        sub.mkdir(parents=True, exist_ok=True)
        path = sub / f"{slug_queue(queue)}.md"
        path.write_text(neuron_doc(queue, stage, family), encoding="utf-8")
        n_count += 1

    s_count = 0
    for sname in parse_synapses(text):
        if sname in seen_syn:
            raise SystemExit(f"Nume sinapsă duplicat: {sname}")
        seen_syn.add(sname)
        path = synapses_dir / f"{slug_queue(sname)}.md"
        path.write_text(synapse_doc(sname), encoding="utf-8")
        s_count += 1

    print(f"Scrie {n_count} neuroni în {neurons_dir}")
    print(f"Scrie {s_count} sinapse în {synapses_dir}")

    fam_root = ROOT / "adr" / "families"
    fam_n = 0
    for path in sorted(fam_root.rglob("*.md")):
        stage_dir = path.parent.name
        stage = "E" + stage_dir[1:]
        family = path.stem
        table = compact_two_col(
            ("Câmp", "Notă"),
            [("Etapă", stage), ("Familie", f"`{family}`")],
        )
        body = f"""# ADR-FAMILY-{stage_dir}-{family}

> **Placeholder** — copiază secțiunea `### ADR-FAMILY-{stage_dir}-{family}` din `docs/cerniq_cognitive_brain_master_implementation_plan.md`.

{table}

Completează: dovezi confirmate, decizie de guvernanță familială, limite de dovadă.
"""
        path.write_text(body.rstrip() + "\n", encoding="utf-8")
        fam_n += 1
    print(f"Actualizează {fam_n} ADR-FAMILY în {fam_root}")


if __name__ == "__main__":
    main()
