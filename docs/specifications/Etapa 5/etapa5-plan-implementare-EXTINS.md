# CERNIQ.APP — ETAPA 5: PLAN IMPLEMENTARE EXTINS
## Taskuri 444-498: Graph, Referral, WinBack, Associations, UI
### Versiunea 1.0 | 19 Ianuarie 2026

---

## Faza 5.6: Graph Analysis (Tasks 444-451)

```json
{
  "faza": "5.6",
  "nume": "Graph Analysis Workers (D20-D24)",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 444,
      "id": "E5-GRA-001",
      "titlu": "Worker D20: graph:build:relationships",
      "descriere": "Construiește graf relații din toate sursele de date",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [401, 412],
      "deliverables": [
        "workers/graph/build-relationships.worker.ts",
        "Python service endpoint /graph/build"
      ],
      "acceptance_criteria": [
        "Graf construit din gold_entity_relationships",
        "Include relații: NEIGHBOR, SAME_ASSOCIATION, REFERRAL",
        "Export NetworkX pickle pentru analysis"
      ]
    },
    {
      "task_number": 445,
      "id": "E5-GRA-002",
      "titlu": "Worker D21: community:detect:leiden",
      "descriere": "Detectare comunități cu algoritm Leiden",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [444],
      "deliverables": [
        "workers/graph/community-detect-leiden.worker.ts",
        "python-graph/leiden_detector.py"
      ],
      "acceptance_criteria": [
        "Leiden algorithm cu cdlib",
        "Resolution parameter configurable",
        "Output: communities cu modularity scores"
      ]
    },
    {
      "task_number": 446,
      "id": "E5-GRA-003",
      "titlu": "Worker D22: centrality:calculate",
      "descriere": "Calcul metrici centralitate pentru toate nodurile",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [444],
      "deliverables": [
        "workers/graph/centrality-calculate.worker.ts"
      ],
      "acceptance_criteria": [
        "Degree, Betweenness, Eigenvector, PageRank",
        "Batch processing pentru graf mare",
        "Store în gold_kol_profiles"
      ]
    },
    {
      "task_number": 447,
      "id": "E5-GRA-004",
      "titlu": "Worker D23: kol:identify",
      "descriere": "Identificare Key Opinion Leaders din centralitate",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [446],
      "deliverables": [
        "workers/graph/kol-identify.worker.ts"
      ],
      "acceptance_criteria": [
        "KOL scoring formula implementată",
        "Tier classification: ELITE, ESTABLISHED, EMERGING",
        "Trigger promotion actions"
      ]
    },
    {
      "task_number": 448,
      "id": "E5-GRA-005",
      "titlu": "Worker D24: cluster:implicit:detect",
      "descriere": "Detectare clustere implicite și salvare",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": [445, 413],
      "deliverables": [
        "workers/graph/cluster-implicit-detect.worker.ts"
      ],
      "acceptance_criteria": [
        "Creează gold_clusters pentru comunități non-formale",
        "Setează KOL pentru fiecare cluster",
        "Trigger territory calculation"
      ]
    },
    {
      "task_number": 449,
      "id": "E5-GRA-006",
      "titlu": "Python Graph Service API",
      "descriere": "FastAPI service pentru operațiuni graf",
      "tip": "BACKEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [401],
      "deliverables": [
        "python-graph/main.py",
        "python-graph/api/routes.py",
        "python-graph/services/graph_service.py"
      ]
    },
    {
      "task_number": 450,
      "id": "E5-GRA-007",
      "titlu": "Graph Analysis Tests",
      "descriere": "Unit și integration tests pentru graph",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [444, 445, 446]
    },
    {
      "task_number": 451,
      "id": "E5-GRA-008",
      "titlu": "Graph Visualization API",
      "descriere": "API pentru export graf în format d3/vis.js",
      "tip": "BACKEND",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [449]
    }
  ]
}
```

---

## Faza 5.7: Referral System (Tasks 452-461)

