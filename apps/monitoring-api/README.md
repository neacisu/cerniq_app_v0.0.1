# CERNIQ.APP — Monitoring API (Sidecar)

> **Status:** Documentație tehnică  
> **Rol:** Observability sidecar pentru infrastructura Cerniq.app  
> **Componentă:** `apps/monitoring-api`

---

## 🎯 Scop

`monitoring-api` este un serviciu **read-only** care agregă metrici operaționale în timp real (Redis queues, sistem, erori) și le expune către Admin UI prin REST și WebSocket, fără a impacta performanța API-ului principal.

**Principii:**
- Read-only (nu modifică starea business)
- Izolat de `apps/api` (availability independent)
- Real-time push prin WebSocket (evită polling agresiv)

---

## ✅ Responsabilități

- Agregare **queue depth** și job counts pentru BullMQ
- Metrici sistem (CPU, RAM, load)
- Health check pentru observabilitate
- Broadcast real-time către Admin UI

**Non-goals:**
- Nu execută jobs
- Nu scrie în DB business
- Nu expune date sensibile către public

---

## 🔌 API Summary

### REST Endpoints

| Method | Endpoint | Descriere |
| :--- | :--- | :--- |
| `GET` | `/health` | Health check |
| `GET` | `/api/queues` | Toate queue-urile + counts |
| `GET` | `/api/queues/:name` | Detalii per queue |
| `GET` | `/api/system/metrics` | CPU, RAM, load |
| `POST` | `/api/control/pause` | (Protected) pause queue |

### WebSocket (`/ws/live`)

Push updates către UI cu payload JSON:

```json
{
  "type": "METRIC_UPDATE",
  "payload": {
    "timestamp": 1705312345678,
    "queues": {
      "outreach:whatsapp:send": {
        "waiting": 12,
        "active": 5,
        "failed": 0
      }
    },
    "system": {
      "cpuPercent": 45.2,
      "memoryUsageMB": 1024
    }
  }
}
```

---

## 🔐 Securitate

- Acces **internal-only** (VPC/VPN/Admin)
- Endpoints de control protejate prin `x-admin-key`
- Fără expunere publică

---

## ⚙️ Configurare (Environment Variables)

| Variabilă | Descriere | Exemplu |
| --- | --- | --- |
| `PORT` | Port server | `64000` |
| `REDIS_HOST` | Redis host | `redis` |
| `REDIS_PORT` | Redis port | `6379` |
| `MONITORING_POLL_INTERVAL_MS` | Interval polling | `2000` |
| `ADMIN_KEY` | Cheie admin pentru control | `change_me` |

---

## 📚 Documentație Detaliată

Specificația completă este în:

- [etapa0-monitoring-api-spec.md](../../docs/specifications/Etapa%200/etapa0-monitoring-api-spec.md)

---

## 🧭 Observații Operaționale

- Folosește conexiune Redis **read-only** pentru metrici
- Evită instrumentarea queue depth direct în workers
- Se recomandă limitare la intervale >= 2s pentru polling

---

**Owner:** DevOps/Platform Team  
**Ultima actualizare:** 1 Februarie 2026
