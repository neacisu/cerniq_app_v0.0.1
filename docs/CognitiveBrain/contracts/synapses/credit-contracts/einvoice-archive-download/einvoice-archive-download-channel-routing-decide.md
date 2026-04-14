# Sinapsă `einvoice-archive-download-channel-routing-decide`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `einvoice-archive-download-channel-routing-decide` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/credit-contracts/einvoice-archive-download/einvoice-archive-download-channel-routing-decide.md` |
| Areal sinaptic | `credit-contracts` |
| Traseu sinaptic | `einvoice-archive-download` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `einvoice-archive-download` | **Registry (ADR-0001):** `QUEUES.E3_EINVOICE_ARCHIVE_DOWNLOAD` → **`einvoice:archive:download`**. **Contract:** [`../../../neurons/E3/einvoice--archive--download.md`](../../../neurons/E3/einvoice--archive--download.md). |
| Destinație (graf) | `channel-routing-decide` | **v2 / Matrix / titlu neuron:** `channel:routing:decide` — [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). **Execuție (ADR-0001):** **`channel:route:decide`** (`QUEUES.E3_CHANNEL_ROUTE_DECIDE`) — **denumire de coadă diferită** față de câmpul v2; reconciliere obligatorie în contractul neuron, nu prin presupuneri. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența declară în graf că **descărcarea arhivei e-Factura** precede sau este ordonată canonic față de **decizia de rutare canal**. v2: **„sinapsă canonică de pipeline”** — fără detalii operaționale în registrul sinapsei.

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

- **Runtime (ADR-0001):** sursă = **`einvoice:archive:download`**; destinație executabilă = **`channel:route:decide`** (nu literalul `channel:routing:decide` ca nume de coadă în worker fără verificare).
- **Semantic (ADR-0002):** `e3:einvoice:archive-download` vs `e3:channel:route-decide` — vezi catalog în contractele neuron.
- **Planificare:** nod graf `channel-routing-decide` ↔ v2 `channel:routing:decide` ↔ runtime `channel:route:decide`.

## Limite și reconcilieri

- Triplă denumire (graf / v2 / runtime) — pentru **execuție** prevală `queue-registry.ts` și [`channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md).
- Vezi ADR familie [`../../../../adr/families/e3/channels.md`](../../../../adr/families/e3/channels.md).

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`einvoice-archive-download-channel-routing-decide\``.
