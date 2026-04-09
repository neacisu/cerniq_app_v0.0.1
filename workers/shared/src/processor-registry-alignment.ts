/**
 * Aliniere între `queueRegistry` global și map-ul local `processors` al unui serviciu worker.
 * Evită înregistrarea de workeri BullMQ pentru cozi fără procesor (race / job-uri pierdute)
 * și eșuează la startup dacă există procesor fără intrare în registry.
 */
export function buildWorkerQueueNamesForProcessors(
  registryEntries: readonly { name: string }[],
  processorRecord: Record<string, unknown>,
): string[] {
  const registryNames = registryEntries.map((q) => q.name);
  const processorKeys = Object.keys(processorRecord);
  const registrySet = new Set(registryNames);
  const missingInRegistry = processorKeys.filter((k) => !registrySet.has(k));
  if (missingInRegistry.length > 0) {
    throw new Error(
      `[workers] Processor queues not present in queueRegistry (add registry entry or remove processor): ${missingInRegistry.join(", ")}`,
    );
  }
  const keySet = new Set(processorKeys);
  const uniqueRegistryNames = [...new Set(registryNames)];
  const workerQueues = uniqueRegistryNames.filter((n) => keySet.has(n));
  if (workerQueues.length !== processorKeys.length) {
    throw new Error(
      `[workers] Queue/processor count mismatch after registry filter: workers=${workerQueues.length}, processors=${processorKeys.length}`,
    );
  }
  return workerQueues;
}
