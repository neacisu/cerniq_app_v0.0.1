# ADR-FAMILY-e3-ai-core

| Câmp | Valoare |
| --- | --- |
| ID | ADR-FAMILY-e3-ai-core |
| Status | Acceptat (documentare) |
| Data | 2026-04-11 |
| Etapă | E3 |
| Familie | `ai-core` |
| Plan master | [v2_cerniq_cognitive_brain_master_implementation_plan.md](../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — `### ADR-FAMILY-e3-ai-core` |
| Autoritate runtime | [workers/shared/src/queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) |
| Hartă docs | [README Cognitive Brain](../../README.md) |

## Context

Nucleul agentului AI Sales: construire context, orchestrare, generare/validare răspuns, stocare conversație, retry. **Distinct** de E2 `ai:response:generate` (outreach).

## Dovezi confirmate în Cerniq

### Catalog — bloc C13–C18

| nodeKey | Coadă în catalog | Coadă în registry (literal) |
| --- | --- | --- |
| `e3:ai:context-build` | `ai:context:build` | `ai:context:build` |
| `e3:ai:agent-orchestrate` | `ai:agent:orchestrate` | `ai:agent:orchestrate` |
| `e3:ai:response-generate` | `ai:response:generate` | **`ai:e3:response:generate`** |
| `e3:ai:response-validate` | `ai:response:validate` | `ai:response:validate` |
| `e3:ai:conversation-store` | `ai:conversation:store` | `ai:conversation:store` |
| `e3:ai:retry-regenerate` | `ai:retry:regenerate` | `ai:retry:regenerate` |

### Reconciliere critică catalog ↔ registry

| Problemă |
| --- |
| [cognitive-node-catalog.ts](../../../../packages/shared/src/cognitive-node-catalog.ts) mapează `e3:ai:response-generate` → string **`ai:response:generate`**. |
| [queue-registry.ts](../../../../workers/shared/src/queue-registry.ts) definește **`ai:e3:response:generate`** pentru E3 (comentariu: distinct de E2). |
| **Consecință:** nealiniere documentată — una dintre surse trebuie considerată canonică la runtime; până la reconciliere în cod, ambele sunt citate ca evidență. |

### Export graf (v2)

- **12** neuroni; exemple incluzând `ai:agent:generate`, `ai:agent:orchestrate`, `ai:agent:response-generate`, `ai:context:build`, `ai:feedback:collect`, `ai:intent:classify`.

### Reconciliere graf v2 ↔ runtime

- Graf: `ai:feedback:collect`, `ai:intent:classify` — în catalog acestea apar ca **`e3:feedback:collect`**, **`e3:intent:classify`** (prefix `e3:`, nu `ai:`).
- Graf: `ai:agent:generate` — **fără** corespondent literal în blocul C13–C18; posibil etichetă graf veche.

## Decizie de guvernanță familială

1. **Proprietar:** E3 AI Sales Platform.
2. **Capabilitate:** răspunsuri B2B cu validare și retry.
3. **Telemetrie:** **CRITICAL** pe orchestrare și generare.
4. **Guardrail:** ADR-0007 (v2) — plan infrastructură; neuroni `e3:guardrail:*` în familia `guardrails`.

## Limită evidență

- Rezolvare nealiniere `ai:response:generate` vs `ai:e3:response:generate`: **task de cod** sau ADR follow-up.
