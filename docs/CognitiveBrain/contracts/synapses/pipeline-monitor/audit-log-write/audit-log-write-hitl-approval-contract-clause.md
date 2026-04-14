# Sinapsă `audit-log-write-hitl-approval-contract-clause`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `audit-log-write-hitl-approval-contract-clause` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/audit-log-write/audit-log-write-hitl-approval-contract-clause.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `audit-log-write` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `audit-log-write` | **Contract:** [`../../../neurons/E4/audit--log--write.md`](../../../neurons/E4/audit--log--write.md). |
| Destinație (graf) | `hitl-approval-contract-clause` | **Contract:** [`../../../neurons/E4/hitl--approval--contract-clause.md`](../../../neurons/E4/hitl--approval--contract-clause.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **audit-log-write** are dependență sintactică față de **hitl-approval-contract-clause**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `audit-log-write` → `hitl-approval-contract-clause`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** sursă — **`audit:log:write`** (J45); ținta — HITL E4; vezi contractele.

## Limite și reconcilieri

- Muchia nu precizează dacă aprobarea de clauză este condiționată de o intrare în jurnalul de audit; acest lucru ține de implementare.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`audit-log-write-hitl-approval-contract-clause\``.
