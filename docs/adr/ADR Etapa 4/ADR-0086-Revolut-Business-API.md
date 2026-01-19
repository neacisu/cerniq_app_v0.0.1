# ADR-0086: Revolut Business API Integration

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Sistemul necesită procesarea în timp real a plăților pentru reconcilierea cu facturile emise.

**Decision:** Adoptăm **webhook-first approach** cu Revolut Business API:

- Webhook pentru notificări în timp real
- Polling periodic (*/30min) ca backup pentru balance sync
- HMAC signature validation pentru securitate

**Endpoint:** `POST /webhooks/revolut/business`  
**Headers:** `X-Revolut-Signature-V1`, `X-Webhook-Id`

**Consequences:**

- (+) Procesare în timp real a plăților
- (+) Reducere latență reconciliere
- (+) Mai puține API calls (cost redus)
- (-) Necesită endpoint public expus
- (-) Complexitate pentru retry și idempotency
