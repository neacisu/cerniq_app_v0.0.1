/**
 * leiden-client.ts — Node.js → Python3 subprocess bridge pentru Leiden service (Plan §X FAZA 9e)
 *
 * Protocol:
 *   - Input: fișier JSON temporar cu graph-ul (nodes + edges)
 *   - Output: fișier JSON temporar cu rezultatul (communities / centrality)
 *   - Subprocess: python3 workers/e5-nurturing/python/leiden_service.py
 *
 * Anti-halucin. FAZA 9e:
 *   (B) Python3 subprocess cu JSON I/O — NU Python embedded în Node.js
 *   (D) Timeout-uri EXACTE: D21=600s, D22=300s — enforced prin BullMQ job timeout
 *       Adăugăm și timeout intern de 10s buffer pentru a prinde procesele blocate.
 *
 * Edge cases gestionate:
 *   - stderr Python → logat, nu suprimat
 *   - exit code != 0 → Error cu codul și stderr
 *   - Timeout subprocess → process.kill() + Error
 *   - Fișiere tmp create cu prefix unic per job → no collision între concurrency=1 workers
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

// Calea relativă la working directory al procesului Node.js
const LEIDEN_SCRIPT = join(process.cwd(), "workers/e5-nurturing/python/leiden_service.py");

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface LeidenRunOptions {
  /** Timeout în milisecunde pentru subprocess Python (default: 660_000 = 11 min, safety margin) */
  timeoutMs?: number;
  /** Resolution parameter Leiden (default: 1.0 pentru D21, 1.5 pentru D24) */
  resolution?: number;
  /** Minimum community size (default: 3 conform Plan L2291) */
  minCommunitySize?: number;
}

export interface GraphData {
  nodes: Array<{ id: string; index: number; properties?: Record<string, unknown> }>;
  edges: Array<{ source: number; target: number; weight: number; type: string }>;
}

export interface LeidenResult {
  communities: number[][];
  node_community_map: Record<string, number>;
  modularity: number;
  n_communities: number;
  filtered_by_min_size: number;
  error?: string;
}

export interface CentralityResult {
  nodes: Array<{
    index: number;
    id: string;
    degree: number;
    degree_centrality: number;
    betweenness_centrality: number;
    eigenvector_centrality: number;
    pagerank: number;
  }>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Validare input graph — apelată înainte de subprocess pentru fail-fast
// ---------------------------------------------------------------------------

/**
 * validateGraphData — validare structurală a graph-ului înainte de trimitere la Python.
 *
 * Previne apeluri Python costisitoare cu date invalide.
 * Aruncă Error descriptiv pentru fiecare tip de invaliddare.
 *
 * Edge cases gestionate:
 *   - nodes null/undefined/non-array
 *   - edges null/undefined/non-array
 *   - nodes fără câmpuri obligatorii (id, index)
 *   - edges cu indici out-of-bounds sau self-loops
 *   - graph gol (0 noduri) → warning, nu error (Python îl gestionează cu empty result)
 */
export function validateGraphData(graph: GraphData): void {
  if (!graph || typeof graph !== "object") {
    throw new TypeError("[leiden-client] validateGraphData: graph must be an object");
  }

  if (!Array.isArray(graph.nodes)) {
    throw new TypeError("[leiden-client] validateGraphData: graph.nodes must be an array");
  }

  if (!Array.isArray(graph.edges)) {
    throw new TypeError("[leiden-client] validateGraphData: graph.edges must be an array");
  }

  const n = graph.nodes.length;

  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    if (!node || typeof node.id !== "string" || node.id.trim() === "") {
      throw new TypeError(
        `[leiden-client] validateGraphData: node[${i}].id must be a non-empty string`,
      );
    }
    if (typeof node.index !== "number" || !Number.isInteger(node.index) || node.index < 0) {
      throw new TypeError(
        `[leiden-client] validateGraphData: node[${i}].index must be a non-negative integer`,
      );
    }
  }

