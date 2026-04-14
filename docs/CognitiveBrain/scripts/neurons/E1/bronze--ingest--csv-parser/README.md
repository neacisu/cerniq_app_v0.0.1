# Scripturi — neuron `bronze--ingest--csv-parser`

## `validate-against-contract.mjs`

Verificări **minime** pe fișierul contractului Markdown:

- prezența secțiunilor `## A.`, `## B.`, … `## E.` sau echivalent (`## A. Scop`);
- prezența tabelului „Confirmat în repo” (sau `Confirmat în repo` în text).

**Ieșire:** cod `0` dacă OK, `1` dacă lipsește o secțiune obligatorie.

Rulare din rădăcina repo:

```bash
node docs/CognitiveBrain/scripts/neurons/E1/bronze--ingest--csv-parser/validate-against-contract.mjs
```

Opțional:

```bash
CONTRACT_PATH=docs/CognitiveBrain/contracts/neurons/E1/bronze--ingest--csv-parser.md node ...
```
