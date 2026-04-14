# Sinapsă `e2-ai-analysis-stage`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `e2-ai-analysis-stage` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/graph-plan/stage/e2-ai-analysis-stage.md` |
| Areal sinaptic | `graph-plan` |
| Traseu sinaptic | `e2-ai-analysis-stage` |
| Registru topologie | `graph-plan/stage` — muchie cu sufix **`-stage`** în export; **distinct** de `familyflow` și `cross` (vezi [`../../README.md`](../../README.md)). |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `e2-ai-analysis` | Etichetă **swimlane / subgraf** în planificare; **nu** este prin ea însăși un `v2_queue` unic. **Necesită reconciliere graf ↔** [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **/ contracte neuroni / registry** pentru fiecare neuron concret din swimlane. |
| Destinație (graf) | `e2` | Nod **agregat etapă** E2 în export; fără rând dedicat „coadă `e2`” în matrice. |

## Tip muchie (export)

- **Export edge type:** `related`

## Scop muchie (export-grounded)

În topologia **graph-plan/stage**, muchia leagă **`e2-ai-analysis`** de nodul agregat al etapei **`e2`**, cu descrierea confirmată **„operează în etapa”**: poziționare structurală în stratul de etapă, nu contract executabil per muchie. Exportul **nu** encodează payload, retry, clasă de siguranță sau telemetrie pentru această muchie.

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** operează în etapa
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

- **Planificare:** v2 §7 — `e2-ai-analysis` → `e2` (muchie `e2-ai-analysis-stage`).
- **Semantic (ADR-0002) / runtime (ADR-0001):** această muchie **nu** înlocuiește catalogul sau `queue-registry.ts`; descendenții concreti ai swimlane-ului se mapează separat.

## Limite și reconcilieri

- Tipul **`related`** se interpretează conservativ: nu echivalează cu dependență de execuție (`dependency`) sau specializare familie (`default`) din alte subregistre.
- Orice afirmație despre ordinea runtime a întregii etape E2 necesită dovezi din cozi/workers, nu din această muchie.

## Interpretare etichetă sursă (graf; fără runtime inventat)

`e2-ai-analysis` plasează o swimlane de **analiză asistată de AI** sub nodul agregat **`e2`**. Muchia `related` spre `e2` nu specifică modele, prompturi sau ieșiri — doar apartenența la **stratul de etapă** din export, conform descrierii v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`e2-ai-analysis-stage\``.
