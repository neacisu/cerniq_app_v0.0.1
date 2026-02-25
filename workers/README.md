# Cerniq Workers

Workers pentru pipeline-ul Cerniq (AI, Enrichment, Outreach). În Etapa 0 rulează ca Node.js (worker.js).

## Migrare TypeScript (planificată Etapa 1)

- **Stare curentă:** workers/ai, workers/enrichment, workers/outreach folosesc JavaScript (worker.js) și tsconfig pentru typecheck.
- **Plan Etapa 1:** migrarea la TypeScript complet — surse `.ts`, build cu `tsc`, rulare `node dist/worker.js`; păstrare aceeași interfață (BullMQ, Redis, healtcheck).
- **Referințe:** ADR-0015, etapa0-plan-implementare, specs Etapa 1 workers.
