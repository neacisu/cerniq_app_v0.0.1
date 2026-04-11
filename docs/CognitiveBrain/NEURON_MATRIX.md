# NEURON_MATRIX

Generat de `docs/CognitiveBrain/scripts/build_neuron_matrix.py`. Un rând per antet `### NEURON` din v2 §6.

- Rânduri: **324** (așteptat 324).
- `contract_path`: ținta unică per `(stage, slug)`; blocurile «duplicat #2» cu aceeași etapă și coadă împart fișierul.

## Coloane

| Coloană | Semnificație |
| --- | --- |
| v2_line | Linie aproximativă în v2 (antet NEURON) |
| v2_queue | Confirmed queue field / antet |
| contract_path | Fișier contract |
| queue_in_registry | `yes` / `no` (căutare literală în queue-registry.ts) |

## Excerpt (primele 15 rânduri)

| v2_line | v2_queue | stage | contract_path |
| --- | --- | --- | --- |
| 1740 | enrich:ai:contact-parse | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--ai--contact-parse.md |
| 1762 | enrich:ai:industry-classify | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--ai--industry-classify.md |
| 1784 | enrich:ai:text-structure | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--ai--text-structure.md |
| 1806 | bronze:dedup:hash-checker | E1 | docs/CognitiveBrain/contracts/neurons/E1/bronze--dedup--hash-checker.md |
| 1828 | silver:dedup:entity-resolve | E1 | docs/CognitiveBrain/contracts/neurons/E1/silver--dedup--entity-resolve.md |
| 1850 | silver:dedup:fuzzy-match | E1 | docs/CognitiveBrain/contracts/neurons/E1/silver--dedup--fuzzy-match.md |
| 1872 | enrich:anaf:address | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--anaf--address.md |
| 1894 | enrich:anaf:caen | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--anaf--caen.md |
| 1919 | enrich:anaf:efactura | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--anaf--efactura.md |
| 1944 | enrich:anaf:fiscal-status | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--anaf--fiscal-status.md |
| 1969 | enrich:anaf:tva-status | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--anaf--tva-status.md |
| 1994 | enrich:anif:ouai-lookup | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--anif--ouai-lookup.md |
| 2016 | enrich:apia:farmer-lookup | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--apia--farmer-lookup.md |
| 2038 | enrich:apia:subsidies | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--apia--subsidies.md |
| 2060 | enrich:email:discovery | E1 | docs/CognitiveBrain/contracts/neurons/E1/enrich--email--discovery.md |

Fișier complet: [`NEURON_MATRIX.csv`](NEURON_MATRIX.csv).
