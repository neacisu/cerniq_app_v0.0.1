#!/usr/bin/env python3
"""
Inventar mecanic: apariții <Button și onClick= în apps/web/src/pages/*.tsx.

Ieșire JSON: fișier relativ, linie, tip match, snippet, indicii **doar** din acceași linie
(sau linii adiacente opționale — implicit doar linia match). Fără inferență de path HTTP
din alte fișiere sau din nume de funcție.

Faza plan: matrix-buttons-mechanical-json (UI 100% date reale).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
from pathlib import Path


# Tag deschis Button (ex. <Button, <Button> invalid dar rare)
RE_BUTTON = re.compile(r"<Button\b")
# Prop onClick (JSX / TSX)
RE_ONCLICK = re.compile(r"\bonClick\s*=")
# Path-uri API ca string literal pe aceeași linie (nu template complexe)
RE_API_LITERAL = re.compile(r"[\"'](\/api\/(?:v1|admin)[^\"']*)[\"']")
# apel api.get/post/... pe linie
RE_API_METHOD = re.compile(r"\bapi\.(get|post|patch|put|delete)\s*\(")
RE_NAVIGATE = re.compile(r"\bnavigate\s*\(")
RE_TOAST = re.compile(r"\btoast\.(info|success|error|warning|message)\s*\(")


@dataclass
class MatchRow:
    file: str
    line: int
    kind: str
    snippet: str
    literal_api_paths_on_line: list[str]
    mentions_api_client_method: bool
    mentions_navigate: bool
    mentions_toast: bool
    # Mereu null: nu inferăm endpoint din handler off-line sau cross-fișier.
    http_path_resolved: str | None
    note: str


def analyze_line(line: str) -> tuple[list[str], bool, bool, bool]:
    paths = list(dict.fromkeys(RE_API_LITERAL.findall(line)))
    return (
        paths,
        bool(RE_API_METHOD.search(line)),
        bool(RE_NAVIGATE.search(line)),
        bool(RE_TOAST.search(line)),
    )


def _match_kinds_for_line(line: str) -> list[str]:
    kinds: list[str] = []
    if RE_BUTTON.search(line):
        kinds.append("Button_open_tag")
    if RE_ONCLICK.search(line):
        kinds.append("onClick_prop")
    return kinds


def _note_for_line_signals(
    paths: list[str],
    api_m: bool,
    nav_m: bool,
    toast_m: bool,
) -> str:
    if not paths and not api_m and not nav_m and not toast_m:
        return (
            "Fără indicii API/navigate/toast pe această linie; mapare HTTP = manuală sau analiză mai largă."
        )
    return "Indicii doar din această linie (nu rezolvă complet lanțul handler)."


def _match_row(
    rel_repo: str,
    line_no: int,
    kind: str,
    snippet: str,
    line: str,
) -> MatchRow:
    paths, api_m, nav_m, toast_m = analyze_line(line)
    return MatchRow(
        file=rel_repo,
        line=line_no,
        kind=kind,
        snippet=snippet,
        literal_api_paths_on_line=paths,
        mentions_api_client_method=api_m,
        mentions_navigate=nav_m,
        mentions_toast=toast_m,
        http_path_resolved=None,
        note=_note_for_line_signals(paths, api_m, nav_m, toast_m),
    )


def scan_file(path: Path, repo_root: Path) -> list[MatchRow]:
    rel_repo = str(path.relative_to(repo_root))
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    out: list[MatchRow] = []

    for i, line in enumerate(lines, start=1):
        stripped = line.strip()
        if not stripped or stripped.startswith("//"):
            continue
        kinds = _match_kinds_for_line(line)
        snippet = stripped[:500] + ("…" if len(stripped) > 500 else "")
        for kind in kinds:
            out.append(_match_row(rel_repo, i, kind, snippet, line))
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--pages-dir",
        type=Path,
        default=None,
        help="Rădăcină pages (implicit: <repo>/apps/web/src/pages)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        default=None,
        help="Fișier JSON ieșire (implicit: <repo>/docs/generated/ui-button-onclick-inventory.json)",
    )
    parser.add_argument(
        "--stdout",
        action="store_true",
        help="Scrie JSON la stdout în loc de fișier",
    )
    args = parser.parse_args()

    script_path = Path(__file__).resolve()
    repo_root = script_path.parent.parent
    pages_dir = args.pages_dir or (repo_root / "apps/web" / "src" / "pages")
    if not pages_dir.is_dir():
        print(f"ERROR: pages dir missing: {pages_dir}", file=sys.stderr)
        return 2

    default_out = repo_root / "docs" / "generated" / "ui-button-onclick-inventory.json"
    out_path = args.output if args.output is not None else default_out

    all_rows: list[MatchRow] = []
    for tsx in sorted(pages_dir.rglob("*.tsx")):
        all_rows.extend(scan_file(tsx, repo_root))

    payload = {
        "schema": "cerniq.ui-button-onclick-inventory.v1",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "repoRootRelative": "apps/web/src/pages",
        "description": "O înregistrare per (file, line, kind); același rând poate genera 2 înregistrări (Button + onClick).",
        "disclaimer": "http_path_resolved este mereu null: nu inferăm endpoint din simboluri. literal_api_paths_on_line extrage doar string-uri /api/... de pe linie.",
        "totalMatches": len(all_rows),
        "matches": [asdict(r) for r in all_rows],
    }

    text = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"

    if args.stdout:
        sys.stdout.write(text)
        return 0

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(text, encoding="utf-8")
    print(f"Wrote {len(all_rows)} matches to {out_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
