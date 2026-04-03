#!/usr/bin/env python3
"""
pdf_scraper.py — Python3 PDF Scraping Service (Plan §X FAZA 9g)

Acțiuni suportate:
  --action ouai  : Extrage date OUAI din registru MADR PDF
  --action madr  : Extrage date cooperative/grupuri producători din PDF MADR

Protocol I/O (identic cu leiden_service.py):
  --input  <path>  : JSON file cu {"pdf_path": "..."}
  --output <path>  : JSON file output citit de worker-ul Node.js

Output ouai:
  {
    "entries": [{"ouai_name": "...", "county": "...", "net_area_ha": 123.45,
                 "hydroamelioration_name": "...", "page_number": 1}],
    "error": null,
    "total_pages": 5
  }

Output madr:
  {
    "entries": [{"name": "...", "county": "...", "cui": "...",
                 "association_type": "COOPERATIVE", "declared_area_ha": 500.0}],
    "error": null,
    "total_pages": 3
  }

Anti-halucin. FAZA 9g:
  (A) PDF scraping via pdfplumber — NU Node.js PDF parsing
  (C) Timeout 600s — enforsat de BullMQ job timeout, NU în Python
  (D) OUAI registry = PUBLIC DATA — NU autentificare MADR
"""

import sys
import json
import argparse
import re
import traceback
from pathlib import Path

try:
    import pdfplumber
except ImportError as exc:
    print(f"[pdf_scraper] ERROR: pdfplumber not installed: {exc}", file=sys.stderr)
    sys.exit(2)


# ---------------------------------------------------------------------------
# Constante regex
# ---------------------------------------------------------------------------

# Regex fallback pentru rânduri OUAI: Nume OUAI, Județ, Suprafață
_OUAI_ROW_RE = re.compile(
    r"([A-ZĂÂÎȘȚ\u0218\u021A][A-ZĂÂÎȘȚa-zăâîșțA-Za-z\s\u0218\u021A\u0219\u021B]+)"
    r"\s+"
    r"((?:[A-ZĂÂÎȘȚ\u0218\u021A]{2,}[A-ZĂÂÎȘȚa-zăâîșțA-Za-z\s]*){1,3})"
    r"\s+"
    r"(\d+(?:[.,]\d+)?)",
    re.UNICODE,
)

# Validare CUI: 2-10 cifre
_CUI_RE = re.compile(r"^\d{2,10}$")


# ---------------------------------------------------------------------------
# Funcții helper
# ---------------------------------------------------------------------------


def _clean_text(text: str) -> str:
    """Trim și normalizare whitespace."""
    if not text:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def _parse_area(value: str) -> float:
    """Parsare suprafață ha: 1.234,56 → 1234.56"""
    if not value:
        return 0.0
    cleaned = str(value).replace(".", "").replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _infer_association_type(name: str) -> str:
    """Inferă tipul asociației din nume."""
    name_lower = name.lower()
    if "cooperativ" in name_lower:
        return "COOPERATIVE"
    if "grup" in name_lower and ("producator" in name_lower or "producător" in name_lower):
        return "PRODUCER_GROUP"
    if "ouai" in name_lower or (
        "utilizator" in name_lower and ("apa" in name_lower or "apă" in name_lower)
    ):
        return "OUAI"
    return "OTHER"


def _is_header_row(row: list) -> bool:
    """Detectează rândul de header (NR nu e numeric sau conține text de titlu)."""
    if not row or not row[0]:
        return True
    first = _clean_text(str(row[0]))
    return not first.isdigit() and not re.match(r"^\d+$", first)


# ---------------------------------------------------------------------------
# Extragere OUAI
# ---------------------------------------------------------------------------


def _parse_ouai_table_row(row: list, page_number: int) -> dict | None:
    """
    Parsează un rând de tabel OUAI.
    Structura așteptată: [NR, OUAI_NAME, COUNTY, HYDROAMELIORATION_NAME, NET_AREA_HA, ...]
    """
    if len(row) < 3:
        return None
    if _is_header_row(row):
        return None

    # Detectăm structura tabelului: minim 3 coloane (nr, nume, județ, ...)
    # Indexul pentru fiecare câmp poate varia — căutăm câmpul numeric pentru suprafață
    col_count = len(row)

    ouai_name = _clean_text(str(row[1])) if col_count > 1 else ""
    county = _clean_text(str(row[2])) if col_count > 2 else ""

    # Hydro și suprafață — structuri cu 4+ coloane
    hydroamelioration_name: str | None = None
    net_area_ha = 0.0

    if col_count >= 5:
        # Structura completă sau cu 5 col: [NR, OUAI, JUDEȚ, HIDRO, SUPRAFAȚĂ, (MEMBRI)]
        hydroamelioration_name = _clean_text(str(row[3])) or None
        net_area_ha = _parse_area(str(row[4]))
    elif col_count == 4:
        # [NR, OUAI, JUDEȚ, SUPRAFAȚĂ]
        net_area_ha = _parse_area(str(row[3]))
    elif col_count == 3:
        # [NR, OUAI, JUDEȚ] — suprafață poate fi în text, sărim
        pass

    if not ouai_name or not county:
        return None

    return {
        "ouai_name": ouai_name,
        "county": county.upper(),
        "net_area_ha": net_area_ha,
        "hydroamelioration_name": hydroamelioration_name,
        "page_number": page_number,
    }


