# Sinapsă `backup-conversations-export-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `backup-conversations-export-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/pipeline-monitor/backup-conversations-export/backup-conversations-export-family.md` |
| Areal sinaptic | `pipeline-monitor` |
| Traseu sinaptic | `backup-conversations-export` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `backup-conversations-export` | Nod de traseu în graf. **Matrix / neuron:** [`../../../neurons/E3/backup--conversations--export.md`](../../../neurons/E3/backup--conversations--export.md) — `backup:conversations:export` (E3, ops). Contractul neuron documentează **gap runtime** la data auditului: fără intrare în `cognitive-node-catalog.ts`, fără literal în `queue-registry.ts`, fără worker mapat — **neconcordanță graf ↔ execuție** până la reconciliere. |
| Destinație (graf) | `e3-ops` | Agregat **familie ops E3** în planificare; nu este o singură coadă executabilă și **nu** există un fișier neuron unic pentru eticheta agregată `e3-ops`. |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** leagă traseul **backup-conversations-export** de nucleul de familie **`e3-ops`**. v2 §7: descrierea confirmată este **„specializează familia”** — ancorare în familia semantică ops E3 fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei.

## Sinapse dependență în același traseu

În acest director există doar manifestul **`backup-conversations-export-family.md`**; nu sunt definite muchii `dependency` suplimentare la nivel de contract sinapsă în același folder (conform registrului v2 §7 pentru acest `synapse_id`).

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

- **Planificare:** v2 §7 — `backup-conversations-export` → `e3-ops`.
- **Runtime (ADR-0001):** **nu** se poate afirma din export singur că există coadă **`backup:conversations:export`** în registry — vezi [`backup--conversations--export.md`](../../../neurons/E3/backup--conversations--export.md).
- **Semantic (ADR-0002):** **nu** s-a identificat `nodeKey` pentru acest `v2_queue` în catalog la auditul citat în neuron; eticheta **`e3-ops`** rămâne agregat de graf.

## Limite și reconcilieri

- **Neuron v2 vs cod:** status *not yet reconciled with runtime registry* în planul master pentru acest neuron; muchia `default` nu înlocuiește această reconciliere.
- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`backup-conversations-export-family\``.
