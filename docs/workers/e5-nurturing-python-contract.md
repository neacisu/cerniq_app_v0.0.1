# Contract subprocess Python — `workers/e5-nurturing/python`

**Scop:** fișiere **`leiden_service.py`** și **`pdf_scraper.py`** sunt invocate **doar** din workerii Node (`spawn python3`), nu expun HTTP. Contractul este **CLI + fișiere JSON** pe disc.

## Reguli comune

- **Runtime:** `python3` pe PATH; scripturi la căi absolute din repo (vezi `leiden-client.ts`, `ouai-scraper.ts`).
- **I/O:** `--input <path.json>` și `--output <path.json>`; encoding UTF-8.
- **Erori:** cod exit ≠ 0 sau JSON cu câmp `error` (string) unde este definit în docstring-ul scriptului.
- **Date demo:** nu returnați payload-uri „fake” ca și cum ar fi business — output-ul reflectă calcule / extragere pe fișierul PDF sau graful primit; câmpurile goale sunt structuri valide (ex. `entries: []`), nu valori inventate pentru clienți.

## `leiden_service.py`

| Argument | Valori | Consumator Node |
| -------- | ------ | ---------------- |
| `--action` | `leiden`, `leiden_implicit`, `centrality` | D21, D24, D22 (`workers/e5-nurturing/src/lib/leiden-client.ts`) |
| `--input` | Graph JSON `{ nodes, edges }` | scris de pipeline înainte de subprocess |
| `--output` | Rezultat structurat (vezi docstring în fișier) | citit de același client |

**Dependențe:** `workers/e5-nurturing/python/requirements.txt` (igraph, leidenalg, numpy, cdlib, networkx).

## `pdf_scraper.py`

| Argument | Valori | Consumator Node |
| -------- | ------ | ---------------- |
| `--action` | `ouai`, `madr` | G37, G38 (`ouai-scraper.ts`) |
| `--input` | JSON `{"pdf_path": "..."}` | — |
| `--output` | Structură `entries` / `error` / `total_pages` | — |

**Dependențe:** `pdfplumber` (în același `requirements.txt`).

## Analiză statică

- **`pyrightconfig.json`:** include `workers/e5-nurturing/python`, **exclude** `**/.venv` — nu analizați site-packages ca logică de business.
- Sincronizare pachete: gard Vitest `tests/plans/e5-python-requirements-sync.test.ts`.

## Referințe

- `workers/e5-nurturing/src/lib/leiden-client.ts`
- `workers/e5-nurturing/src/lib/ouai-scraper.ts`
- `workers/e5-nurturing/src/workers/d21-community-detect-leiden.ts`, `d22-*`, `d24-*`, `g37-*`, `g38-*`