def _parse_ouai_page_text_fallback(text: str, page_number: int) -> list[dict]:
    """Fallback: extrage date OUAI din text brut via regex când extract_table() eșuează."""
    entries = []
    for match in _OUAI_ROW_RE.finditer(text):
        ouai_name = _clean_text(match.group(1))
        county = _clean_text(match.group(2))
        net_area_ha = _parse_area(match.group(3))
        if ouai_name and county and net_area_ha > 0:
            entries.append({
                "ouai_name": ouai_name,
                "county": county.upper(),
                "net_area_ha": net_area_ha,
                "hydroamelioration_name": None,
                "page_number": page_number,
            })
    return entries


def _extract_ouai_from_page(page) -> list[dict]:
    """Extrage entries OUAI dintr-o pagină: tabel structurat cu fallback text+regex."""
    page_number = page.page_number
    table = page.extract_table()

    if table and len(table) > 1:
        entries = []
        for row in table[1:]:  # sare header
            if row is None:
                continue
            entry = _parse_ouai_table_row(row, page_number)
            if entry:
                entries.append(entry)
        return entries

    text = page.extract_text() or ""
    if text.strip():
        return _parse_ouai_page_text_fallback(text, page_number)
    return []


def extract_ouai_data(pdf_path: str) -> dict:
    """
    Extrage date OUAI din PDF registru MADR.

    Încearcă extract_table() per pagină.
    Fallback la extract_text() + regex dacă tabelul nu se poate extrage.
    """
    entries: list[dict] = []
    total_pages = 0

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        for page in pdf.pages:
            entries.extend(_extract_ouai_from_page(page))

    print(
        f"[pdf_scraper] OUAI extraction done: {len(entries)} entries, {total_pages} pages",
        file=sys.stderr,
    )
    return {"entries": entries, "error": None, "total_pages": total_pages}


# ---------------------------------------------------------------------------
# Extragere MADR (cooperative, grupuri producători)
# ---------------------------------------------------------------------------


def _extract_madr_columns(
    row: list, col_count: int
) -> tuple[str | None, str, float | None]:
    """Extrage (cui, county, declared_area_ha) din rând MADR cu număr variabil de coloane."""
    cui: str | None = None
    county = ""
    declared_area_ha: float | None = None

    if col_count >= 4:
        raw_cui = _clean_text(str(row[2]))
        cui = raw_cui if _CUI_RE.match(raw_cui) else None
        county = _clean_text(str(row[3]))

    if col_count >= 6:
        area = _parse_area(_clean_text(str(row[5])))
        declared_area_ha = area if area > 0 else None
    elif col_count == 5:
        area = _parse_area(_clean_text(str(row[4])))
        declared_area_ha = area if area > 0 else None

    if col_count == 3:
        county = _clean_text(str(row[2]))

    return cui, county, declared_area_ha


def _parse_madr_table_row(row: list) -> dict | None:
    """
    Parsează un rând de tabel MADR asociații.
    Structura așteptată: [NR, NAME, CUI, COUNTY, ASSOCIATION_TYPE, DECLARED_AREA_HA]
    """
    if len(row) < 3:
        return None
    if _is_header_row(row):
        return None

    col_count = len(row)

    name = _clean_text(str(row[1])) if col_count > 1 else ""
    if not name:
        return None

    cui, county, declared_area_ha = _extract_madr_columns(row, col_count)

    if not county:
        return None

    association_type = _infer_association_type(name)

    return {
        "name": name,
        "county": county.upper(),
        "cui": cui,
        "association_type": association_type,
        "declared_area_ha": declared_area_ha,
    }


def extract_madr_data(pdf_path: str) -> dict:
    """
    Extrage date asociații (cooperative, grupuri producători) din PDF MADR.
    """
    entries: list[dict] = []
    total_pages = 0

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)

        for page in pdf.pages:
            table = page.extract_table()

            if table and len(table) > 1:
                for row in table[1:]:
                    if row is None:
                        continue
                    entry = _parse_madr_table_row(row)
                    if entry:
                        entries.append(entry)

    print(
        f"[pdf_scraper] MADR extraction done: {len(entries)} entries, {total_pages} pages",
        file=sys.stderr,
    )
    return {"entries": entries, "error": None, "total_pages": total_pages}


# ---------------------------------------------------------------------------
# Main CLI
# ---------------------------------------------------------------------------


def main() -> None:
    parser = argparse.ArgumentParser(description="PDF Scraper pentru date MADR/OUAI")
    parser.add_argument("--action", required=True, choices=["ouai", "madr"])
    parser.add_argument("--input", required=True, help="Calea fișierului JSON de input")
    parser.add_argument("--output", required=True, help="Calea fișierului JSON de output")
    args = parser.parse_args()

    try:
        with open(args.input, encoding="utf-8") as f:
            input_data = json.load(f)

        pdf_path = input_data.get("pdf_path")
        if not pdf_path or not Path(pdf_path).exists():
            raise FileNotFoundError(f"PDF not found: {pdf_path}")

        if args.action == "ouai":
            result = extract_ouai_data(pdf_path)
        else:
            result = extract_madr_data(pdf_path)

        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        sys.exit(0)

    except Exception as exc:  # noqa: BLE001
        error_result = {"entries": [], "error": str(exc), "total_pages": 0}
        try:
            with open(args.output, "w", encoding="utf-8") as f:
                json.dump(error_result, f, ensure_ascii=False)
        except Exception:  # noqa: BLE001
            pass
        print(f"[pdf_scraper] ERROR: {type(exc).__name__}: {exc}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
