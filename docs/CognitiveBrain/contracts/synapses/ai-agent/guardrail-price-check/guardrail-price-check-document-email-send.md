# Sinapsă `guardrail-price-check-document-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-price-check-document-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-price-check/guardrail-price-check-document-email-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-price-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `guardrail-price-check` | Coadă executabilă **`guardrail:price:check`** (`QUEUES.E3_GUARDRAIL_PRICE_CHECK`) — [`../../../neurons/E3/guardrail--price--check.md`](../../../neurons/E3/guardrail--price--check.md). |
| Țintă | `document-email-send` | Coadă executabilă **`document:email:send`** (`QUEUES.E3_DOCUMENT_EMAIL_SEND`) — [`../../../neurons/E3/document--email--send.md`](../../../neurons/E3/document--email--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În graful planificat, **`dependency`** declară că pasul `document-email-send` depinde de traseul `guardrail-price-check` (ordonare de proiectare). Nu se afirmă din registrul §7 că worker-ul guardrail enfile-uiește direct `document:email:send` sau forma payload-ului.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `E3_GUARDRAIL_PRICE_CHECK`; `E3_DOCUMENT_EMAIL_SEND` — ambele în blocul cozilor E3 fiscal-docs / guardrails din `queue-registry.ts`.
- **Semantic (ADR-0002):** sursă — guardrail preț determinist (~L2152–2159); țintă — `e3:document:email-send` / `document:email:send` — „Trimitere document fiscal/comercial via email…” (~L1974–1979), MotorNeuron, `fiscal-execution`.
- **Planificare:** v2 §7 — `guardrail-price-check` → `document-email-send`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `queue_in_registry` = `yes` pentru ambele cozi.

## Limite și reconcilieri

- Slug-uri graf (`-`) vs cozi (`:`).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-price-check-document-email-send\``.
