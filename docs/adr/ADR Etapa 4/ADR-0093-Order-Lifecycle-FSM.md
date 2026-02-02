# ADR-0093: Event-Driven Order Lifecycle

**Status:** Accepted  
**Date:** 2026-01-19  
**Context:** Ciclul de viață al unei comenzi traversează multiple state și declanșează acțiuni în cascade.

**Decision:** Adoptăm **event-driven state machine** pentru orders:

```text
Order States:
DRAFT → PENDING_PAYMENT → PAYMENT_RECEIVED → CREDIT_CHECK
                                                  ↙    ↘
                          CREDIT_APPROVED   CREDIT_BLOCKED → HITL
                                ↓
CONTRACT_PENDING → CONTRACT_SIGNED → PROCESSING → READY_FOR_PICKUP
                                                        ↓
                                    PICKED_UP → IN_TRANSIT → DELIVERED → COMPLETED
                                                    ↓              ↓
                                         DELIVERY_FAILED    RETURN_REQUESTED
```

**Consequences:**

- (+) Flow clar și auditabil
- (+) Triggers automate
- (+) Easy rollback
- (-) Complexitate state machine
- (-) Race conditions posibile
