# CERNIQ.APP — ETAPA 4: PLAN IMPLEMENTARE COMPLET

## Monitorizare Post-Vânzare - 99 Taskuri Granulare

### Versiunea 1.0 | 19 Ianuarie 2026

---

# CUPRINS

1. [Overview Implementare](#1-overview)
2. [Faza 4.1: Infrastructure Setup](#2-faza-41)
3. [Faza 4.2: Database Schema](#3-faza-42)
4. [Faza 4.3: Revolut Integration](#4-faza-43)
5. [Faza 4.4: Payment Reconciliation](#5-faza-44)
6. [Faza 4.5: Credit Scoring System](#6-faza-45)
7. [Faza 4.6: Sameday Logistics](#7-faza-46)
8. [Faza 4.7: Dynamic Contracts](#8-faza-47)
9. [Faza 4.8: Returns & Refunds](#9-faza-48)
10. [Faza 4.9: HITL System](#10-faza-49)
11. [Faza 4.10: UI Implementation](#11-faza-410)
12. [Faza 4.11: Testing & QA](#12-faza-411)
13. [Faza 4.12: Deployment](#13-faza-412)
14. [Rezumat Estimări](#14-rezumat)

---

## 1. Overview Implementare {#1-overview}

### Metrici Generale

- **Total Taskuri**: 99
- **Durată Estimată**: 12-14 săptămâni
- **Echipă**: 1 person team (vertical slice)
- **Task Range**: 301-399

### Dependențe

- Etapa 0: Infrastructure completă
- Etapa 1: Bronze/Silver/Gold schema
- Etapa 2: Cold Outreach funcțional
- Etapa 3: AI Agent negociere

---

## 2. Faza 4.1: Infrastructure Setup {#2-faza-41}

### Task 301-308 (8 taskuri)

```json
{
  "faza": "4.1",
  "nume": "Infrastructure Setup",
  "durata_estimata": "3 zile",
  "taskuri": [
    {
      "task_number": 301,
      "id": "E4-INF-001",
      "titlu": "Setup Redis Queues pentru Etapa 4",
      "descriere": "Configurare BullMQ queues pentru toate categoriile de workers (A-K)",
      "tip": "INFRASTRUCTURE",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [],
      "deliverables": [
        "configs/queues/etapa4-queues.ts",
        "Queue definitions pentru 67 workers",
        "Rate limit configurations"
      ],
      "acceptare": [
        "Toate queues create în Redis",
        "Dashboard BullMQ accesibil",
        "Rate limits configurate"
      ],
      "tehnologii": ["Redis 8.4.0", "BullMQ 5.66.5"]
    },
    {
      "task_number": 302,
      "id": "E4-INF-002",
      "titlu": "Setup Webhook Endpoints Infrastructure",
      "descriere": "Configurare Traefik routes și middleware pentru webhook endpoints",
      "tip": "INFRASTRUCTURE",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [301],
      "deliverables": [
        "traefik/dynamic/webhooks.yml",
        "Rate limiting middleware",
        "IP allowlisting pentru Revolut"
      ],
      "acceptare": [
        "Routes accesibile extern",
        "SSL/TLS funcțional",
        "Rate limiting activ"
      ]
    },
    {
      "task_number": 303,
      "id": "E4-INF-003",
      "titlu": "Configure External API Clients",
      "descriere": "Setup clienți HTTP pentru Revolut, Termene.ro, Sameday, DocuSign",
      "tip": "INFRASTRUCTURE",
      "prioritate": "HIGH",
      "estimare_ore": 6,
      "dependente": [],
      "deliverables": [
        "libs/clients/revolut-client.ts",
        "libs/clients/termene-client.ts",
        "libs/clients/sameday-client.ts",
        "libs/clients/docusign-client.ts"
      ],
      "acceptare": [
        "Toate clientele funcționale cu sandbox",
        "Retry logic implementat",
        "Error handling consistent"
      ]
    },
    {
      "task_number": 304,
      "id": "E4-INF-004",
      "titlu": "Setup Environment Variables Etapa 4",
      "descriere": "Definire și documentare variabile de mediu pentru toate integrările",
      "tip": "INFRASTRUCTURE",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [],
      "deliverables": [
        ".env.example actualizat",
        "Docker secrets pentru API keys",
        "Documentație variabile"
      ],
      "acceptare": [
        "Toate variabilele documentate",
        "Secrets în Docker manager",
        "Validare la startup"
      ]
    },
    {
      "task_number": 305,
      "id": "E4-INF-005",
      "titlu": "Setup Cron Jobs Etapa 4",
      "descriere": "Configurare cron scheduler pentru joburi periodice",
      "tip": "INFRASTRUCTURE",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [301],
      "deliverables": [
        "workers/cron/etapa4-scheduler.ts",
        "Cron expressions pentru toate joburile",
        "Monitoring pentru cron jobs"
      ],
      "acceptare": [
        "14 cron jobs configurate",
        "Logging pentru execuții",
        "Health checks active"
      ]
    },
    {
      "task_number": 306,
      "id": "E4-INF-006",
      "titlu": "Setup Notification Services",
      "descriere": "Configurare servicii pentru email, WhatsApp, Slack notifications",
      "tip": "INFRASTRUCTURE",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": [],
      "deliverables": [
        "libs/services/notification-service.ts",
        "Email templates",
        "WhatsApp template configs"
      ],
      "acceptare": [
        "Email sending funcțional",
        "WhatsApp via TimelinesAI",
        "Slack webhook activ"
      ]
    },
    {
      "task_number": 307,
      "id": "E4-INF-007",
      "titlu": "Setup File Storage pentru Contracts",
      "descriere": "Configurare storage pentru documente generate (contracts, AWBs)",
      "tip": "INFRASTRUCTURE",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [],
      "deliverables": [
        "libs/services/storage-service.ts",
        "S3-compatible bucket config",
        "Presigned URL generation"
      ],
      "acceptare": [
        "Upload/download funcțional",
        "Presigned URLs pentru download",
        "Retention policy setat"
      ]
    },
    {
      "task_number": 308,
      "id": "E4-INF-008",
      "titlu": "Setup Python Service pentru Contract Generation",
      "descriere": "Container Python cu docxtpl și LibreOffice pentru generare contracte",
      "tip": "INFRASTRUCTURE",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [],
      "deliverables": [
        "docker/python-docs/Dockerfile",
        "python-docs/contract_generator.py",
        "API endpoint pentru generare"
      ],
      "acceptare": [
        "DOCX generation funcțional",
        "PDF conversion funcțional",
        "API accesibil din Node"
      ]
    }
  ]
}
```

---

## 3. Faza 4.2: Database Schema {#3-faza-42}

### Task 309-320 (12 taskuri)

```json
{
  "faza": "4.2",
  "nume": "Database Schema Implementation",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 309,
      "id": "E4-DB-001",
      "titlu": "Create Etapa 4 Enums",
      "descriere": "Creare toate enum types pentru orders, payments, credit, logistics",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 2,
      "dependente": [],
      "deliverables": [
        "migrations/0400_create_etapa4_enums.ts",
        "16 enum types definite"
      ],
      "acceptare": [
        "Migration executată cu succes",
        "Enums vizibile în pg_type"
      ]
    },
    {
      "task_number": 310,
      "id": "E4-DB-002",
      "titlu": "Create gold_orders Table",
      "descriere": "Tabel principal pentru comenzi cu toate coloanele și constraints",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 3,
      "dependente": [309],
      "deliverables": [
        "migrations/0401a_create_gold_orders.ts",
        "Drizzle schema definition",
        "Indexes create"
      ],
      "acceptare": [
        "Table created cu toate coloanele",
        "Foreign keys funcționale",
        "Indexes verificate"
      ]
    },
    {
      "task_number": 311,
      "id": "E4-DB-003",
      "titlu": "Create gold_order_items Table",
      "descriere": "Tabel pentru linii comandă cu calcule automate",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 2,
      "dependente": [310],
      "deliverables": [
        "migrations/0401b_create_gold_order_items.ts"
      ]
    },
    {
      "task_number": 312,
      "id": "E4-DB-004",
      "titlu": "Create gold_payments Table",
      "descriere": "Tabel pentru înregistrare plăți primite",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 2,
      "dependente": [310],
      "deliverables": [
        "migrations/0401c_create_gold_payments.ts"
      ]
    },
    {
      "task_number": 313,
      "id": "E4-DB-005",
      "titlu": "Create gold_refunds Table",
      "descriere": "Tabel pentru retururi și refund-uri",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [312],
      "deliverables": [
        "migrations/0401d_create_gold_refunds.ts"
      ]
    },
    {
      "task_number": 314,
      "id": "E4-DB-006",
      "titlu": "Create Credit Tables",
      "descriere": "gold_credit_profiles, gold_credit_reservations, gold_termene_data",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [309],
      "deliverables": [
        "migrations/0402_create_credit_tables.ts"
      ]
    },
    {
      "task_number": 315,
      "id": "E4-DB-007",
      "titlu": "Create Logistics Tables",
      "descriere": "gold_addresses, gold_shipments, gold_shipment_tracking, gold_returns",
      "tip": "DATABASE",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [310],
      "deliverables": [
        "migrations/0403_create_logistics_tables.ts"
      ]
    },
    {
      "task_number": 316,
      "id": "E4-DB-008",
      "titlu": "Create Contract Tables",
      "descriere": "gold_contracts, gold_contract_templates, gold_contract_signatures",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [310],
      "deliverables": [
        "migrations/0404_create_contract_tables.ts"
      ]
    },
    {
      "task_number": 317,
      "id": "E4-DB-009",
      "titlu": "Create Audit Tables with Partitions",
      "descriere": "gold_audit_logs_etapa4 cu partitioning lunar",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [309],
      "deliverables": [
        "migrations/0405_create_audit_tables.ts",
        "Partition management script"
      ]
    },
    {
      "task_number": 318,
      "id": "E4-DB-010",
      "titlu": "Create hitl_approvals Table",
      "descriere": "Tabel pentru HITL approval queue",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [309],
      "deliverables": [
        "migrations/0406_create_hitl_table.ts"
      ]
    },
    {
      "task_number": 319,
      "id": "E4-DB-011",
      "titlu": "Create Database Functions",
      "descriere": "Funcții pentru credit scoring, triggers pentru status updates",
      "tip": "DATABASE",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [314, 315],
      "deliverables": [
        "migrations/0407_create_functions.ts",
        "calculate_credit_score()",
        "update_credit_reserved()",
        "update_shipment_from_tracking()"
      ]
    },
    {
      "task_number": 320,
      "id": "E4-DB-012",
      "titlu": "Seed Initial Data",
      "descriere": "Contract templates, default clauses, test data",
      "tip": "DATABASE",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [316],
      "deliverables": [
        "migrations/0410_seed_etapa4_data.ts"
      ]
    }
  ]
}
```

---

## 4. Faza 4.3: Revolut Integration {#4-faza-43}

### Task 321-328 (8 taskuri)

```json
{
  "faza": "4.3",
  "nume": "Revolut Business Integration",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 321,
      "id": "E4-REV-001",
      "titlu": "Implement Revolut Webhook Endpoint",
      "descriere": "Fastify route pentru primire webhooks cu HMAC validation",
      "tip": "BACKEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [302, 303],
      "deliverables": [
        "routes/webhooks/revolut.ts",
        "HMAC validation middleware",
        "Idempotency check"
      ],
      "acceptare": [
        "Webhook primește date",
        "Signature validation funcțional",
        "Duplicate detection activ"
      ]
    },
    {
      "task_number": 322,
      "id": "E4-REV-002",
      "titlu": "Worker A1: revolut:webhook:ingest",
      "descriere": "Worker pentru procesare inițială webhook",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [321],
      "deliverables": [
        "workers/revolut/webhook-ingest.worker.ts"
      ]
    },
    {
      "task_number": 323,
      "id": "E4-REV-003",
      "titlu": "Worker A2: revolut:transaction:process",
      "descriere": "Worker pentru procesare tranzacție și extragere date",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 3,
      "dependente": [322]
    },
    {
      "task_number": 324,
      "id": "E4-REV-004",
      "titlu": "Worker A3: revolut:payment:record",
      "descriere": "Worker pentru înregistrare plată în baza de date",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 3,
      "dependente": [323, 312]
    },
    {
      "task_number": 325,
      "id": "E4-REV-005",
      "titlu": "Worker A4: revolut:refund:process",
      "descriere": "Worker pentru procesare refund-uri via Revolut API",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [303, 313]
    },
    {
      "task_number": 326,
      "id": "E4-REV-006",
      "titlu": "Worker A5: revolut:balance:sync",
      "descriere": "Worker cron pentru sincronizare balante cont",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 2,
      "dependente": [303, 305]
    },
    {
      "task_number": 327,
      "id": "E4-REV-007",
      "titlu": "Worker A6: revolut:webhook:validate",
      "descriere": "Worker pentru validare tranzacție cu Revolut API",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 2,
      "dependente": [303]
    },
    {
      "task_number": 328,
      "id": "E4-REV-008",
      "titlu": "Revolut Integration Tests",
      "descriere": "Unit și integration tests pentru Revolut flow",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [322, 323, 324]
    }
  ]
}
```

---

## 5. Faza 4.4: Payment Reconciliation {#5-faza-44}

### Task 329-336 (8 taskuri)

```json
{
  "faza": "4.4",
  "nume": "Payment Reconciliation System",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 329,
      "id": "E4-REC-001",
      "titlu": "Worker B7: payment:reconcile:auto",
      "descriere": "Worker pentru reconciliere automată exact match",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [324, 312]
    },
    {
      "task_number": 330,
      "id": "E4-REC-002",
      "titlu": "Worker B8: payment:reconcile:fuzzy",
      "descriere": "Worker pentru reconciliere fuzzy cu scoring",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 6,
      "dependente": [329]
    },
    {
      "task_number": 331,
      "id": "E4-REC-003",
      "titlu": "Fuzzy Matching Algorithm",
      "descriere": "Implementare algoritm fuzzy pentru name și amount matching",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [],
      "deliverables": [
        "libs/utils/fuzzy-matcher.ts",
        "Levenshtein distance",
        "Amount tolerance calc"
      ]
    },
    {
      "task_number": 332,
      "id": "E4-REC-004",
      "titlu": "Worker B9: payment:reconcile:manual",
      "descriere": "Worker pentru reconciliere manuală după HITL approval",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [329, 318]
    },
    {
      "task_number": 333,
      "id": "E4-REC-005",
      "titlu": "Worker B10: payment:balance:update",
      "descriere": "Worker pentru actualizare solduri după reconciliere",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [329]
    },
    {
      "task_number": 334,
      "id": "E4-REC-006",
      "titlu": "Worker B11: payment:overdue:detect",
      "descriere": "Cron worker pentru detectare facturi restante",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [305, 310]
    },
    {
      "task_number": 335,
      "id": "E4-REC-007",
      "titlu": "Worker B12: payment:overdue:escalate",
      "descriere": "Worker pentru escalare facturi restante",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [334, 306]
    },
    {
      "task_number": 336,
      "id": "E4-REC-008",
      "titlu": "Reconciliation Tests",
      "descriere": "Tests pentru toate scenariile de reconciliere",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [329, 330, 331]
    }
  ]
}
```

---

## 6. Faza 4.5: Credit Scoring System {#6-faza-45}

### Task 337-348 (12 taskuri)

```json
{
  "faza": "4.5",
  "nume": "Credit Scoring & Limits",
  "durata_estimata": "5 zile",
  "taskuri": [
    {
      "task_number": 337,
      "id": "E4-CRD-001",
      "titlu": "Termene.ro API Client",
      "descriere": "Client complet pentru Termene.ro API cu toate endpoints",
      "tip": "BACKEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [303],
      "deliverables": [
        "Endpoints: ANAF, Bilant, BPI, Litigii",
        "Response parsing",
        "Error handling"
      ]
    },
    {
      "task_number": 338,
      "id": "E4-CRD-002",
      "titlu": "Worker C13: credit:profile:create",
      "descriere": "Worker pentru creare profil credit nou client",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 3,
      "dependente": [314, 337]
    },
    {
      "task_number": 339,
      "id": "E4-CRD-003",
      "titlu": "Worker C14: credit:data:fetch-anaf",
      "descriere": "Worker pentru fetch date ANAF via Termene.ro",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [337]
    },
    {
      "task_number": 340,
      "id": "E4-CRD-004",
      "titlu": "Worker C15: credit:data:fetch-bilant",
      "descriere": "Worker pentru fetch date bilanț",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [337]
    },
    {
      "task_number": 341,
      "id": "E4-CRD-005",
      "titlu": "Worker C16: credit:data:fetch-bpi",
      "descriere": "Worker pentru fetch date BPI (insolvență)",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 2,
      "dependente": [337]
    },
    {
      "task_number": 342,
      "id": "E4-CRD-006",
      "titlu": "Credit Score Formula",
      "descriere": "Implementare algoritm scoring cu toate componentele",
      "tip": "BACKEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [],
      "deliverables": [
        "libs/services/credit-score-calculator.ts",
        "Component weights",
        "Risk tier determination"
      ]
    },
    {
      "task_number": 343,
      "id": "E4-CRD-007",
      "titlu": "Worker C17: credit:score:calculate",
      "descriere": "Worker pentru calcul credit score după date fetch",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [342, 339, 340, 341]
    },
    {
      "task_number": 344,
      "id": "E4-CRD-008",
      "titlu": "Worker C18: credit:limit:calculate",
      "descriere": "Worker pentru calcul limită credit din score",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [343]
    },
    {
      "task_number": 345,
      "id": "E4-CRD-009",
      "titlu": "Worker D19: credit:limit:check",
      "descriere": "Worker pentru verificare credit la plasare comandă",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [314]
    },
    {
      "task_number": 346,
      "id": "E4-CRD-010",
      "titlu": "Worker D20: credit:limit:reserve",
      "descriere": "Worker pentru rezervare credit",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [345]
    },
    {
      "task_number": 347,
      "id": "E4-CRD-011",
      "titlu": "Worker D21: credit:limit:release",
      "descriere": "Worker pentru eliberare credit la plată/anulare",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [346]
    },
    {
      "task_number": 348,
      "id": "E4-CRD-012",
      "titlu": "Credit System Tests",
      "descriere": "Tests pentru credit scoring și limite",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [343, 345]
    }
  ]
}
```

---

## 7. Faza 4.6: Sameday Logistics {#7-faza-46}

### Task 349-358 (10 taskuri)

```json
{
  "faza": "4.6",
  "nume": "Sameday Courier Integration",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 349,
      "id": "E4-LOG-001",
      "titlu": "Sameday API Client",
      "descriere": "Client complet pentru Sameday API",
      "tip": "BACKEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [303],
      "deliverables": [
        "AWB creation",
        "Tracking endpoint",
        "Pickup scheduling",
        "Return initiation"
      ]
    },
    {
      "task_number": 350,
      "id": "E4-LOG-002",
      "titlu": "Worker E22: sameday:awb:create",
      "descriere": "Worker pentru generare AWB",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [349, 315]
    },
    {
      "task_number": 351,
      "id": "E4-LOG-003",
      "titlu": "Worker E23: sameday:status:poll",
      "descriere": "Worker repeating pentru polling tracking status",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [349]
    },
    {
      "task_number": 352,
      "id": "E4-LOG-004",
      "titlu": "Worker E24: sameday:status:process",
      "descriere": "Worker pentru procesare schimbare status",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [351]
    },
    {
      "task_number": 353,
      "id": "E4-LOG-005",
      "titlu": "Worker E25: sameday:cod:process",
      "descriere": "Worker pentru procesare COD collection",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [352]
    },
    {
      "task_number": 354,
      "id": "E4-LOG-006",
      "titlu": "Worker E26: sameday:return:initiate",
      "descriere": "Worker pentru inițiere retur la curier",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [349]
    },
    {
      "task_number": 355,
      "id": "E4-LOG-007",
      "titlu": "Worker E27: sameday:pickup:schedule",
      "descriere": "Cron worker pentru programare pickup",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 2,
      "dependente": [349, 305]
    },
    {
      "task_number": 356,
      "id": "E4-LOG-008",
      "titlu": "Sameday Webhook Endpoint",
      "descriere": "Endpoint pentru primire status updates",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [302]
    },
    {
      "task_number": 357,
      "id": "E4-LOG-009",
      "titlu": "Stock Sync Workers (F28-F31)",
      "descriere": "Workers pentru sync stoc cu Oblio",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 6,
      "dependente": [310]
    },
    {
      "task_number": 358,
      "id": "E4-LOG-010",
      "titlu": "Logistics Tests",
      "descriere": "Tests pentru Sameday integration",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [350, 352]
    }
  ]
}
```

---

## 8. Faza 4.7: Dynamic Contracts {#8-faza-47}

### Task 359-368 (10 taskuri)

```json
{
  "faza": "4.7",
  "nume": "Dynamic Contract Generation",
  "durata_estimata": "5 zile",
  "taskuri": [
    {
      "task_number": 359,
      "id": "E4-CTR-001",
      "titlu": "Contract Template Engine",
      "descriere": "Implementare motor de template-uri cu Jinja2",
      "tip": "BACKEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [308],
      "deliverables": [
        "Template variable injection",
        "Clause assembly logic",
        "Conflict detection"
      ]
    },
    {
      "task_number": 360,
      "id": "E4-CTR-002",
      "titlu": "Worker G32: contract:template:select",
      "descriere": "Worker pentru selecție template bazat pe risk tier",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [316, 359]
    },
    {
      "task_number": 361,
      "id": "E4-CTR-003",
      "titlu": "Worker G33: contract:clause:assemble",
      "descriere": "Worker pentru asamblare clauze",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [360]
    },
    {
      "task_number": 362,
      "id": "E4-CTR-004",
      "titlu": "Worker G34: contract:generate:docx",
      "descriere": "Worker pentru generare DOCX și conversie PDF",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [308, 361]
    },
    {
      "task_number": 363,
      "id": "E4-CTR-005",
      "titlu": "DocuSign Integration",
      "descriere": "Integrare completă DocuSign pentru semnături",
      "tip": "BACKEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 8,
      "dependente": [303],
      "deliverables": [
        "Envelope creation",
        "Recipient management",
        "Webhook handling",
        "Document download"
      ]
    },
    {
      "task_number": 364,
      "id": "E4-CTR-006",
      "titlu": "Worker G35: contract:sign:request",
      "descriere": "Worker pentru trimitere contract la semnare",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [362, 363]
    },
    {
      "task_number": 365,
      "id": "E4-CTR-007",
      "titlu": "Worker G36: contract:sign:complete",
      "descriere": "Worker pentru procesare semnătură completă",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [364]
    },
    {
      "task_number": 366,
      "id": "E4-CTR-008",
      "titlu": "DocuSign Webhook Endpoint",
      "descriere": "Endpoint pentru primire DocuSign Connect events",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [302]
    },
    {
      "task_number": 367,
      "id": "E4-CTR-009",
      "titlu": "Contract Template CRUD API",
      "descriere": "API pentru managementul template-urilor",
      "tip": "BACKEND",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": [316]
    },
    {
      "task_number": 368,
      "id": "E4-CTR-010",
      "titlu": "Contract Tests",
      "descriere": "Tests pentru contract generation flow",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [362, 365]
    }
  ]
}
```

---

## 9. Faza 4.8: Returns & Refunds {#9-faza-48}

### Task 369-374 (6 taskuri)

```json
{
  "faza": "4.8",
  "nume": "Returns & Refunds",
  "durata_estimata": "3 zile",
  "taskuri": [
    {
      "task_number": 369,
      "id": "E4-RET-001",
      "titlu": "Worker H37: return:request:create",
      "descriere": "Worker pentru procesare cerere retur",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [315]
    },
    {
      "task_number": 370,
      "id": "E4-RET-002",
      "titlu": "Return Eligibility Logic",
      "descriere": "Implementare reguli de eligibilitate retur",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": []
    },
    {
      "task_number": 371,
      "id": "E4-RET-003",
      "titlu": "Worker H38: return:process:stock",
      "descriere": "Worker pentru restocking după retur",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [369, 357]
    },
    {
      "task_number": 372,
      "id": "E4-RET-004",
      "titlu": "Refund Approval Flow",
      "descriere": "Implementare flow aprobare refund cu HITL",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [313, 318]
    },
    {
      "task_number": 373,
      "id": "E4-RET-005",
      "titlu": "Returns API Endpoints",
      "descriere": "CRUD endpoints pentru returns",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [315]
    },
    {
      "task_number": 374,
      "id": "E4-RET-006",
      "titlu": "Returns Tests",
      "descriere": "Tests pentru returns flow",
      "tip": "TESTING",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [369, 371]
    }
  ]
}
```

---

## 10. Faza 4.9: HITL System {#10-faza-49}

### Task 375-382 (8 taskuri)

```json
{
  "faza": "4.9",
  "nume": "Human-in-the-Loop System",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 375,
      "id": "E4-HTL-001",
      "titlu": "HITL Task Manager Service",
      "descriere": "Serviciu central pentru gestionare taskuri HITL",
      "tip": "BACKEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [318],
      "deliverables": [
        "Task creation",
        "Assignment logic",
        "SLA calculation",
        "Resolution handling"
      ]
    },
    {
      "task_number": 376,
      "id": "E4-HTL-002",
      "titlu": "Worker K48: hitl:approval:credit-override",
      "descriere": "Worker pentru cereri override credit",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [375, 345]
    },
    {
      "task_number": 377,
      "id": "E4-HTL-003",
      "titlu": "Worker K49: hitl:approval:credit-limit",
      "descriere": "Worker pentru aprobare limite credit mari",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [375, 344]
    },
    {
      "task_number": 378,
      "id": "E4-HTL-004",
      "titlu": "Worker K50: hitl:approval:refund-large",
      "descriere": "Worker pentru aprobare refund mare",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [375, 372]
    },
    {
      "task_number": 379,
      "id": "E4-HTL-005",
      "titlu": "Worker K51: hitl:investigation:payment",
      "descriere": "Worker pentru investigare plăți nereconciliate",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [375, 330]
    },
    {
      "task_number": 380,
      "id": "E4-HTL-006",
      "titlu": "Worker K52: hitl:task:resolve",
      "descriere": "Worker pentru execuție decizie HITL",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [375]
    },
    {
      "task_number": 381,
      "id": "E4-HTL-007",
      "titlu": "Worker K53: hitl:escalation:overdue",
      "descriere": "Worker pentru escalare SLA depășit",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [375, 306]
    },
    {
      "task_number": 382,
      "id": "E4-HTL-008",
      "titlu": "HITL API Endpoints",
      "descriere": "REST API pentru HITL queue",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [375]
    }
  ]
}
```

---

## 11. Faza 4.10: UI Implementation {#11-faza-410}

### Task 383-394 (12 taskuri)

```json
{
  "faza": "4.10",
  "nume": "UI Implementation",
  "durata_estimata": "6 zile",
  "taskuri": [
    {
      "task_number": 383,
      "id": "E4-UI-001",
      "titlu": "Monitoring Dashboard Page",
      "descriere": "Dashboard principal cu KPIs și charts",
      "tip": "FRONTEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 8,
      "dependente": [],
      "deliverables": [
        "KPI cards",
        "Cash flow chart",
        "Status distribution",
        "Alerts panel"
      ]
    },
    {
      "task_number": 384,
      "id": "E4-UI-002",
      "titlu": "Orders List Page",
      "descriere": "Pagină listă comenzi cu filtre și acțiuni",
      "tip": "FRONTEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [383]
    },
    {
      "task_number": 385,
      "id": "E4-UI-003",
      "titlu": "Order Detail Page",
      "descriere": "Pagină detaliu comandă cu timeline și relații",
      "tip": "FRONTEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 8,
      "dependente": [384]
    },
    {
      "task_number": 386,
      "id": "E4-UI-004",
      "titlu": "Payments Page & Reconciliation",
      "descriere": "Pagină plăți cu tab reconciliere manuală",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 6,
      "dependente": [383]
    },
    {
      "task_number": 387,
      "id": "E4-UI-005",
      "titlu": "Credit Profiles Page",
      "descriere": "Pagină management profile credit",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [383]
    },
    {
      "task_number": 388,
      "id": "E4-UI-006",
      "titlu": "Shipments & Tracking Page",
      "descriere": "Pagină tracking livrări cu status map",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [383]
    },
    {
      "task_number": 389,
      "id": "E4-UI-007",
      "titlu": "Contracts Page",
      "descriere": "Pagină contracte cu pending signatures",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [383]
    },
    {
      "task_number": 390,
      "id": "E4-UI-008",
      "titlu": "Returns Page",
      "descriere": "Pagină returns cu inspection flow",
      "tip": "FRONTEND",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": [383]
    },
    {
      "task_number": 391,
      "id": "E4-UI-009",
      "titlu": "HITL Queue Page",
      "descriere": "Dashboard HITL cu approval cards",
      "tip": "FRONTEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [383]
    },
    {
      "task_number": 392,
      "id": "E4-UI-010",
      "titlu": "Status Badges & Components",
      "descriere": "Componente reusable pentru toate status-urile",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": []
    },
    {
      "task_number": 393,
      "id": "E4-UI-011",
      "titlu": "Dialog Components",
      "descriere": "Dialoguri pentru toate acțiunile",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [392],
      "deliverables": [
        "CreditOverrideDialog",
        "ManualReconciliationDialog",
        "ReturnRequestDialog",
        "HITLApprovalDialog"
      ]
    },
    {
      "task_number": 394,
      "id": "E4-UI-012",
      "titlu": "Analytics Page",
      "descriere": "Rapoarte și charts pentru analytics",
      "tip": "FRONTEND",
      "prioritate": "MEDIUM",
      "estimare_ore": 5,
      "dependente": [383]
    }
  ]
}
```

---

## 12. Faza 4.11: Testing & QA {#12-faza-411}

### Task 395-398 (4 taskuri)

```json
{
  "faza": "4.11",
  "nume": "Testing & Quality Assurance",
  "durata_estimata": "3 zile",
  "taskuri": [
    {
      "task_number": 395,
      "id": "E4-QA-001",
      "titlu": "Integration Tests Complete",
      "descriere": "Completare toate integration tests",
      "tip": "TESTING",
      "prioritate": "CRITICAL",
      "estimare_ore": 8,
      "dependente": ["all workers"]
    },
    {
      "task_number": 396,
      "id": "E4-QA-002",
      "titlu": "E2E Tests pentru Flows Critice",
      "descriere": "E2E tests pentru order lifecycle complet",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 6,
      "dependente": [395]
    },
    {
      "task_number": 397,
      "id": "E4-QA-003",
      "titlu": "Performance Testing",
      "descriere": "Load tests pentru workers și API",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [395]
    },
    {
      "task_number": 398,
      "id": "E4-QA-004",
      "titlu": "Security Audit",
      "descriere": "Audit webhook security și API auth",
      "tip": "TESTING",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [321, 356, 366]
    }
  ]
}
```

---

## 13. Faza 4.12: Deployment {#13-faza-412}

### Task 399 (1 task)

```json
{
  "faza": "4.12",
  "nume": "Production Deployment",
  "durata_estimata": "1 zi",
  "taskuri": [
    {
      "task_number": 399,
      "id": "E4-DEP-001",
      "titlu": "Production Deployment & Go-Live",
      "descriere": "Deploy complet Etapa 4 în producție",
      "tip": "DEPLOYMENT",
      "prioritate": "CRITICAL",
      "estimare_ore": 8,
      "dependente": [395, 396, 397, 398],
      "deliverables": [
        "Database migrations applied",
        "Workers deployed and running",
        "Webhooks configured in production",
        "Monitoring dashboards active",
        "Runbook documentation"
      ],
      "acceptare": [
        "All workers processing jobs",
        "Webhooks receiving data",
        "UI accessible",
        "Alerts configured",
        "Documentation complete"
      ],
      "rollback_plan": "Rollback migrations, disable workers, restore previous version"
    }
  ]
}
```

---

## 14. Rezumat Estimări {#14-rezumat}

### Total pe Faze

| Fază | Nume | Taskuri | Ore | Zile |
|------|------|---------|-----|------|
| 4.1 | Infrastructure Setup | 8 | 30 | 3 |
| 4.2 | Database Schema | 12 | 34 | 4 |
| 4.3 | Revolut Integration | 8 | 26 | 4 |
| 4.4 | Payment Reconciliation | 8 | 32 | 4 |
| 4.5 | Credit Scoring | 12 | 42 | 5 |
| 4.6 | Sameday Logistics | 10 | 36 | 4 |
| 4.7 | Dynamic Contracts | 10 | 45 | 5 |
| 4.8 | Returns & Refunds | 6 | 21 | 3 |
| 4.9 | HITL System | 8 | 33 | 4 |
| 4.10 | UI Implementation | 12 | 66 | 6 |
| 4.11 | Testing & QA | 4 | 22 | 3 |
| 4.12 | Deployment | 1 | 8 | 1 |
| **TOTAL** | | **99** | **395** | **~50 zile** |

### Timeline Estimată

- **Start**: Săptămâna 1
- **Infrastructure + DB**: Săptămânile 1-2
- **Core Workers**: Săptămânile 3-6
- **Contracts + HITL**: Săptămânile 7-8
- **UI**: Săptămânile 9-10
- **Testing + Deploy**: Săptămânile 11-12

### Riscuri și Mitigări

1. **DocuSign API complexity** → Sandbox testing extensiv
2. **Termene.ro rate limits** → Caching și batching
3. **State machine complexity** → Unit tests comprehensive
4. **HITL bottleneck** → SLA monitoring și escalare automată

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