```json
{
  "faza": "5.7",
  "nume": "Referral System Workers (E25-E31)",
  "durata_estimata": "5 zile",
  "taskuri": [
    {
      "task_number": 452,
      "id": "E5-REF-001",
      "titlu": "Worker E25: referral:detect:mention",
      "descriere": "Detectare mențiuni referral în conversații cu LLM",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [402, 412],
      "deliverables": [
        "workers/referral/detect-mention.worker.ts"
      ],
      "acceptance_criteria": [
        "LLM prompt pentru extracție mențiuni",
        "Detectare tipuri: EXPLICIT, SOFT_MENTION",
        "Cooldown check (30 zile)"
      ]
    },
    {
      "task_number": 453,
      "id": "E5-REF-002",
      "titlu": "Worker E26: referral:request:send",
      "descriere": "Trimite cerere consimțământ la referrer",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [452],
      "deliverables": [
        "workers/referral/request-send.worker.ts"
      ],
      "acceptance_criteria": [
        "WhatsApp/Email template pentru consent",
        "Interactive buttons pentru răspuns",
        "Audit trail complet"
      ]
    },
    {
      "task_number": 454,
      "id": "E5-REF-003",
      "titlu": "Worker E27: referral:consent:process",
      "descriere": "Procesare răspuns consimțământ",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 4,
      "dependente": [453],
      "deliverables": [
        "workers/referral/consent-process.worker.ts"
      ],
      "acceptance_criteria": [
        "Handle APPROVED/REJECTED/LATER",
        "Extract contact details if provided",
        "GDPR compliant logging"
      ]
    },
    {
      "task_number": 455,
      "id": "E5-REF-004",
      "titlu": "Worker E28: referral:outreach:execute",
      "descriere": "Execută outreach la persoana referită",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [454],
      "deliverables": [
        "workers/referral/outreach-execute.worker.ts"
      ],
      "acceptance_criteria": [
        "Doar cu consent APPROVED",
        "Mention referrer în mesaj",
        "Multi-channel support"
      ]
    },
    {
      "task_number": 456,
      "id": "E5-REF-005",
      "titlu": "Worker E29: referral:conversion:track",
      "descriere": "Tracking conversie referral la client",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [455],
      "deliverables": [
        "workers/referral/conversion-track.worker.ts"
      ]
    },
    {
      "task_number": 457,
      "id": "E5-REF-006",
      "titlu": "Workers E30-E31: Reward Calculation & Processing",
      "descriere": "Calcul și procesare recompense referral",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 5,
      "dependente": [456]
    },
    {
      "task_number": 458,
      "id": "E5-REF-007",
      "titlu": "Referral API Endpoints",
      "descriere": "REST API complet pentru referrals",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [412],
      "deliverables": [
        "api/routes/referrals.ts",
        "api/schemas/referral.schema.ts"
      ]
    },
    {
      "task_number": 459,
      "id": "E5-REF-008",
      "titlu": "Referral Tests",
      "descriere": "Unit și integration tests pentru referral flow",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [452, 454, 456]
    },
    {
      "task_number": 460,
      "id": "E5-REF-009",
      "titlu": "Proximity-Based Referral Detection",
      "descriere": "Integrare proximity scores cu referral suggestions",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": [436, 437]
    },
    {
      "task_number": 461,
      "id": "E5-REF-010",
      "titlu": "Referral GDPR Compliance Review",
      "descriere": "Audit complet GDPR pentru referral flow",
      "tip": "COMPLIANCE",
      "prioritate": "CRITICAL",
      "estimare_ore": 3,
      "dependente": [454]
    }
  ]
}
```

---

## Faza 5.8: Win-Back Campaigns (Tasks 462-469)

