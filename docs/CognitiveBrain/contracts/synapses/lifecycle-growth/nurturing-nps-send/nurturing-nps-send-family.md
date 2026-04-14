# Sinapsă `nurturing-nps-send-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `nurturing-nps-send-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/lifecycle-growth/nurturing-nps-send/nurturing-nps-send-family.md` |
| Areal sinaptic | `lifecycle-growth` |
| Traseu sinaptic | `nurturing-nps-send` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `nurturing-nps-send` | **Graf:** trimitere NPS în fluxul de lifecycle. Contract neuron: [`../../../neurons/E5/nurturing--nps--send.md`](../../../neurons/E5/nurturing--nps--send.md). **Triplă autoritate:** v2 `nurturing:nps:send`; runtime/catalog `feedback:nps:send` / `e5:feedback:nps-send` — vezi neuron. |
| Destinație (graf) | `e5-lifecycle` | Agregat **`e5-lifecycle`**. v2: [`### ADR-FAMILY-e5-lifecycle`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md). ADR: [`../../../../adr/families/e5/lifecycle.md`](../../../../adr/families/e5/lifecycle.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **nurturing-nps-send** sub **`e5-lifecycle`**, descriere v2 **„specializează familia”**: trimiterea NPS este, în planificare, parte a aceluiași agregat de familie lifecycle ca celelalte trasee E5 din jurul nurturing.

## Sinapse dependență în același traseu

[`nurturing-nps-send-feedback-competitor-log.md`](nurturing-nps-send-feedback-competitor-log.md), [`nurturing-nps-send-feedback-conversation-analyze.md`](nurturing-nps-send-feedback-conversation-analyze.md), [`nurturing-nps-send-feedback-entity-store.md`](nurturing-nps-send-feedback-entity-store.md), [`nurturing-nps-send-feedback-nps-aggregate.md`](nurturing-nps-send-feedback-nps-aggregate.md), [`nurturing-nps-send-feedback-sentiment-analyze.md`](nurturing-nps-send-feedback-sentiment-analyze.md), [`nurturing-nps-send-feedback-writeback-crm.md`](nurturing-nps-send-feedback-writeback-crm.md).

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

| Autoritate | Observație ancorată |
| --- | --- |
| **Runtime (ADR-0001)** | `feedback:nps:send` — vezi contract neuron și `queue-registry.ts`. |
| **Semantic (ADR-0002)** | [`NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `nurturing:nps:send` la **L307** (fișier). |
| **Planificare** | v2 §7 — `nurturing-nps-send` → `e5-lifecycle`. |

## Limite și reconcilieri

- Prefix **graf** (`nurturing-nps-send`) vs **coadă** canonică în cod (`feedback:nps:send`) este explicat în contractul neuron, nu negat aici.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`nurturing-nps-send-family\``.
