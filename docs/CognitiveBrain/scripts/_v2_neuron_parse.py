"""Parse v2 §6 NEURON blocks — shared by matrix + contract generators."""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class NeuronBlock:
    queue_from_header: str
    is_dup2: bool
    raw_title_line: str
    body: str
    fields: dict[str, str] = field(default_factory=dict)
    line_start: int = 0


def slug_queue(name: str) -> str:
    s = re.sub(r"[^\w\-.]+", "--", name.strip())
    return s.strip("-").lower() or "unnamed"


def extract_section6(text: str) -> str:
    m = re.search(r"^## 6\.\s+Complete neuron contract register\s*$", text, re.MULTILINE)
    if not m:
        return ""
    start = m.end()
    m7 = re.search(r"^## 7\.\s", text[start:], re.MULTILINE)
    end = start + m7.start() if m7 else len(text)
    return text[start:end]


HEADER_RE = re.compile(r"^### NEURON `([^`]+)`(\s+— duplicat #2)?\s*$", re.MULTILINE)
FIELD_RE = re.compile(r"^- \*\*([^*]+):\*\*\s*(.+)$", re.MULTILINE)


def parse_fields(body: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for m in FIELD_RE.finditer(body):
        val = m.group(2).strip().strip("`").strip()
        out[m.group(1).strip()] = val
    return out


def parse_neuron_blocks(v2_path: Path) -> list[NeuronBlock]:
    text = v2_path.read_text(encoding="utf-8")
    chunk = extract_section6(text)
    if not chunk:
        raise SystemExit("v2: secțiunea ## 6. Complete neuron contract register lipsește")

    sec = re.search(r"^## 6\.\s+Complete neuron contract register\s*$", text, re.MULTILINE)
    section_base_line = text.count("\n", 0, sec.start()) + 1 if sec else 1

    blocks: list[NeuronBlock] = []
    for m in HEADER_RE.finditer(chunk):
        q = m.group(1)
        is_dup2 = bool(m.group(2))
        start = m.end()
        next_h = HEADER_RE.search(chunk, m.end())
        end = next_h.start() if next_h else len(chunk)
        body = chunk[start:end].strip()
        line_start = section_base_line + chunk[: m.start()].count("\n")
        fields = parse_fields(body)
        blocks.append(
            NeuronBlock(
                queue_from_header=q,
                is_dup2=is_dup2,
                raw_title_line=m.group(0).strip(),
                body=body,
                fields=fields,
                line_start=line_start,
            )
        )
    return blocks


def confirmed_queue(b: NeuronBlock) -> str:
    return b.fields.get("Confirmed queue field", b.queue_from_header).strip("` ")


def stage_family(b: NeuronBlock) -> tuple[str, str]:
    st = b.fields.get("Stage", "E?")
    fam = b.fields.get("Family", "unknown")
    return st, fam


def group_key(b: NeuronBlock) -> tuple[str, str]:
    st, _ = stage_family(b)
    q = confirmed_queue(b)
    return st, slug_queue(q)
