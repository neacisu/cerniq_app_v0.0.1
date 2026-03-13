# Cerniq Workers

Runtime-ul canonic pentru Etapa 0 + Etapa 1 folosește workeri TypeScript buildați și porniți din `dist/`.

## Runtime activ Etapa 0 + 1

- `workers/enrichment` este workerul activ pentru pipeline-ul Bronze -> Silver -> Gold, HITL și AI J1-J4.
- `workers/shared` este pachetul comun pentru Redis, BullMQ, metrics și registry-ul canonic de queue-uri.
- Naming-ul canonic pentru queue-uri este `{domain}:{action}[:provider]}` și este definit în `workers/shared/src/queue-registry.ts`.

## Parcate pentru Etapa 2

- `workers/ai`
- `workers/outreach`

Aceste directoare sunt păstrate pentru etapele ulterioare, dar nu fac parte din stack-ul standard de deploy, compose sau CI pentru Etapa 0 + 1.
