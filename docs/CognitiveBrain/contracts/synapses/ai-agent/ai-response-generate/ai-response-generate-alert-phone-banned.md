# Sinapsă `ai-response-generate-alert-phone-banned`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `ai-response-generate-alert-phone-banned` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/ai-response-generate/ai-response-generate-alert-phone-banned.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `ai-response-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `ai-response-generate` | **Planificare:** traseu `ai-response-generate`. **Matrix / contract:** [`../../../neurons/E3/ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md) — `ai:response:generate` vs `ai:e3:response:generate` vs E2 outreach pe același literal de catalog; reconciliere obligatorie. |
| Țintă | `alert-phone-banned` | **Matrix:** `alert:phone:banned` (E2, `monitoring`) → [`../../../neurons/E2/alert--phone--banned.md`](../../../neurons/E2/alert--phone--banned.md). **Registry:** `ALERT_PHONE_BANNED` → `alert:phone:banned`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** declară în planificare că **`alert-phone-banned`** este canonic legat de traseul **`ai-response-generate`**. v2 oferă doar eticheta **„sinapsă canonică de pipeline”**; nu precizează cum un pas de generare răspuns declanșează sau consumă alerta de telefon interzis. Comportamentul operațional al alertei este în contractul E2 țintă.

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

- **Runtime (ADR-0001):** ținta **`alert:phone:banned`**. Sursa: cozi documentate în [`ai--response--generate.md`](../../../neurons/E3/ai--response--generate.md).
- **Semantic (ADR-0002):** `nodeKey` pentru țintă — vezi catalog (ex. `e2:alert:phone-banned` în contractul neuron).
- **Planificare:** dependență structurală în graf între generarea răspunsului (traseu) și alerta de telefon banat.

## Limite și reconcilieri

- Fără invenție payload/retry/safety peste câmpurile v2.
- **E3 vs E2** pe sursă: graful nu rezolvă care worker alimentează dependența; doar registry + contractele neuroni.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`ai-response-generate-alert-phone-banned\``.
