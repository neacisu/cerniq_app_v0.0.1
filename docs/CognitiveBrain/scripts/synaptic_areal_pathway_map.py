"""Mapare **traseu sinaptic** → **areal sinaptic** (ierarhie contracte sinapsă).

- **Areal sinaptic** (nivel 1): regiune funcțională largă în care se grupează traseele sinaptice
  înrudite — analog inspirat de organizarea pe areale în rețele neuronale (fără pretensie anatomică).
- **Traseu sinaptic** (nivel 2): set coerent de contracte de sinapsă cu același identificator canonic
  (subdirector); corespunde unei „cărări” de conectivitate în graful cognitiv.

Directorul `graph-plan/` adăpostește sinapse de **topologie plan exportat** (`stage` / `familyflow` /
`cross`), nu trasee operaționale în sensul de mai sus.

Dovadă: **52** de prefixe (prim segment al slug-ului traseului) în `_PATHWAY_PREFIX_TO_AREAL_DIR`.
"""
from __future__ import annotations

GRAPH_PLAN_TOPOLOGY_DIR = "graph-plan"

_PATHWAY_PREFIX_TO_AREAL_DIR: dict[str, str] = {
    "alert": "alerts",
    "association": "enrich-data",
    "ai": "ai-agent",
    "audit": "pipeline-monitor",
    "backup": "pipeline-monitor",
    "bronze": "enrich-data",
    "campaign": "channels-outreach",
    "channel": "ai-agent",
    "churn": "lifecycle-growth",
    "compliance": "lifecycle-growth",
    "content": "lifecycle-growth",
    "contract": "credit-contracts",
    "credit": "credit-contracts",
    "document": "ai-agent",
    "einvoice": "credit-contracts",
    "email": "channels-outreach",
    "enrich": "enrich-data",
    "feedback": "lifecycle-growth",
    "geo": "lifecycle-growth",
    "graph": "enrich-data",
    "guardrail": "ai-agent",
    "hitl": "hitl-human",
    "human": "hitl-human",
    "lead": "channels-outreach",
    "mcp": "ai-agent",
    "metrics": "pipeline-monitor",
    "monitor": "pipeline-monitor",
    "negotiation": "ai-agent",
    "nurturing": "lifecycle-growth",
    "oblio": "stock-logistics",
    "outreach": "channels-outreach",
    "payment": "credit-contracts",
    "pipeline": "pipeline-monitor",
    "pricing": "ai-agent",
    "product": "ai-agent",
    "q": "channels-outreach",
    "quota": "pipeline-monitor",
    "reconcile": "credit-contracts",
    "referral": "lifecycle-growth",
    "report": "pipeline-monitor",
    "return": "credit-contracts",
    "search": "ai-agent",
    "sequence": "channels-outreach",
    "sentiment": "channels-outreach",
    "silver": "enrich-data",
    "sameday": "stock-logistics",
    "stock": "stock-logistics",
    "template": "channels-outreach",
    "trigger": "lifecycle-growth",
    "wa": "channels-outreach",
    "webhook": "channels-outreach",
    "winback": "lifecycle-growth",
}

ALL_SYNAPTIC_AREAL_DIRS: frozenset[str] = frozenset(_PATHWAY_PREFIX_TO_AREAL_DIR.values()) | frozenset(
    {GRAPH_PLAN_TOPOLOGY_DIR}
)


def areal_dir_for_pathway(pathway_slug: str) -> str:
    """Întoarce numele directorului de areal pentru un traseu (ex. `alert-bounce-high`)."""
    if not pathway_slug:
        msg = "Slug traseu gol."
        raise ValueError(msg)
    first = pathway_slug.split("-", 1)[0]
    try:
        return _PATHWAY_PREFIX_TO_AREAL_DIR[first]
    except KeyError as e:
        msg = f"Prefix de traseu fără areal definit: {first!r} (traseu {pathway_slug!r})"
        raise KeyError(msg) from e


def assert_pathway_prefixes_covered(pathway_slugs: set[str]) -> None:
    """Verificare la migrare: fiecare traseu are prim segment în mapare."""
    missing: set[str] = set()
    for slug in pathway_slugs:
        first = slug.split("-", 1)[0]
        if first not in _PATHWAY_PREFIX_TO_AREAL_DIR:
            missing.add(first)
    if missing:
        msg = f"Actualizați _PATHWAY_PREFIX_TO_AREAL_DIR pentru: {sorted(missing)}"
        raise SystemExit(msg)
