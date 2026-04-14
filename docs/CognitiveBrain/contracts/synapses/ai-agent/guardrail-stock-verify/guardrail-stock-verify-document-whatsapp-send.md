# Sinapsă `guardrail-stock-verify-document-whatsapp-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-stock-verify-document-whatsapp-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-stock-verify/guardrail-stock-verify-document-whatsapp-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-stock-verify` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime (unde e clară) |
| --- | --- | --- |
| Sursă | `guardrail-stock-verify` | **Gap runtime (documentat):** coada **`guardrail:stock:verify`** nu apare în `workers/shared/src/queue-registry.ts`; vezi [`../../../neurons/E3/guardrail--stock--verify.md`](../../../neurons/E3/guardrail--stock--verify.md). Rând [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv): `queue_in_registry` = `no`. |
| Țintă | `document-whatsapp-send` | Coadă executabilă **`document:whatsapp:send`** (`QUEUES.E3_DOCUMENT_WHATSAPP_SEND`) — [`../../../neurons/E3/document--whatsapp--send.md`](../../../neurons/E3/document--whatsapp--send.md). |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Semantica confirmată (registru v2 §7)

- **Descriere confirmată:** sinapsă canonică de pipeline
- **Nivel evidență:** potrivire exactă câmpuri din exportul de graf.

## Scop muchie (export-grounded)

În planificare, trimiterea documentului pe WhatsApp este dependentă de traseul guardrail stoc; fără detalii de canal sau payload în registrul §7.

## Statusuri de evidență (conservative, din sursă canonică)

| Domeniu | Status |
| --- | --- |
| Payload schema | Exportul curent **nu** encodează schemă de payload pentru această muchie. |
| Retry policy | Exportul curent **nu** encodează politică de retry pentru această muchie. |
| Safety class | Exportul curent **nu** encodează clasă de siguranță pentru această muchie. |
| Telemetrie | Exportul dovedește existența structurală în graful de planificare; **nu** dovedește singur telemetrie completă per-muchie în ramura rulată. |
| Contract evidence | Export-grounded, conservative, non-inventive. |

## Mapare neuroni și triplă autoritate

- **Runtime (ADR-0001):** sursa **`guardrail:stock:verify`** nu are constantă în `QUEUES`; `E3_DOCUMENT_WHATSAPP_SEND`.
- **Semantic (ADR-0002):** țintă — `e3:document:whatsapp-send` / `document:whatsapp:send` — „Trimitere document via WhatsApp Business API…” (~L1983–1989), MotorNeuron, `fiscal-execution`.
- **Planificare:** v2 §7 pentru `guardrail-stock-verify-document-whatsapp-send`.
- **Matrice:** [`../../../../NEURON_MATRIX.csv`](../../../../NEURON_MATRIX.csv) — `guardrail:stock:verify` (`queue_in_registry` = `no`); coada țintă (`queue_in_registry` = `yes` în CSV).

## Limite și reconcilieri

- **Graf ↔ registry (sursă):** muchia există în planificare; execuția cozii sursă nu e ancorată în `queue-registry.ts` la auditul documentat.
- Slug-uri graf vs cozi.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-stock-verify-document-whatsapp-send\``.