```json
{
  "faza": "5.8",
  "nume": "Win-Back Campaign Workers (F32-F36)",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 462,
      "id": "E5-WB-001",
      "titlu": "Worker F32: winback:campaign:create",
      "descriere": "Creare campanie win-back bazată pe client value",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [416],
      "deliverables": [
        "workers/winback/campaign-create.worker.ts"
      ],
      "acceptance_criteria": [
        "Strategy selection based on revenue",
        "Offer generation logic",
        "HITL trigger for high-value"
      ]
    },
    {
      "task_number": 463,
      "id": "E5-WB-002",
      "titlu": "Worker F33: winback:step:execute",
      "descriere": "Execuție pași din campanie win-back",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [462],
      "deliverables": [
        "workers/winback/step-execute.worker.ts"
      ],
      "acceptance_criteria": [
        "Multi-channel execution (Email, WhatsApp, Phone)",
        "Step-specific templates",
        "Tracking delivery status"
      ]
    },
    {
      "task_number": 464,
      "id": "E5-WB-003",
      "titlu": "Worker F34: winback:response:process",
      "descriere": "Procesare răspunsuri din campanii",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [463]
    },
    {
      "task_number": 465,
      "id": "E5-WB-004",
      "titlu": "Workers F35-F36: Conversion & Reactivation",
      "descriere": "Tracking conversie și finalizare reactivare",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [464]
    },
    {
      "task_number": 466,
      "id": "E5-WB-005",
      "titlu": "Win-Back API Endpoints",
      "descriere": "REST API pentru campaign management",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [416]
    },
    {
      "task_number": 467,
      "id": "E5-WB-006",
      "titlu": "Win-Back Templates",
      "descriere": "Email și WhatsApp templates pentru campanii",
      "tip": "CONTENT",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": []
    },
    {
      "task_number": 468,
      "id": "E5-WB-007",
      "titlu": "Win-Back Tests",
      "descriere": "Unit și integration tests",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [462, 463]
    },
    {
      "task_number": 469,
      "id": "E5-WB-008",
      "titlu": "Win-Back Analytics Dashboard",
      "descriere": "ROI și conversion metrics pentru campanii",
      "tip": "ANALYTICS",
      "prioritate": "MEDIUM",
      "estimare_ore": 3,
      "dependente": [465]
    }
  ]
}
```

---

## Faza 5.9: Association Ingestion (Tasks 470-477)

```json
{
  "faza": "5.9",
  "nume": "Association Data Ingestion (G37-G42)",
  "durata_estimata": "4 zile",
  "taskuri": [
    {
      "task_number": 470,
      "id": "E5-ASS-001",
      "titlu": "Worker G37: ingest:ouai:scrape",
      "descriere": "Scraping PDF-uri OUAI de pe MADR",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [404, 414],
      "deliverables": [
        "workers/association/ouai-scrape.worker.ts",
        "python-pdf/ouai_extractor.py"
      ],
      "acceptance_criteria": [
        "Download PDF from MADR URLs",
        "Extract tables with tabula-py/pdfplumber",
        "Handle multiple PDF formats"
      ]
    },
    {
      "task_number": 471,
      "id": "E5-ASS-002",
      "titlu": "Worker G38: ingest:ouai:parse",
      "descriere": "Parsare și normalizare date OUAI",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [470],
      "deliverables": [
        "workers/association/ouai-parse.worker.ts"
      ],
      "acceptance_criteria": [
        "Normalize OUAI names",
        "Extract area, county, hydroamelioration",
        "Match CUI via Termene.ro"
      ]
    },
    {
      "task_number": 472,
      "id": "E5-ASS-003",
      "titlu": "Workers G39-G40: Cooperative Scraping & Parsing",
      "descriere": "Ingestie date cooperative agricole",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 6,
      "dependente": [404, 414]
    },
    {
      "task_number": 473,
      "id": "E5-ASS-004",
      "titlu": "Worker G41: ingest:madr:sync",
      "descriere": "Sincronizare periodică cu registre MADR",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": [471, 472]
    },
    {
      "task_number": 474,
      "id": "E5-ASS-005",
      "titlu": "Worker G42: ingest:affiliation:match",
      "descriere": "Matching membri-asociații din diverse surse",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [471, 414]
    },
    {
      "task_number": 475,
      "id": "E5-ASS-006",
      "titlu": "Association API Endpoints",
      "descriere": "REST API pentru associations și affiliations",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [414]
    },
    {
      "task_number": 476,
      "id": "E5-ASS-007",
      "titlu": "Association Tests",
      "descriere": "Tests pentru PDF extraction și matching",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [470, 471, 474]
    },
    {
      "task_number": 477,
      "id": "E5-ASS-008",
      "titlu": "OUAI Data Quality Dashboard",
      "descriere": "Dashboard pentru monitorizare calitate date",
      "tip": "ANALYTICS",
      "prioritate": "LOW",
      "estimare_ore": 3,
      "dependente": [471]
    }
  ]
}
```

---

## Faza 5.10: Feedback, Content, Alerts (Tasks 478-487)

