# CERNIQ.APP — Monitoring API (Internal Ops Service)

> **Status:** Documentație tehnică  
> **Rol:** Observability sidecar pentru infrastructura Cerniq.app  
> **Componentă:** `apps/monitoring-api`

---

## 🎯 Scop

`monitoring-api` este un serviciu intern care agregă metrici operaționale în timp real (BullMQ queues și metrici de sistem) și expune o suprafață de observabilitate/control pentru API-ul principal.

**Principii:**

- Internal-only (nu este expus direct browserului)
- Izolat de `apps/api` (availability independent)
- Queue control strict operațional, fără logică business

---

## ✅ Responsabilități

- Agregare **queue depth** și job counts pentru BullMQ
- Metrici sistem (CPU, RAM, load, uptime, hostname)
- Health check pentru observabilitate
- Feed realtime intern pentru relay-ul din `apps/api`

**Non-goals:**

- Nu execută jobs
- Nu scrie în DB business
- Nu expune date sensibile către public

---

## 🔌 API Summary

### REST Endpoints

| Method | Endpoint                   | Descriere                               |
| :----- | :------------------------- | :-------------------------------------- |
| `GET`  | `/health`                  | Health check                            |
| `GET`  | `/health/live`             | Liveness                                |
| `GET`  | `/api/queues`              | Toate queue-urile + counts              |
| `GET`  | `/api/queues/:name`        | Detalii per queue                       |
| `GET`  | `/api/system/metrics`      | CPU, RAM, load, uptime                  |
| `POST` | `/api/queues/:name/pause`  | Pause queue (protected)                 |
| `POST` | `/api/queues/:name/resume` | Resume queue (protected)                |
| `POST` | `/api/queues/:name/drain`  | Drain queue (protected)                 |
| `POST` | `/api/queues/:name/retry-failed` | Retry failed jobs (protected)     |

### WebSocket (`/ws/live`)

Push updates interne cu payload JSON:

```json
{
  "type": "METRIC_UPDATE",
  "payload": {
    "timestamp": 1705312345678,
    "queues": [
      {
        "name": "pipeline:orchestrate",
        "waiting": 12,
        "active": 5,
        "failed": 0,
        "throughput": 8.4,
        "latency": 412
      }
    ],
    "system": {
      "hostname": "ct109",
      "uptime": 12345
    }
  }
}
```

---

## 🔐 Securitate

- Acces **internal-only** (backend network / VPN / admin path)
- Endpoints de control protejate prin `x-admin-key`
- Browserul nu consumă direct `monitoring-api`; `apps/api` face relay/proxy autentificat

---

## ⚙️ Configurare (Environment Variables)

| Variabilă        | Descriere                                | Exemplu                |
| ---------------- | ---------------------------------------- | ---------------------- |
| `PORT`           | Port server                              | `64080`                |
| `REDIS_URL`      | Redis connection string                  | `redis://redis:6379/0` |
| `REDIS_PREFIX`   | Prefix BullMQ canonic                    | `cerniq`               |
| `BULLMQ_PREFIX`  | Alias compatibil pentru prefix           | `cerniq`               |
| `ADMIN_KEY`      | Cheie admin pentru queue control intern  | `change_me`            |
| `SECRETS_PATH`   | Fișier randat de OpenBao agent           | `/secrets/api.env`     |

---

## 📚 Documentație Detaliată

Specificația completă este în:

- [etapa0-monitoring-api-spec.md](../../docs/specifications/Etapa%200/etapa0-monitoring-api-spec.md)

---

## 🧭 Observații Operaționale

- Folosește registry-ul canonic din `@cerniq/worker-shared`
- Evită instrumentarea queue depth direct în workers
- Queue control este folosit de API-ul admin proxy, nu direct de browser

---

**Owner:** DevOps/Platform Team  
**Ultima actualizare:** 12 Martie 2026
