# Sinapsă `human-notification-send-backup-conversations-export`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `human-notification-send-backup-conversations-export` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/hitl-human/human-notification-send/human-notification-send-backup-conversations-export.md` |
| Areal sinaptic | `hitl-human` |
| Traseu sinaptic | `human-notification-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `human-notification-send` | **Contract:** [`../../../neurons/E3/human--notification--send.md`](../../../neurons/E3/human--notification--send.md). **Runtime (ADR-0001):** v2 `human:notification:send` — **gap** coadă în registry la auditul din contract — vezi neuron. |
| Destinație (graf) | `backup-conversations-export` | **Contract:** [`../../../neurons/E3/backup--conversations--export.md`](../../../neurons/E3/backup--conversations--export.md). **Runtime:** v2 `backup:conversations:export` — **gap** catalog/registry/worker la auditul din contract — vezi neuron și ADR `ops`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **human-notification-send** are dependență sintactică față de nodul **backup-conversations-export** (subgraful **ops** E3 în v2). v2: **„sinapsă canonică de pipeline”**; exportul **nu** descrie fluxul de date sau ordinea joburilor între notificări umane și exportul de backup.

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

- **Planificare:** v2 §7 — `human-notification-send` → `backup-conversations-export`.
- **Runtime (ADR-0001):** ambele capete cu **gap** documentat în contractele neuron — nu se echivalează automat cu alte cozi `human:*` din registry.
- **Semantic (ADR-0002):** ținta — familie **`ops`** E3; **fără** `nodeKey` în catalog la auditul din contract — vezi [`backup--conversations--export.md`](../../../neurons/E3/backup--conversations--export.md).

## Limite și reconcilieri

- **Necesită reconciliere graf ↔ registry** pe **ambele** capete — vezi contractele neuron citate.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`human-notification-send-backup-conversations-export\``.
