# Sinapsă `template-spintax-process-wa-send-initial`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `template-spintax-process-wa-send-initial` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/channels-outreach/template-spintax-process/template-spintax-process-wa-send-initial.md` |
| Areal sinaptic | `channels-outreach` |
| Traseu sinaptic | `template-spintax-process` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `template-spintax-process` | **Contract:** [`../../../neurons/E2/template--spintax--process.md`](../../../neurons/E2/template--spintax--process.md). **Runtime (ADR-0001):** `template:spintax:process`. |
| Destinație (graf) | `wa-send-initial` | **Contract:** [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md) (execuție E2); există și instanță v2 duplicată sub `E5/` — **autoritate pentru runtime outreach:** fișierul E2 citit aici. **Runtime:** **fără** literal `wa:send:initial`; execuție pe **`q:wa:phone-NN`** — vezi contract neuron. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

**Spintax** depinde în planificare de **primul mesaj WA** (nod graf). v2: **„sinapsă canonică de pipeline”**; exportul nu leagă textul procesat de payload-ul job-ului.

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

- **Runtime (ADR-0001):** reconciliere graf vs **`q:wa:phone-*`** — vezi [`../../../neurons/E2/wa--send--initial.md`](../../../neurons/E2/wa--send--initial.md).
- **Semantic (ADR-0002):** pattern cozi per-telefon.
- **Planificare:** dependență declarativă.

## Limite și reconcilieri

- Duplicat E5 în v2 pentru același antet — **nu** folosit ca sursă de adevăr runtime în acest contract sinapsă; tripla autoritate rămâne explicită.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`template-spintax-process-wa-send-initial\``.
