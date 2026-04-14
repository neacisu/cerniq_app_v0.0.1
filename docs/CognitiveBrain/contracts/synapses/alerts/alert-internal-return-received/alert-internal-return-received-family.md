# Sinapsă `alert-internal-return-received-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `alert-internal-return-received-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/alerts/alert-internal-return-received/alert-internal-return-received-family.md` |
| Areal sinaptic | `alerts` |
| Traseu sinaptic | `alert-internal-return-received` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `alert-internal-return-received` | **Planificare:** slug graf. **Contract neuron:** [`../../../neurons/E4/alert--internal--return-received.md`](../../../neurons/E4/alert--internal--return-received.md). **Runtime:** v2 `alert:internal:return-received` — **0** potriviri literale în TS/JS la audit; fluxuri H37–H38 (`return:*`) sunt cozi distincte — vezi contract. |
| Destinație (graf) | `e4-alerts` | Agregat **familie alerts E4** în planificare; nu o singură coadă executabilă. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **default** plasează traseul **alertă internă la primire retur** sub **`e4-alerts`**. v2: **„specializează familia”** — fără payload sau handler în câmpurile sinapsei.

## Sinapse dependență în același traseu

[`alert-internal-return-received-audit-compliance-check.md`](alert-internal-return-received-audit-compliance-check.md), [`alert-internal-return-received-audit-data-anonymize.md`](alert-internal-return-received-audit-data-anonymize.md), [`alert-internal-return-received-audit-log-write.md`](alert-internal-return-received-audit-log-write.md).

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

- **Runtime (ADR-0001):** gap pentru `alert:internal:return-received` vs `return:initiate` / `return:process`; agregat `e4-alerts` nu este nume de coadă.
- **Semantic (ADR-0002):** v2_queue în Matrix / contract; procesorul I40 rămâne `e4:alert:delivery` în observațiile din contract — nu înlocuiește coada granulară fără dovadă.
- **Planificare:** v2 §7 — `alert-internal-return-received` → `e4-alerts`.

## Limite și reconcilieri

- Comentarii în `i-alert-workers.ts` despre triggeri retur nu echivalează emiterea pe coada v2 — vezi contract neuron.
- Nu inventa payload / retry / safety / telemetrie dincolo de v2.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`alert-internal-return-received-family\``.
