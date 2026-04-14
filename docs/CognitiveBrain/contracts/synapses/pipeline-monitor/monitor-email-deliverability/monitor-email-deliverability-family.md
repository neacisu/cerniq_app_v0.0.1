# Sinapsă `monitor-email-deliverability-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `monitor-email-deliverability-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/monitor-email-deliverability/monitor-email-deliverability-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `monitor-email-deliverability` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `monitor-email-deliverability` | **Contract:** [`../../../neurons/E2/monitor--email--deliverability.md`](../../../neurons/E2/monitor--email--deliverability.md). **Triplă autoritate:** v2 `monitor:email:deliverability`; **runtime:** vezi contract neuron (`queue-registry`, worker outreach). |
| Destinație (graf) | `e2-monitoring` | Nod **agregat** în export (swimlane E2 / familie monitoring). **Nu** există rând dedicat `e2-monitoring` în [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv); context familie: [`../../../../adr/families/e2/monitoring.md`](../../../../adr/families/e2/monitoring.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

În planificare, traseul **monitor-email-deliverability** este legat de nodul agregat **e2-monitoring** printr-o muchie de tip `default`, cu descrierea confirmată **„specializează familia”**: poziționează neuronul de monitorizare deliverability în subgraful de monitoring E2. Exportul **nu** fixează payload sau politici de execuție între aceste noduri.

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

- **Planificare:** v2 §7 — `monitor-email-deliverability` → `e2-monitoring`.
- **Semantic (ADR-0002):** sursă [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) **L84** (`monitor:email:deliverability`); ținta agregată **e2-monitoring** necesită reconciliere explicită graf ↔ catalog (fără `nodeKey` unic pentru agregat).
- **Runtime:** vezi neuronul sursă;ținta agregată nu mapează 1:1 la o singură coadă în `queue-registry.ts`.

## Limite și reconcilieri

- Slug graf `monitor-email-deliverability` ↔ `v2_queue` `monitor:email:deliverability` (conform contract neuron).
- `e2-monitoring`: **necesită reconciliere graf ↔ registry** pentru orice afirmație despre execuție unitară.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`monitor-email-deliverability-family\``.
