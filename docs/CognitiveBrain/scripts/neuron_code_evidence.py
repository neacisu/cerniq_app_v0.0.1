"""Index cognitiv: queueName → nodeKey din cognitive-node-catalog.ts (helper matrice + audit)."""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

_CATALOG_CACHE: dict[str, "CatalogEntry"] | None = None
_CATALOG_PATH: Path | None = None


@dataclass(frozen=True)
class CatalogEntry:
    node_key: str
    queue_name: str


def reset_catalog_cache() -> None:
    global _CATALOG_CACHE, _CATALOG_PATH
    _CATALOG_CACHE = None
    _CATALOG_PATH = None


def load_catalog_index(catalog_path: Path) -> dict[str, CatalogEntry]:
    """Mapare queueName (al doilea argument la n(...)) → CatalogEntry."""
    global _CATALOG_CACHE, _CATALOG_PATH
    p = catalog_path.resolve()
    if _CATALOG_CACHE is not None and _CATALOG_PATH == p:
        return _CATALOG_CACHE
    text = p.read_text(encoding="utf-8")
    pat = re.compile(
        r'\bn\(\s*\r?\n\s*"([^"]+)"\s*,\s*\r?\n\s*"([^"]+)"',
        re.MULTILINE,
    )
    idx: dict[str, CatalogEntry] = {}
    for node_key, queue_name in pat.findall(text):
        idx[queue_name] = CatalogEntry(node_key=node_key, queue_name=queue_name)
    _CATALOG_CACHE = idx
    _CATALOG_PATH = p
    return idx
