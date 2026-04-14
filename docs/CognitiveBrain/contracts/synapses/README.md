# Contracte sinapsă (registru §7)

Fiecare intrare din registrul de sinapse al planului master are un fișier Markdown aici. Ierarhia folosește termeni ancurați în rețea neuronală / conectivitate:

| Termen | Semnificație în acest repo |
| --- | --- |
| **Areal sinaptic** | Director de **nivel 1** sub `synapses/`: o regiune funcțională largă unde se grupează traseele sinaptice înrudite (mapare explicită în `synaptic_areal_pathway_map.py`). |
| **Traseu sinaptic** | Director de **nivel 2** (sub un areal): un pachet coerent de contracte de sinapsă cu același identificator canonic; analog unei căi de conectivitate în graful cognitiv. |

## Structură

| Cale relativă | Rol |
| --- | --- |
| `<areal>/<slug-traseu>/*.md` | Contracte pentru un **traseu sinaptic**; `slug-traseu` = directorul care conține manifestul `*-family.md` (nume de fișier istoric) și toate stem-urile care încep cu acel slug. |
| `graph-plan/stage/*.md` | Sinapse cu sufix `-stage` (topologie plan exportat). |
| `graph-plan/familyflow/*.md` | Sinapse cu sufix `-familyflow`. |
| `graph-plan/cross/*.md` | Sinapse cu sufix `-cross`. |

**Mapare areal ← traseu:** primul segment al `slug-traseu` (înainte de primul `-`) decide arealul. Orice prefix nou necunoscut oprește migrarea până la actualizarea `synaptic_areal_pathway_map.py`.

**Migrare (ordine):**

1. `python3 docs/CognitiveBrain/scripts/migrate_synapse_contracts_to_family_dirs.py` — din listă plată pe câte un director per **traseu** + `_graph-plan/`.
2. `python3 docs/CognitiveBrain/scripts/migrate_synapse_areal_layout.py` — mută traseele sub **areale** și redenumește `_graph-plan/` (sau echivalent vechi) în `graph-plan/`.

## Index și statistici

- Matrice: [`../../SYNAPSE_MATRIX.csv`](../../SYNAPSE_MATRIX.csv), sumar [`../../SYNAPSE_MATRIX.md`](../../SYNAPSE_MATRIX.md) — coloane `areal_dir`, `pathway_slug`, `bucket`.
- Regenerare: `python3 docs/CognitiveBrain/scripts/build_synapse_matrix.py`

## Număr total

**2305** fișiere contract sinapsă (fără acest `README.md`).