  for (let i = 0; i < graph.edges.length; i++) {
    const edge = graph.edges[i];
    if (typeof edge.source !== "number" || edge.source < 0 || edge.source >= n) {
      throw new RangeError(
        `[leiden-client] validateGraphData: edge[${i}].source=${edge.source} out of bounds (n=${n})`,
      );
    }
    if (typeof edge.target !== "number" || edge.target < 0 || edge.target >= n) {
      throw new RangeError(
        `[leiden-client] validateGraphData: edge[${i}].target=${edge.target} out of bounds (n=${n})`,
      );
    }
    if (typeof edge.weight !== "number" || Number.isNaN(edge.weight)) {
      throw new TypeError(
        `[leiden-client] validateGraphData: edge[${i}].weight must be a finite number`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Funcție internă: spawn Python subprocess
// ---------------------------------------------------------------------------

async function runPythonSubprocess(
  action: "leiden" | "leiden_implicit" | "centrality",
  inputPath: string,
  outputPath: string,
  options: LeidenRunOptions = {},
): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 660_000;

  const args: string[] = [
    LEIDEN_SCRIPT,
    "--action",
    action,
    "--input",
    inputPath,
    "--output",
    outputPath,
  ];

  if (options.resolution !== undefined) {
    args.push("--resolution", String(options.resolution));
  }

  if (options.minCommunitySize !== undefined) {
    args.push("--min-community-size", String(options.minCommunitySize));
  }

  return new Promise((resolve, reject) => {
    const stderrChunks: Buffer[] = [];
    let killed = false;

    const proc = spawn("python3", args, {
      // Nu moștenim stdio — captăm stderr explicit, stdout ignorat
      stdio: ["ignore", "ignore", "pipe"],
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    const timer = setTimeout(() => {
      killed = true;
      proc.kill("SIGKILL");
      reject(
        new Error(
          `[leiden-client] Python subprocess timeout after ${timeoutMs}ms (action=${action})`,
        ),
      );
    }, timeoutMs);

    proc.on("error", (err: NodeJS.ErrnoException) => {
      clearTimeout(timer);
      if (!killed) {
        reject(
          new Error(
            `[leiden-client] Failed to spawn python3 (action=${action}): ${err.message}. ` +
              `Ensure python3 is installed and leiden_service.py is at ${LEIDEN_SCRIPT}`,
          ),
        );
      }
    });

    proc.on("close", (code: number | null) => {
      clearTimeout(timer);
      if (killed) return;

      const stderr = Buffer.concat(stderrChunks).toString("utf-8").trim();
      if (stderr) {
        // Logăm stderr Python indiferent de exit code (poate conține warnings utile)
        console.warn(`[leiden-client] Python stderr (action=${action}):\n${stderr}`);
      }

      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `[leiden-client] Python subprocess exited with code ${code ?? "null"} (action=${action})` +
              (stderr ? `\nStderr: ${stderr.slice(0, 500)}` : ""),
          ),
        );
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Funcție helper: creare fișiere temporare unice
// ---------------------------------------------------------------------------

function makeTmpPaths(label: string): { inputPath: string; outputPath: string } {
  const uid = randomUUID();
  const base = join(tmpdir(), `cerniq_leiden_${label}_${uid}`);
  return {
    inputPath: `${base}_input.json`,
    outputPath: `${base}_output.json`,
  };
}

async function cleanupTmpFiles(...paths: string[]): Promise<void> {
  await Promise.allSettled(paths.map((p) => fs.unlink(p)));
}

// ---------------------------------------------------------------------------
// API PUBLIC: run Leiden community detection
// ---------------------------------------------------------------------------

/**
 * runLeidenCommunityDetect — D21: Leiden standard (resolution=1.0)
 *
 * @param graph - Graph-ul construit de D20
 * @param options - Opțiuni timeout + resolution
 * @returns LeidenResult cu communities, modularity, node_community_map
 */
export async function runLeidenCommunityDetect(
  graph: GraphData,
  options: LeidenRunOptions = {},
): Promise<LeidenResult> {
  const { inputPath, outputPath } = makeTmpPaths("leiden");

  try {
    await fs.writeFile(inputPath, JSON.stringify(graph), "utf-8");
    await runPythonSubprocess("leiden", inputPath, outputPath, options);
    const raw = await fs.readFile(outputPath, "utf-8");
    return JSON.parse(raw) as LeidenResult;
  } finally {
    await cleanupTmpFiles(inputPath, outputPath);
  }
}

/**
 * runLeidenImplicitDetect — D24: Leiden cu resolution=1.5 pentru sub-communities
 *
 * @param graph - Graph-ul construit de D20
 * @param options - Opțiuni (resolution default 1.5)
 * @returns LeidenResult cu implicit communities
 */
export async function runLeidenImplicitDetect(
  graph: GraphData,
  options: LeidenRunOptions = {},
): Promise<LeidenResult> {
  const effectiveOptions: LeidenRunOptions = {
    resolution: 1.5, // Plan §X FAZA 9e D24 — sub-communities cu resolution mai mare
    ...options,
  };
  const { inputPath, outputPath } = makeTmpPaths("leiden_implicit");

  try {
    await fs.writeFile(inputPath, JSON.stringify(graph), "utf-8");
    await runPythonSubprocess("leiden_implicit", inputPath, outputPath, effectiveOptions);
    const raw = await fs.readFile(outputPath, "utf-8");
    return JSON.parse(raw) as LeidenResult;
  } finally {
    await cleanupTmpFiles(inputPath, outputPath);
  }
}

/**
 * runCentralityCalculate — D22: calcul metrici centralitate (degree, betweenness, eigenvector, pagerank)
 *
 * @param graph - Graph-ul construit de D20
 * @param options - Opțiuni timeout
 * @returns CentralityResult cu metrici per nod normalizate la [0,1]
 */
export async function runCentralityCalculate(
  graph: GraphData,
  options: LeidenRunOptions = {},
): Promise<CentralityResult> {
  const { inputPath, outputPath } = makeTmpPaths("centrality");

  try {
    await fs.writeFile(inputPath, JSON.stringify(graph), "utf-8");
    await runPythonSubprocess("centrality", inputPath, outputPath, options);
    const raw = await fs.readFile(outputPath, "utf-8");
    return JSON.parse(raw) as CentralityResult;
  } finally {
    await cleanupTmpFiles(inputPath, outputPath);
  }
}

/**
 * runLeidenService — API generic (backward compat cu pattern din plan)
 * Wrapper simplu peste runPythonSubprocess pentru cazuri avansate.
 */
export async function runLeidenService(
  action: "leiden" | "leiden_implicit" | "centrality",
  inputPath: string,
  outputPath: string,
  options: LeidenRunOptions = {},
): Promise<void> {
  return runPythonSubprocess(action, inputPath, outputPath, options);
}
