# Sinapsă `sameday-awb-create-alert-client-account-blocked`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `sameday-awb-create-alert-client-account-blocked` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/stock-logistics/sameday-awb-create/sameday-awb-create-alert-client-account-blocked.md` |
| Areal sinaptic | `stock-logistics` |
| Traseu sinaptic | `sameday-awb-create` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `sameday-awb-create` | **Contract:** [`../../../neurons/E4/sameday--awb--create.md`](../../../neurons/E4/sameday--awb--create.md). **Triplă autoritate:** v2 **`sameday:awb:create`**; **`e4:sameday:awb-create`**; matrice rând **234**. |
| Destinație (graf) | `alert-client-account-blocked` | **Contract:** [`../../../neurons/E4/alert--client--account-blocked.md`](../../../neurons/E4/alert--client--account-blocked.md). **Triplă autoritate:** v2 **`alert:client:account-blocked`**; [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) rând **177** — familie **alerts** **E4**; `queue_in_registry` pe rând: vezi matrice și neuron. Context familie: [`../../../../adr/families/e4/alerts.md`](../../../../adr/families/e4/alerts.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **sameday-awb-create** are dependență canonică față de **alert-client-account-blocked** (ramură de alertă client în familia E4). v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează payload, ordinea joburilor sau politici de execuție între cozi.

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

- **Planificare:** v2 §7 — `sameday-awb-create` → `alert-client-account-blocked`.
- **Semantic:** ambele capete **E4** în matrice (logistics → alerts).
- **Runtime:** nu inferăm din graf declanșatorul concret al alertei; vezi implementarea din contractele neuron.

## Limite și reconcilieri

- Slug graf (`alert-client-account-blocked`) ↔ **`alert:client:account-blocked`** în matrice — nu este același lexical cu `nodeKey`-ul sursei logistice.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`sameday-awb-create-alert-client-account-blocked\``.
