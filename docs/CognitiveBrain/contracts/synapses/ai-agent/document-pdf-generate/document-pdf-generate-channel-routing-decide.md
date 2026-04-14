# Sinapsă `document-pdf-generate-channel-routing-decide`

## Identitate

| Câmp | Valoare |
| --- | --- |
| Identificator sinapsă | `document-pdf-generate-channel-routing-decide` |
| Cale contract | `docs/CognitiveBrain/contracts/synapses/ai-agent/document-pdf-generate/document-pdf-generate-channel-routing-decide.md` |
| Areal sinaptic | `ai-agent` |
| Traseu sinaptic | `document-pdf-generate` |

## Capete (export graf planificat)

| Rol | Nod în export | Mapare runtime și contracte |
| --- | --- | --- |
| Sursă | `document-pdf-generate` | **Registry:** `E3_DOCUMENT_PDF_GENERATE` → `document:pdf:generate`. **Contract:** [`../../../neurons/E3/document--pdf--generate.md`](../../../neurons/E3/document--pdf--generate.md). |
| Destinație (graf) | `channel-routing-decide` | **Neuron / v2:** `channel:routing:decide` — [`../../../neurons/E3/channel--routing--decide.md`](../../../neurons/E3/channel--routing--decide.md). **Coadă executată:** **`channel:route:decide`** (`E3_CHANNEL_ROUTE_DECIDE`) — reconciliere obligatorie față de eticheta graf. |

## Tip muchie (export)

- **Export edge type:** `dependency`

## Scop muchie (export-grounded)

Dependența leagă **obținerea PDF** de **decizia de rutare pe canal** (handover). v2: **„sinapsă canonică de pipeline”**. În practică, după ce există PDF, orchestrarea poate necesita alegerea canalului — sens business declarativ; exportul nu specifică datele schimbului.

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

- **Runtime (ADR-0001):** sursă `document:pdf:generate`; destinație executabilă `channel:route:decide` — vezi contractul J58.
- **Semantic (ADR-0002):** `e3:channel:route-decide` — fără `channel:routing:decide` literal în catalog.
- **Planificare:** dependență PDF → rutare canal.

## Limite și reconcilieri

- Aceeași reconciliere **routing** vs **route** ca la toate sinapsele către `channel-routing-decide`.
- Verificați în cod dacă I51 enfilează direct J58 sau prin alți pași.

## Sursă canonică

- [`../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md`](../../../../v2_cerniq_cognitive_brain_master_implementation_plan.md) — §7, bloc `SYNAPSE \`document-pdf-generate-channel-routing-decide\``.
