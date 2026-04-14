# Sinapsă `silver-norm-email-family`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `silver-norm-email-family` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/enrich-data/silver-norm-email/silver-norm-email-family.md` |
| Areal sinaptic | `enrich-data` |
| Traseu sinaptic | `silver-norm-email` |

## Capete (export graf planificat)

| Rol | Nod în export | Interpretare |
| --- | --- | --- |
| Sursă | `silver-norm-email` | Traseu în graf; contract neuron: [`../../../neurons/E1/silver--norm--email.md`](../../../neurons/E1/silver--norm--email.md). **Triplă autoritate:** v2 **`silver:norm:email`**; runtime `normalize:email` / `e1:normalize:email` — vezi neuron; `NEURON_MATRIX.csv`: **`e1:normalize:email`**. |
| Destinație (graf) | `e1-normalize` | Agregat **familie normalize E1** în planificare; nu este o singură coadă executabilă. Vezi [`../../../../adr/families/e1/normalize.md`](../../../../adr/families/e1/normalize.md). |

## Tip muchie (export)

- **Export edge type:** `default`

## Scop manifest (export-grounded)

Muchia **`default`** plasează traseul **silver-norm-email** sub agregatul **`e1-normalize`**. v2: **„specializează familia”** — fără payload, retry, safety sau telemetrie per-muchie în câmpurile sinapsei din registru.

## Sinapse dependență în același traseu

`silver-norm-email-enrich-anaf-address.md` … `silver-norm-email-enrich-web-tech-detect.md` (36 muchii `dependency` către trasee `enrich-*`; vezi același director).

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

- **Planificare:** v2 §7 — `silver-norm-email` → `e1-normalize`.
- **Runtime (ADR-0001):** `e1-normalize` nu este cheie în `QUEUES`; normalizare email — vezi `QUEUES.NORMALIZE_EMAIL` în `workers/shared/src/queue-registry.ts`.
- **Semantic (ADR-0002):** `e1:normalize:email` — vezi catalog.

## Limite și reconcilieri

- Nu inventa payload / retry / safety / telemetrie pentru muchia `default`.
- Denumire v2 `silver:norm:*` poate diferi de `queueName` — vezi contractul neuronului.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`silver-norm-email-family\``.
