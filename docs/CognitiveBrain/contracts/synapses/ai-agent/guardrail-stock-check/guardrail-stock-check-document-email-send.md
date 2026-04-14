# Sinapsă `guardrail-stock-check-document-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-stock-check-document-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-stock-check/guardrail-stock-check-document-email-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-stock-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `guardrail-stock-check` | Coadă executabilă **`guardrail:stock:check`** (`QUEUES.E3_GUARDRAIL_STOCK_CHECK`) — [`../../../neurons/E3/guardrail--stock--check.md`](../../../neurons/E3/guardrail--stock--check.md). |
| Destinație (graf) | `document-email-send` | Coadă executabilă **`document:email:send`** (`QUEUES.E3_DOCUMENT_EMAIL_SEND`) — [`../../../neurons/E3/document--email--send.md`](../../../neurons/E3/document--email--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În graful planificat, **`dependency`** declară că pasul `document-email-send` depinde de traseul `guardrail-stock-check` (ordonare de proiectare). Nu se afirmă din registrul §7 că worker-ul guardrail enfile-uiește direct `document:email:send` sau forma payload-ului.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** `E3_GUARDRAIL_STOCK_CHECK`; `E3_DOCUMENT_EMAIL_SEND` — ambele în blocul cozilor E3 fiscal-docs / guardrails din `queue-registry.ts`.
- **Semantic (ADR-0002):** sursă — guardrail stoc determinist (~L2161–2168); destinație — `e3:document:email-send` / `document:email:send` — „Trimitere document fiscal/comercial via email…” (~L1974–1979), MotorNeuron, `fiscal-execution`.
- **Planificare:** v2 §7 — `guardrail-stock-check` → `document-email-send`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `queue_in_registry` = `yes` pentru ambele cozi.

## Limite și reconcilieri

- Slug-uri graf (`-`) vs cozi (`:`).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-stock-check-document-email-send\``.
