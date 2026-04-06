# Contract servicii Python sidecar (`services/`)

**Scop:** sursă de adevăr pentru operațiuni (Docker / healthcheck), fără presupuneri despre UI.  
**Data audit:** 2026-04-05 (din `main.py`, `Dockerfile`, `README.md` per serviciu).

## Clasificare: **ops-only (stub HTTP)**

Toate cele patru servicii sunt **minimale FastAPI** cu un singur endpoint documentat **`GET /health`**. Nu există încă:

- contract HTTP de business (REST) spre API Node sau workeri;
- gRPC;
- endpoint dedicat **`/ready`** (readiness separată de liveness).

**Implicație pentru admin / SPA:** în `apps/web-admin` nu există consum pentru aceste hostname-uri (verificat la audit); orice status viitor în UI trebuie să citească **health real** (ex. `GET /health`), nu valori statice.

| Serviciu          | Port default `PORT` | Imagine / user    | Healthcheck Docker                  | Răspuns JSON `/health` (din cod)              |
| ----------------- | ------------------- | ----------------- | ----------------------------------- | --------------------------------------------- |
| `python-mcp`      | 64078               | non-root `cerniq` | `GET http://localhost:64078/health` | `{"status":"ok","service":"python-mcp"}`      |
| `python-document` | 64075               | non-root `cerniq` | `GET http://localhost:64075/health` | `{"status":"ok","service":"python-document"}` |
| `python-graph`    | 64077               | non-root `cerniq` | `GET http://localhost:64077/health` | `{"status":"ok","service":"python-graph"}`    |
| `python-pdf`      | 64076               | non-root `cerniq` | `GET http://localhost:64076/health` | `{"status":"ok","service":"python-pdf"}`      |

## Entrypoint container

- **Comandă:** `CMD ["python", "main.py"]` (toate cele patru `Dockerfile`).
- **Pornire uvicorn:** în `if __name__ == "__main__"` din `main.py` — host `0.0.0.0`, port din env `PORT`.

## Integrare viitoare (când apare business logic)

1. Documentați aici metodele/prefixele HTTP sau fișierele `.proto` gRPC.
2. Adăugați `/ready` dacă dependențele (DB, model) necesită probă non-trivială.
3. Leagați apelurile din `apps/api` sau workeri și actualizați `infra/docker` / service mesh.

## Worker E5 (subprocess, nu sidecar HTTP)

Pentru **Python apelat din workerii Node** (Leiden, PDF MADR/OUAI), vezi [`docs/workers/e5-nurturing-python-contract.md`](../workers/e5-nurturing-python-contract.md).

## Referințe fișiere

- `services/python-mcp/{main.py,Dockerfile,README.md}`
- `services/python-document/{main.py,Dockerfile,README.md}`
- `services/python-graph/{main.py,Dockerfile,README.md}`
- `services/python-pdf/{main.py,Dockerfile,README.md}`
