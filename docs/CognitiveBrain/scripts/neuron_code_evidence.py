#!/usr/bin/env python3
"""Opțional: index catalog `n(` + căutări `rg` pentru diagnoză. Nu folosit de `generate_neuron_contracts_from_v2.py` — contractele «În cod» se completează manual."""
from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class CatalogEntry:
    node_key: str
    queue_name: str
    cognitive_function: str
    neuron_type: str
    swimlane: str
    etapa: int
    criticality: str
    line_start: int


@dataclass
class CodeEvidence:
    audit_date: str
    catalog: CatalogEntry | None = None
    in_registry: bool = False
    registry_hits: list[str] = field(default_factory=list)
    rg_paths: list[str] = field(default_factory=list)
    cognitive_span_hits: list[str] = field(default_factory=list)
    llm_token_hits: list[str] = field(default_factory=list)


_CATALOG_CACHE: dict[str, CatalogEntry] | None = None


def reset_catalog_cache() -> None:
    global _CATALOG_CACHE
    _CATALOG_CACHE = None

# Regex pentru apeluri `n(` din cognitive-node-catalog.ts (format actual).
_N_CALL_RE = re.compile(
    r"(?m)^\s*n\(\s*$\n"
    r'^\s*"([^"]+)"\s*,\s*$\n'
    r'^\s*"([^"]+)"\s*,\s*$\n'
    r'^\s*"((?:[^"\\]|\\.)*)"\s*,\s*$\n'
    r"^\s*NeuronType\.(\w+)\s*,\s*$\n"
    r'^\s*"([^"]+)"\s*,\s*$\n'
    r"^\s*(\d+)\s*,\s*$\n"
    r'^\s*"([^"]+)"\s*,\s*$\n',
)


def load_catalog_index(catalog_path: Path) -> dict[str, CatalogEntry]:
    global _CATALOG_CACHE
    if _CATALOG_CACHE is not None:
        return _CATALOG_CACHE
    text = catalog_path.read_text(encoding="utf-8")
    by_queue: dict[str, CatalogEntry] = {}
    for m in _N_CALL_RE.finditer(text):
        line_start = text.count("\n", 0, m.start()) + 1
        e = CatalogEntry(
            node_key=m.group(1),
            queue_name=m.group(2),
            cognitive_function=m.group(3).replace("\\n", "\n"),
            neuron_type=m.group(4),
            swimlane=m.group(5),
            etapa=int(m.group(6)),
            criticality=m.group(7),
            line_start=line_start,
        )
        by_queue[e.queue_name] = e
    _CATALOG_CACHE = by_queue
    return by_queue