```json
{
  "faza": "5.10",
  "nume": "Feedback, Content & Alerts (H-K Workers)",
  "durata_estimata": "5 zile",
  "taskuri": [
    {
      "task_number": 478,
      "id": "E5-FBK-001",
      "titlu": "Workers H43-H44: NPS Send & Process",
      "descriere": "Workflow complet NPS surveys",
      "tip": "WORKER",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [417]
    },
    {
      "task_number": 479,
      "id": "E5-FBK-002",
      "titlu": "Workers H45-H47: Entity & Competitor Extraction",
      "descriere": "Extragere entități și competitor intel din conversații",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 5,
      "dependente": [402, 417]
    },
    {
      "task_number": 480,
      "id": "E5-CNT-001",
      "titlu": "Workers I48-I51: Content Drip System",
      "descriere": "Sistem complet content drip cu scheduling",
      "tip": "WORKER",
      "prioritate": "MEDIUM",
      "estimare_ore": 6,
      "dependente": [417]
    },
    {
      "task_number": 481,
      "id": "E5-ALR-001",
      "titlu": "Workers J52-J55: Weather & Seasonal Alerts",
      "descriere": "Monitorizare și campanii bazate pe vreme",
      "tip": "WORKER",
      "prioritate": "LOW",
      "estimare_ore": 5,
      "dependente": [406, 417]
    },
    {
      "task_number": 482,
      "id": "E5-CMP-001",
      "titlu": "Workers K56-K58: Compliance & Audit",
      "descriere": "GDPR consent verification și audit trail",
      "tip": "WORKER",
      "prioritate": "CRITICAL",
      "estimare_ore": 5,
      "dependente": [412, 417]
    },
    {
      "task_number": 483,
      "id": "E5-FBK-003",
      "titlu": "Feedback API Endpoints",
      "descriere": "API pentru NPS și feedback",
      "tip": "BACKEND",
      "prioritate": "HIGH",
      "estimare_ore": 3,
      "dependente": [417]
    },
    {
      "task_number": 484,
      "id": "E5-CNT-002",
      "titlu": "Content Templates Library",
      "descriere": "Biblioteca templates pentru drip campaigns",
      "tip": "CONTENT",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": []
    },
    {
      "task_number": 485,
      "id": "E5-FBK-004",
      "titlu": "Competitor Intel Dashboard",
      "descriere": "Dashboard pentru competitive intelligence (compliant)",
      "tip": "ANALYTICS",
      "prioritate": "LOW",
      "estimare_ore": 3,
      "dependente": [479]
    },
    {
      "task_number": 486,
      "id": "E5-CMP-002",
      "titlu": "Competition Law Review",
      "descriere": "Legal review pentru competitor intel features",
      "tip": "COMPLIANCE",
      "prioritate": "CRITICAL",
      "estimare_ore": 2,
      "dependente": [479]
    },
    {
      "task_number": 487,
      "id": "E5-FBK-005",
      "titlu": "Feedback System Tests",
      "descriere": "Tests pentru toate feedback/content workers",
      "tip": "TESTING",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [478, 479, 480]
    }
  ]
}
```

---

## Faza 5.11: UI Implementation (Tasks 488-495)

