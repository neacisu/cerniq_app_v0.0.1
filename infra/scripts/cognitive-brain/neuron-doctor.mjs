#!/usr/bin/env node
/**
 * Verificări minime pilot CognitiveBrain — contract CSV, ROUTING, manifest pachet.
 * Extensibil: adăugați verificări noi ca funcții care returnează { ok, message }.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function fail(msg) {
  console.error(`[neuron-doctor] FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[neuron-doctor] OK: ${msg}`);
}

const contract = path.join(
  root,
  "docs/CognitiveBrain/contracts/neurons/E1/bronze--ingest--csv-parser.md",
);
if (!existsSync(contract)) fail(`lipsește contractul ${contract}`);
const contractText = readFileSync(contract, "utf8");
if (!contractText.includes("## A.")) fail("contract: lipsește secțiunea A");
ok("contract neuron A1 prezent");

const routing = path.join(
  root,
  "docs/CognitiveBrain/runtime/synapses/enrich-data/bronze-ingest-csv-parser/ROUTING.md",
);
if (!existsSync(routing)) fail(`lipsește ROUTING ${routing}`);
ok("ROUTING sinapse prezent");

const manifest = path.join(
  root,
  "packages/cognitive-brain-neurons/dist/neurons/e1/bronze-ingest-csv-parser/manifest.js",
);
if (existsSync(manifest)) {
  ok("manifest neuron compilat prezent");
} else {
  ok("manifest JS compilat absent (rulați pnpm --filter @cerniq/cognitive-brain-neurons build)");
}

process.exit(0);
