# Sinapsă `ai-context-build-negotiation-summary-generate`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-context-build-negotiation-summary-generate` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-context-build/ai-context-build-negotiation-summary-generate.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-context-build` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-context-build` | **Registry (ADR-0001):** `E3_AI_CONTEXT_BUILD` → `ai:context:build` (`workers/shared/src/queue-registry.ts`). **Contract:** [`../../../neurons/E3/ai--context--build.md`](../../../neurons/E3/ai--context--build.md). |
| Destinație (graf) | `negotiation-summary-generate` | **Contract neuron (gap runtime documentat):** [`../../../neurons/E3/negotiation--summary--generate.md`](../../../neurons/E3/negotiation--summary--generate.md) — la audit, coada nominală `negotiation:summary:generate` **nu** apare în `queue-registry.ts`; **fără** potrivire în `cognitive-node-catalog.ts` (căutare `summary` în catalog: zero la audit). **Matrix:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) listează `negotiation:summary:generate` cu aliniere catalog „no”. **Consecință:** nodul din graf este trasabil la contractul neuron și la v2, dar **nu** la o coadă executabilă din registry în snapshot-ul citit — **necesită reconciliere graf ↔ registry** înainte de a trata ținta ca worker BullMQ canonic. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia de tip **dependency** leagă în planificare traseul `ai-context-build` de `negotiation-summary-generate`. v2 descrie sinapsa tot ca **„sinapsă canonică de pipeline”**, fără detalii de date. Din perspectivă business (declarativă), se exprimă intenția ca asamblarea contextului AI să preceadă sau să fie ordonată canonic față de generarea rezumatului de negociere; **fără** a afirma din export forma payloadului sau existența unui handler înregistrat pentruțintă.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** graph-export exact field match.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursa este executabilă în registry; ținta **nu** este dovedită în `queue-registry.ts` la audit — vezi contractul neuron țintă.
- **Semantic (ADR-0002):** pentru sursă, `ai:context:build` există în catalog; pentru țintă, **lipsă** în catalog la audit — aliniere la contractul neuron și la limita declarată acolo.
- **Planificare:** dependență declarată în graf între construirea contextului AI și generarea rezumatului de negociere.

## Limite și reconcilieri

- **Gap principal:** topologia exportată include `negotiation-summary-generate`, dar execuția E3 pentru aceeași coadă nominală nu este ancorată în registry/catalog în starea repo citită; orice mapare suplimentară la cozi reale cere cod sau ADR, nu presupuneri în acest contract.
- Slug graf vs literal coadă: `negotiation-summary-generate` ↔ `negotiation:summary:generate` (convenție Matrix) — fără presupuneri despre mesaje între cozi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-context-build-negotiation-summary-generate\``.