```json
{
  "faza": "5.11",
  "nume": "UI Implementation",
  "durata_estimata": "6 zile",
  "taskuri": [
    {
      "task_number": 488,
      "id": "E5-UI-001",
      "titlu": "Nurturing Dashboard Page",
      "descriere": "Dashboard principal cu KPIs și charts",
      "tip": "FRONTEND",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [409],
      "deliverables": [
        "pages/nurturing/Dashboard.tsx",
        "components/nurturing/StateDistributionChart.tsx",
        "components/nurturing/ChurnTrendChart.tsx"
      ]
    },
    {
      "task_number": 489,
      "id": "E5-UI-002",
      "titlu": "Client Nurturing Detail Page",
      "descriere": "Pagină detaliu client cu lifecycle timeline",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 6,
      "dependente": [488],
      "deliverables": [
        "pages/nurturing/ClientDetail.tsx",
        "components/nurturing/LifecycleTimeline.tsx"
      ]
    },
    {
      "task_number": 490,
      "id": "E5-UI-003",
      "titlu": "Churn Risk Dashboard",
      "descriere": "Dashboard pentru management risc churn",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [488]
    },
    {
      "task_number": 491,
      "id": "E5-UI-004",
      "titlu": "Referral Management Page",
      "descriere": "Pagină pentru gestionare referrals",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 5,
      "dependente": [458]
    },
    {
      "task_number": 492,
      "id": "E5-UI-005",
      "titlu": "Clusters & Map Page",
      "descriere": "Pagină cu hartă PostGIS și clustere",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 6,
      "dependente": [443]
    },
    {
      "task_number": 493,
      "id": "E5-UI-006",
      "titlu": "KOL Management Page",
      "descriere": "Dashboard pentru Key Opinion Leaders",
      "tip": "FRONTEND",
      "prioritate": "MEDIUM",
      "estimare_ore": 4,
      "dependente": [447]
    },
    {
      "task_number": 494,
      "id": "E5-UI-007",
      "titlu": "Win-Back Campaigns Page",
      "descriere": "Gestionare campanii win-back",
      "tip": "FRONTEND",
      "prioritate": "MEDIUM",
      "estimare_ore": 5,
      "dependente": [466]
    },
    {
      "task_number": 495,
      "id": "E5-UI-008",
      "titlu": "HITL Queue Integration pentru Etapa 5",
      "descriere": "Integrare task types Etapa 5 în HITL dashboard",
      "tip": "FRONTEND",
      "prioritate": "HIGH",
      "estimare_ore": 4,
      "dependente": [488]
    }
  ]
}
```

---

## Faza 5.12: Testing & Deployment (Tasks 496-498)

```json
{
  "faza": "5.12",
  "nume": "Testing & Deployment",
  "durata_estimata": "3 zile",
  "taskuri": [
    {
      "task_number": 496,
      "id": "E5-TST-001",
      "titlu": "E2E Tests Etapa 5",
      "descriere": "End-to-end tests pentru toate flows",
      "tip": "TESTING",
      "prioritate": "CRITICAL",
      "estimare_ore": 8,
      "dependente": [488, 489, 490, 491],
      "deliverables": [
        "tests/e2e/nurturing.spec.ts",
        "tests/e2e/referral-flow.spec.ts",
        "tests/e2e/churn-detection.spec.ts"
      ]
    },
    {
      "task_number": 497,
      "id": "E5-TST-002",
      "titlu": "Security Audit Etapa 5",
      "descriere": "Security review pentru toate endpoints și flows",
      "tip": "SECURITY",
      "prioritate": "CRITICAL",
      "estimare_ore": 6,
      "dependente": [458, 466, 475, 483]
    },
    {
      "task_number": 498,
      "id": "E5-DEP-001",
      "titlu": "Deploy Etapa 5 to Production",
      "descriere": "Deployment complet cu migrations și rollback plan",
      "tip": "DEPLOYMENT",
      "prioritate": "CRITICAL",
      "estimare_ore": 8,
      "dependente": [496, 497],
      "deliverables": [
        "scripts/deploy-etapa5.sh",
        "docs/etapa5-rollback-procedures.md"
      ],
      "acceptance_criteria": [
        "Migrations executate successfully",
        "Health checks passing",
        "Monitoring dashboards operational",
        "Rollback tested"
      ]
    }
  ]
}
```

---

## Rezumat Final Etapa 5

| Fază | Taskuri | Ore | Dependențe Critice |
|------|---------|-----|-------------------|
| 5.1 Infrastructure | 400-407 | 29 | - |
| 5.2 Database | 408-419 | 34 | 5.1 |
| 5.3 State Machine | 420-427 | 32 | 5.2 |
| 5.4 Churn Detection | 428-435 | 35 | 5.2, 5.3 |
| 5.5 Geospatial | 436-443 | 29 | 5.2 |
| 5.6 Graph Analysis | 444-451 | 32 | 5.5 |
| 5.7 Referral | 452-461 | 40 | 5.5 |
| 5.8 Win-Back | 462-469 | 28 | 5.4 |
| 5.9 Associations | 470-477 | 32 | 5.2 |
| 5.10 Feedback | 478-487 | 36 | 5.2 |
| 5.11 UI | 488-495 | 41 | 5.3-5.10 |
| 5.12 Deploy | 496-498 | 22 | 5.11 |
| **TOTAL** | **99** | **390** | - |

**Timeline: ~14 săptămâni**

---

**Document generat**: 2026-01-19  
**Status**: COMPLET ✅