def _rg_list_files(repo: Path, pattern: str, *, extra_args: list[str] | None = None) -> list[str]:
    """Returnează căi relative la repo (max 30). Caută în workers/, packages/, apps/."""
    if extra_args is None:
        extra_args = []
    roots = [repo / "workers", repo / "packages", repo / "apps"]
    paths = [str(p) for p in roots if p.is_dir()]
    if not paths:
        paths = [str(repo)]
    try:
        r = subprocess.run(
            [
                "rg",
                "-l",
                "-F",
                pattern,
                "--glob",
                "!**/node_modules/**",
                "--glob",
                "!**/.git/**",
                "--glob",
                "!**/dist/**",
                "--glob",
                "!**/build/**",
                "--glob",
                "!**/.turbo/**",
                "--glob",
                "!**/coverage/**",
            ]
            + extra_args
            + paths,
            capture_output=True,
            text=True,
            check=False,
            timeout=120,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []
    if r.returncode not in (0, 1):
        return []
    lines = [ln.strip() for ln in r.stdout.splitlines() if ln.strip()]
    return lines[:30]


def _rg_in_files(repo: Path, pattern: str, paths: list[str]) -> list[str]:
    if not paths:
        return []
    rel = [str(Path(p).relative_to(repo)) if Path(p).is_absolute() else p for p in paths]
    try:
        r = subprocess.run(
            ["rg", "-l", "-F", pattern, "--glob", "!**/node_modules/**", *rel],
            cwd=str(repo),
            capture_output=True,
            text=True,
            check=False,
            timeout=60,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []
    if r.returncode not in (0, 1):
        return []
    return [ln.strip() for ln in r.stdout.splitlines() if ln.strip()][:15]


def _append_registry_hits(queue: str, registry_path: Path, repo: Path, ce: CodeEvidence) -> None:
    if not registry_path.is_file():
        return
    rt = registry_path.read_text(encoding="utf-8")
    ce.in_registry = f'"{queue}"' in rt or f"'{queue}'" in rt
    for m in re.finditer(re.escape(queue), rt):
        line_no = rt.count("\n", 0, m.start()) + 1
        rel = registry_path.relative_to(repo)
        hit = f"`{rel}`:{line_no}"
        if hit not in ce.registry_hits:
            ce.registry_hits.append(hit)
        if len(ce.registry_hits) >= 5:
            break


def _dedupe_paths_preserve_order(paths: list[str], limit: int) -> list[str]:
    seen: set[str] = set()
    uniq: list[str] = []
    for p in paths:
        if p not in seen:
            seen.add(p)
            uniq.append(p)
    return uniq[:limit]


def _attach_cognitive_span_hits(repo: Path, ce: CodeEvidence) -> None:
    nk = ce.catalog.node_key if ce.catalog else ""
    if not nk:
        return
    base = ce.rg_paths[:25]
    merged = _rg_in_files(repo, "withCognitiveSpan", base) + _rg_in_files(repo, nk, base)
    ce.cognitive_span_hits = _dedupe_paths_preserve_order(merged, 15)


def _attach_llm_token_hits(repo: Path, ce: CodeEvidence) -> None:
    toks = ("openai", "anthropic", "SGLang", "gen_ai.", "chat.completions")
    for tok in toks:
        for p in _rg_in_files(repo, tok, ce.rg_paths[:20]):
            if p not in ce.llm_token_hits:
                ce.llm_token_hits.append(p)
        if len(ce.llm_token_hits) >= 8:
            break


def collect_evidence(
    queue: str,
    repo: Path,
    catalog_path: Path,
    registry_path: Path,
    audit_date: str,
) -> CodeEvidence:
    ce = CodeEvidence(audit_date=audit_date)
    idx = load_catalog_index(catalog_path)
    ce.catalog = idx.get(queue)
    _append_registry_hits(queue, registry_path, repo, ce)
    ce.rg_paths = _rg_list_files(repo, queue)
    _attach_cognitive_span_hits(repo, ce)
    _attach_llm_token_hits(repo, ce)
    return ce


def format_surse_audit(
    v2_rel: str,
    v2_line: int,
    ce: CodeEvidence,
    repo: Path,
) -> list[str]:
    lines = [
        f"- v2 §6: `{v2_rel}` — linia ~{v2_line} (antet `### NEURON`).",
        "- Schema contract: [`_CONTRACT_SCHEMA.md`](_CONTRACT_SCHEMA.md).",
        f"- Catalog: `{Path('packages/shared/src/cognitive-node-catalog.ts')}`"
        + (
            f" — intrare `n(` începând ~L{ce.catalog.line_start} (`nodeKey` `{ce.catalog.node_key}`)."
            if ce.catalog
            else " — fără intrare `n(` pentru această coadă la parsarea automată."
        ),
        f"- Registry: `workers/shared/src/queue-registry.ts` — prezență literală coadă: {'da' if ce.in_registry else 'nu'}.",
    ]
    if ce.registry_hits:
        lines.append("- Registry (dovezi linie): " + ", ".join(ce.registry_hits[:5]) + ".")
    if ce.rg_paths:
        rels = []
        for p in ce.rg_paths[:12]:
            try:
                rels.append(f"`{Path(p).relative_to(repo)}`")
            except ValueError:
                rels.append(f"`{p}`")
        lines.append("- `rg -l -F` (coadă) în repo: " + ", ".join(rels) + ".")
    else:
        lines.append(
            "- `rg -l -F` (coadă): **0** fișiere în `workers/`, `packages/`, `apps/` (excl. node_modules) — coadă ne-referită literal sau doar în doc-uri excluse."
        )
    if ce.cognitive_span_hits:
        lines.append(
            "- `withCognitiveSpan` / `nodeKey` în fișierele cu potrivire coadă: "
            + ", ".join(f"`{p}`" for p in ce.cognitive_span_hits[:8])
            + "."
        )
    return lines


def scop_from_evidence(ce: CodeEvidence, purpose_v2: str) -> str:
    bits = []
    if purpose_v2:
        bits.append(f"**Declarație v2 (scop operațional):** {purpose_v2}")
    if ce.catalog:
        bits.append(
            f"**Catalog (`cognitive-node-catalog.ts` ~L{ce.catalog.line_start}):** "
            f"`{ce.catalog.cognitive_function}` — tip `{ce.catalog.neuron_type}`, swimlane `{ce.catalog.swimlane}`, "
            f"etapă `{ce.catalog.etapa}`, criticitate `{ce.catalog.criticality}`."
        )
    else:
        bits.append(
            "**Catalog:** lipsă intrare `n(` pentru această coadă la audit automat — rămâne gap față de metadata semantică."
        )
    bits.append(
        f"**Execuție (registry):** coadă `{'prezentă' if ce.in_registry else 'absentă'}` literal în `queue-registry.ts`."
    )
    if ce.rg_paths:
        bits.append(
            f"**Repo:** {len(ce.rg_paths)} fișiere cu potrivire literală a cozii (vezi «Surse audit»)."
        )
    else:
        bits.append(
            "**Repo:** nicio potrivire literală în setul căutat — handler BullMQ poate fi dinamic, redenumit sau neimplementat."
        )
    bits.append(
        "**Limită:** auditul automat nu înlocuiește citirea handler-ului; completări umane obligatorii pentru DOD pe neuroni CRITICAL/HITL."
    )
    return " ".join(bits)


def _short_list(paths: list[str], repo: Path, n: int = 6) -> str:
    out = []
    for p in paths[:n]:
        try:
            out.append(f"`{Path(p).relative_to(repo)}`")
        except ValueError:
            out.append(f"`{p}`")
    return ", ".join(out) if out else "—"


def _bic_row1(ce: CodeEvidence, repo: Path) -> str:
    cat = ce.catalog
    parts = [
        f"Audit automat {ce.audit_date}.",
        f"Registry literal: {'da' if ce.in_registry else 'nu'} (`queue-registry.ts`).",
    ]
    if cat:
        parts.append(
            f"Catalog `n(`: `nodeKey` `{cat.node_key}`, linie ~{cat.line_start} în `cognitive-node-catalog.ts`."
        )
    else:
        parts.append("Catalog `n(`: **lipsă** pentru această coadă.")
    if ce.rg_paths:
        extra = max(0, len(ce.rg_paths) - 6)
        parts.append(f"`rg` coadă: {_short_list(ce.rg_paths, repo)} (+{extra} altele).")
    else:
        parts.append("`rg -l -F` coadă: **0** rezultate în arborii căutați.")
    return " ".join(parts)


def _bic_row2(cat: CatalogEntry | None) -> str:
    if not cat:
        return "Catalog: fără rând `n(` — swimlane/etapă **numai** din v2 la acest pas."
    return (
        f"Catalog: `etapa={cat.etapa}`, `swimlane={cat.swimlane}` (fișier ~L{cat.line_start}). "
        "Alinierea cu familia din v2 se verifică manual dacă diferă."
    )


def _bic_row3(cat: CatalogEntry | None) -> str:
    if not cat:
        return "Catalog: **lipsă** — rol declarat doar din v2 până la intrare catalog."
    return (
        f"Catalog: funcție «{cat.cognitive_function}»; analogie din tip `NeuronType.{cat.neuron_type}` "
        "→ vezi `BIOLOGICAL_ANALOGIES` în același fișier (~L280)."
    )


def _bic_row4(cat: CatalogEntry | None, nt: str) -> str:
    if cat:
        return f"Catalog: `NeuronType.{cat.neuron_type}` — mapare SOFAI: vezi clasificarea din v2 §2.1."
    return f"Catalog: lipsă — tip v2 «{nt or '—'}» fără confirmare în `n(`."


def _bic_row5(cat: CatalogEntry | None) -> str:
    if cat:
        return f"Catalog: `criticality={cat.criticality}` (~L{cat.line_start})."
    return "Catalog: lipsă — criticitate doar din v2."


def _bic_row6(ce: CodeEvidence, repo: Path, cat: CatalogEntry | None) -> str:
    if ce.cognitive_span_hits:
        return (
            f"`withCognitiveSpan` / `nodeKey` în fișiere legate de coadă: "
            f"{_short_list(ce.cognitive_span_hits, repo, 8)}. "
            "Altfel: span OTel per-neuron necesită citire handler."
        )
    if cat:
        return (
            f"Nu s-a găsit `withCognitiveSpan` în subsetul `rg` pentru coadă; `nodeKey` așteptat `{cat.node_key}`. "
            "Verificare manuală în workerul care consumă coada."
        )
    return (
        "Fără `nodeKey` catalog și fără potriviri `withCognitiveSpan` în fișierele `rg` — "
        "telemetrie per-neuron neconfirmată."
    )


def _cedar_opa_search_hint(repo: Path, ce: CodeEvidence) -> str:
    pool = ce.rg_paths[:15] + ce.cognitive_span_hits[:10]
    has_cedar = bool(_rg_in_files(repo, "cedar", pool))
    has_opa = bool(_rg_in_files(repo, "opa", pool))
    if not has_cedar and not has_opa:
        return "fără rezultat în subset."
    return "vezi fișierele din «Surse audit»."


def _bic_row7(repo: Path, ce: CodeEvidence) -> str:
    return (
        "Nu s-a extras politică Cedar/OPA/autonomy din cod la audit automat; "
        "căutare generică `cedar|opa` în fișierele coadă: "
        + _cedar_opa_search_hint(repo, ce)
    )


def _v2_non_ai(model_routing_v2: str) -> bool:
    mr = model_routing_v2 or ""
    return "Non-AI" in mr or "non-ai" in mr.lower()


def _bic_row8(ce: CodeEvidence, repo: Path, model_routing_v2: str) -> str:
    n_llm = len(ce.llm_token_hits)
    short = _short_list(ce.llm_token_hits, repo, 4)
    if _v2_non_ai(model_routing_v2):
        tail = f" ({short})." if ce.llm_token_hits else "."
        return (
            "N/A — v2 marchează Non-AI pentru rutare LLM. "
            f"Heuristic `rg` (tokeni LLM în fișiere coadă): {n_llm} fișiere" + tail
        )
    tail = f" ({short})" if ce.llm_token_hits else "."
    return (
        "Rutare LLM: necesită citire handler; heuristic `rg` (tokeni LLM în fișiere coadă): "
        f"{n_llm} fișiere." + tail
    )


def _bic_row9(repo: Path, ce: CodeEvidence) -> str:
    base = "Guardrails (NeMo / deterministic): neextrase automat; căutare `guardrail|nemo` în fișiere coadă: "
    if not ce.rg_paths:
        return base + "0 (fără fișiere coadă)."
    n = len(_rg_in_files(repo, "guardrail", ce.rg_paths[:20]))
    return base + f"{n} potriviri (fișiere)."


def _bic_row10(ce: CodeEvidence) -> str:
    return (
        "HITL: verificare manuală cozi `human:*` / `hitl:*` în `queue-registry.ts` și consumatori; "
        f"nu inferat din audit automat. Potriviri coadă în repo: {len(ce.rg_paths)}."
    )


def _bic_row11(lim_same: str) -> str:
    return (
        lim_same
        + " OODA: rămâne din v2 în coloana «țintă v2 / research»; mapare cod ne-scalată automat."
    )


def _bic_row12(repo: Path, ce: CodeEvidence) -> str:
    n = len(_rg_in_files(repo, "confidence", ce.rg_paths[:20]))
    return (
        "De-escaladare / prag încredere: căutare `confidence|0.80|de-escalat` în fișiere coadă: "
        f"{n} fișiere (heuristic)."
    )


def _bic_row13(repo: Path, ce: CodeEvidence) -> str:
    paths = ce.rg_paths[:20]
    st1 = set(_rg_in_files(repo, "BullMQ", paths)) | set(_rg_in_files(repo, "Worker", paths))
    return (
        "Subset stack: prezență `BullMQ`/`Worker` în fișiere coadă: "
        f"{len(st1)} (heuristic); detaliu versiuni în v2 §2.3."
    )


def build_in_code_cells(ce: CodeEvidence, repo: Path, nt: str, model_routing_v2: str) -> list[str]:
    """Cele 13 celule «În cod (dovadă)» — fără presupuneri între neuroni; formulate din dovezi."""
    cat = ce.catalog
    lim_same = "Detaliu suplimentar: vezi rândul 1 și «Surse audit»; fără extrapolare cross-neuron."
    return [
        _bic_row1(ce, repo),
        _bic_row2(cat),
        _bic_row3(cat),
        _bic_row4(cat, nt),
        _bic_row5(cat),
        _bic_row6(ce, repo, cat),
        _bic_row7(repo, ce),
        _bic_row8(ce, repo, model_routing_v2),
        _bic_row9(repo, ce),
        _bic_row10(ce),
        _bic_row11(lim_same),
        _bic_row12(repo, ce),
        _bic_row13(repo, ce),
    ]
