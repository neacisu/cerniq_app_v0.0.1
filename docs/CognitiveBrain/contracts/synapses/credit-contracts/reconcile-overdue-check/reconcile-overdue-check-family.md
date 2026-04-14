# Sinapsă `reconcile-overdue-check-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `reconcile-overdue-check-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/reconcile-overdue-check/reconcile-overdue-check-family.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `reconcile-overdue-check` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `reconcile-overdue-check` | **v2 / graf:** etichetă **`reconcile:overdue:check`**. **Contract:** [`../../../neurons/E4/reconcile--overdue--check.md`](../../../neurons/E4/reconcile--overdue--check.md). **Limită dovedită:** literalul `reconcile:overdue:check` **lipsește** din `queue-registry.ts`; **echivalent semantic runtime** documentat: **`payment:overdue:detect`** (B11) + lanț **`payment:overdue:escalate`** (B12) — vezi neuron, nu inferați o coadă BullMQ cu numele graf. |
| Destinație (graf) | `e4-cash` | **Nod agregat:** familia **cash** E4. **ADR:** [`../../../../adr/families/e4/cash.md`](../../../../adr/families/e4/cash.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop muchie (export-grounded)

Muchia **`default`** plasează traseul **`reconcile-overdue-check`** sub **`e4-cash`**. v2: **„specializează familia”**. Execuția efectivă overdue este pe cozi **`payment:overdue:*`**, nu pe șirul `reconcile:overdue:check` — vezi contractul neuron sursă.

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

- **Runtime (ADR-0001):** **necesită reconciliere** — `payment:overdue:detect` / `payment:overdue:escalate` în registry vs etichetă graf; **`e4-cash`** nu este coadă.
- **Semantic:** `e4:payment:overdue-detect` etc. — catalog (vezi neuron).
- **Planificare:** v2 §7 ancorează traseul în cash.

## Limite și reconcilieri

- **Triplă denumire:** slug **`reconcile-overdue-check`** ↔ v2 **`reconcile:overdue:check`** ↔ runtime **`payment:overdue:detect`** (+ B12) — pentru execuție prevală registry-ul și `index.ts` E4.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`reconcile-overdue-check-family\``.
