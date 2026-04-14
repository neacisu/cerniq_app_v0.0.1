# Sinapsă `bronze-ingest-json-parser-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `bronze-ingest-json-parser-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/bronze-ingest-json-parser/bronze-ingest-json-parser-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `bronze-ingest-json-parser` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `bronze-ingest-json-parser` | Traseu în graf; contract neuron: [`../../../neurons/E1/bronze--ingest--json-parser.md`](../../../neurons/E1/bronze--ingest--json-parser.md). **Runtime (ADR-0001):** v2 `bronze:ingest:json-parser` **fără** coadă dedicată în registry — suprapunere parțială semantică cu **`ingest:webhook`** documentată în contract. **Semantic (ADR-0002):** `e1:ingest:webhook` ca cea mai apropiată intrare catalog; **nu** echivalență 1:1. |
| Destinație (graf) | `e1-ingest` | Agregat **familie ingest E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../adr/families/e1/ingest.md`](../../../adr/families/e1/ingest.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **bronze-ingest-json-parser** sub agregatul **`e1-ingest`**. v2: **„specializează familia”**. Detaliile de ingestie JSON bronze și reconcilierea cu webhook rămân în contractul neuron, nu în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`bronze-ingest-json-parser-silver-norm-address.md`](bronze-ingest-json-parser-silver-norm-address.md), [`bronze-ingest-json-parser-silver-norm-company-name.md`](bronze-ingest-json-parser-silver-norm-company-name.md), [`bronze-ingest-json-parser-silver-norm-email.md`](bronze-ingest-json-parser-silver-norm-email.md), [`bronze-ingest-json-parser-silver-norm-phone-e164.md`](bronze-ingest-json-parser-silver-norm-phone-e164.md).

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** specializează familia
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

- **Runtime (ADR-0001):** `e1-ingest` agregat vs absența cozii literale v2 pentru JSON-parser — vezi contract sursă.
- **Semantic (ADR-0002):** familia ingest E1 + intrări webhook/normalizări legate prin sinapse dependență.
- **Planificare:** v2 §7 — `bronze-ingest-json-parser` → `e1-ingest`.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- **Graf vs cod:** nodul planifică ingest JSON; execuția apropiată documentată este **webhook**, nu un parser generic — fără completări fictive.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`bronze-ingest-json-parser-family\``.
