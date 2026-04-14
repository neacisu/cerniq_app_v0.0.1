# Sinapsă `content-drip-send-alert-client-referral-reward`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `content-drip-send-alert-client-referral-reward` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/content-drip-send/content-drip-send-alert-client-referral-reward.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `content-drip-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `content-drip-send` | **Contract:** [`../../../neurons/E5/content--drip--send.md`](../../../neurons/E5/content--drip--send.md). **Triplă:** v2 `content:drip:send` vs runtime `content:drip:execute` — vezi neuron și ADR content. |
| Destinație (graf) | `alert-client-referral-reward` | **Contract:** [`../../../neurons/E5/alert--client--referral-reward.md`](../../../neurons/E5/alert--client--referral-reward.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

În planificare, traseul **content-drip-send** are dependență sintactică față de **alert-client-referral-reward**. v2: **„sinapsă canonică de pipeline”**; exportul **nu** fixează ordinea operațională sau payload-ul între job-uri.

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

- **Planificare:** v2 §7 — `content-drip-send` → `alert-client-referral-reward`.
- **Runtime (ADR-0001) / Semantic (ADR-0002):** vezi contractele neuron pentru sursă și țintă; reconcilieri slug graf ↔ cozi — în neuron, nu inferate aici.

## Limite și reconcilieri

- Muchia exprimă doar structura grafului exportat; nu afirmă singură trigger-ul unei alerte sau livrarea unui mesaj.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`content-drip-send-alert-client-referral-reward\`` (L14505–L14516).
