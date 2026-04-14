# Scenarii — A1 CSV ingest

**Sursă de adevăr detaliată:** secțiunea **B. Edge cases** din contractul neuronului + cod `a1-csv-parser.ts` / `ingest-utils.ts`.

| # | Scenariu | Rezultat așteptat (sumar) |
| --- | --- | --- |
| 1 | CSV valid, fără hash în batch | Parsare, inserare bronze, contoare batch, trigger normalizare / ANAF după reguli cod |
| 2 | `fileHash` în metadata batch, fișier alterat | Eroare `ensureFileIntegrity`, batch marcat failed (flux A1) |
| 3 | Rânduri cu caractere de control interzise | Rânduri în carantină, contoare `quarantineRows` |
| 4 | Conflict identitate la rezoluție | Posibil `createHitlApprovalTask` (ingest-utils) |
| 5 | Job reluat (`resumeFrom`) | Continuare contoare din offset |
| 6 | Fișier mare (streaming) | `shouldUseStreaming` → cale streaming în A1 |
| 7 | Client SSE cu `?batchId=` | Necesită `batchId` pe mesaj — **G1** până la fix |

## Semantică „dependency” în graf sinaptic

Contractele sinapse pot descrie dependențe planificate ingest → silver. **Fizic**, după bronze, următorul pas este **enqueue** către cozile `normalize:*`, nu execuție sincronă în A1.
