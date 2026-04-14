#!/usr/bin/env node
/**
 * Validare minimă contract neuron bronze CSV — secțiuni A–E + tabel confirmat.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../../");
const defaultContract = path.join(
  root,
  "docs/CognitiveBrain/contracts/neurons/E1/bronze--ingest--csv-parser.md",
);
const contractPath = process.env.CONTRACT_PATH
  ? path.resolve(process.env.CONTRACT_PATH)
  : defaultContract;

const text = readFileSync(contractPath, "utf8");

const requiredSectionMarkers = ["## A.", "## B.", "## C.", "## D.", "## E."];
const missing = requiredSectionMarkers.filter((m) => !text.includes(m));

if (missing.length > 0) {
  console.error(
    `[validate-against-contract] Lipsesc secțiuni în ${path.relative(root, contractPath)}: ${missing.join(", ")}`,
  );
  process.exit(1);
}

if (!/Confirmat în repo/i.test(text)) {
  console.error(
    `[validate-against-contract] Lipsește tabelul / textul «Confirmat în repo» în ${path.relative(root, contractPath)}`,
  );
  process.exit(1);
}

console.log(
  `[validate-against-contract] OK — ${path.relative(root, contractPath)}`,
);
process.exit(0);
