# Sinapsă `guardrail-discount-check-document-email-send`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `guardrail-discount-check-document-email-send` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/guardrail-discount-check/guardrail-discount-check-document-email-send.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `guardrail-discount-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `guardrail-discount-check` | **Matrix:** `guardrail:discount:check` → [`../../../neurons/E3/guardrail--discount--check.md`](../../../neurons/E3/guardrail--discount--check.md). **Registry:** `guardrail:discount:check`. |
| Destinație (graf) | `document-email-send` | **Matrix:** `document:email:send` (E3, `fiscal-docs`) → [`../../../neurons/E3/document--email--send.md`](../../../neurons/E3/document--email--send.md). **Registry:** `E3_DOCUMENT_EMAIL_SEND` → `document:email:send`. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Muchia **dependency** plasează **`document-email-send`** în dependență canonică față de **`guardrail-discount-check`** în graful exportat. v2 confirmă **„sinapsă canonică de pipeline”**; nu descrie dacă verificarea discount blochează, amână sau doar etichetează înainte de trimiterea documentului pe e-mail. Semantica M73 vs I/O document este în contractele neuroni.

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

- **Runtime (ADR-0001):** ambele cozi în `queue-registry.ts` — constantele `E3_GUARDRAIL_DISCOUNT_CHECK` și `E3_DOCUMENT_EMAIL_SEND`.
- **Semantic (ADR-0002):** `e3:guardrail:discount-check` și `e3:document:email-send` — vezi catalog și contracte.
- **Planificare:** dependență structurală guardrail discount → trimitere document e-mail.

## Limite și reconcilieri

- Slug graf vs cozi cu `:` — mapare prin Matrix.
- Fără presupuneri despre ordinea efectivă a joburilor în afara auditului de cod.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`guardrail-discount-check-document-email-send\``.
