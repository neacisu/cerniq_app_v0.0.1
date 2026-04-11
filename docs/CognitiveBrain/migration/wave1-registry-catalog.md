# Val1 — migrare registry și catalog spre v2 §6 (Confirmed queue field)

## Scop

Aliniază **numele cozilor executabile** din [`workers/shared/src/queue-registry.ts`](../../../workers/shared/src/queue-registry.ts) și **`queueName`** din [`packages/shared/src/cognitive-node-catalog.ts`](../../../packages/shared/src/cognitive-node-catalog.ts) la câmpul **Confirmed queue field** din [v2 §6 Complete neuron contract register](../../v2_cerniq_cognitive_brain_master_implementation_plan.md), fără a rupe worker-ii aflați în producție.

## Principii

1. **Contractele** rămân ancorate în v2 §6 (vezi ADR-0001 / ADR-0002).
2. **Cutover sau dual-listen** obligatoriu pentru orice coadă redenumită: fie ascultare simultană pe numele vechi și nou cu perioadă de grație, fie migrare job + drain pe coada veche înainte de eliminare.
3. **O singură sursă** după migrare: `QUEUES` + `queueRegistry` reflectă șirul v2; catalogul actualizează `queueName` în același PR sau imediat după, cu teste API `/brain`.

## Pași recomandați (PR-uri)

1. **Inventar gap:** folosiți [`NEURON_MATRIX.md`](../NEURON_MATRIX.md) (coloane `v2_queue`, `in_queue_registry`, `catalog_nodeKey`).
2. **Loturi mici:** începeți cu cozi fără ambiguitate E2/E3 pe același prefix (vezi `resolveNodeKeyFromQueueNameAndEtapa` în catalog).
3. **Dual-listen:** unde Redis are job-uri în așteptare, înregistrați temporar **două** intrări `QueueConfig` cu același processor sau enfilează de la producător pe ambele nume până la drain.
4. **Teste:** worker smoke + teste care assert-ează numărul de cozi și prezența handler-ului pentru noul nume.
5. **Curățenie:** eliminați aliasul vechi după confirmarea drain-ului și actualizați `QUEUE_METADATA.expectedQueueCount` dacă numărul de rânduri statice se schimbă.

## Limită evidență

Acest document este **strategie**; nu înlocuiește auditul per-neuron din contracte. Detalii handler/payload rămân în `contracts/neurons/` și în cod.

## Legături

- [contracts/README.md](../contracts/README.md), [ADR-0001](../adr/global/ADR-0001-runtime-neuron-authority.md), [ADR-0002](../adr/global/ADR-0002-semantic-neuron-authority.md).
