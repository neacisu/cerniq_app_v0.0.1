# Sinapsă `ai-response-generate-alert-phone-offline`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-response-generate-alert-phone-offline` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-response-generate/ai-response-generate-alert-phone-offline.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-response-generate` | **Planificare:** traseu `ai-response-generate`. **Contract sursă:** [`../../../neurons/E3/ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md) — dualitate E3 (`ai:e3:response:generate`) / E2 + catalog (`ai:response:generate`). |
| Țintă | `alert-phone-offline` | **Matrix:** `alert:phone:offline` (E2, `monitoring`) → [`../../../neurons/E2/alert--phone--offline.md`](../../../neurons/E2/alert--phone--offline.md). **Registry:** `ALERT_PHONE_OFFLINE` → `alert:phone:offline`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** poziționează **`alert-phone-offline`** în dependență canonică față de **`ai-response-generate`**. Descrierea v2 este **„sinapsă canonică de pipeline”**; nu există în export detalii despre condițiile de offline sau despre legătura cauzală cu pasul de răspuns. Implementarea alertei offline este în worker-ul / contractul E2 țintă.

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

- **Runtime (ADR-0001):** ținta **`alert:phone:offline`**. Sursa: vezi registry și [`ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md).
- **Semantic (ADR-0002):** catalog + contracte pentru ambele capete.
- **Planificare:** dependență declarată între traseul de răspuns și alerta de telefon offline.

## Limite și reconcilieri

- Graful atribuie sursa la traseul `ai-response-generate` (etichetă planificare); execuția efectivă poate fi pe **`ai:e3:response:generate`** sau **`ai:response:generate`** — nu se presupune una singură fără audit de flux.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-response-generate-alert-phone-offline\``.
