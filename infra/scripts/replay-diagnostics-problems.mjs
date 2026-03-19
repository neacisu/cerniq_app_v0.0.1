import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function parseArgs(argv) {
  const options = {
    input: "test-results/diagnostics/workspace-diagnostics.json",
  };

  for (const arg of argv) {
    if (arg.startsWith("--input=")) {
      const value = arg.slice("--input=".length).trim();
      if (!value) {
        throw new Error("--input requires a non-empty path");
      }
      options.input = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function toAbsolutePath(relativeOrAbsolutePath) {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(repoRoot, relativeOrAbsolutePath);
}

function loadReport(inputPath) {
  if (!existsSync(inputPath)) {
    throw new Error(`Diagnostics report not found: ${inputPath}`);
  }

  return JSON.parse(readFileSync(inputPath, "utf-8"));
}

function normalizeRuleId(diagnostic) {
  return diagnostic.ruleId ?? diagnostic.source ?? "diagnostics-inventory";
}

function normalizeLine(value) {
  return Number.isInteger(value) && value > 0 ? value : 1;
}

function printDiagnostics(report) {
  let emitted = 0;

  for (const entry of report.files ?? []) {
    const absoluteFilePath = toAbsolutePath(entry.path);

    for (const diagnostic of entry.analysis?.diagnostics ?? []) {
      const line = normalizeLine(diagnostic.line);
      const column = normalizeLine(diagnostic.column);
      const severity = diagnostic.severity === "error" ? "error" : "warning";
      const ruleId = normalizeRuleId(diagnostic);
      const message = String(diagnostic.message ?? "Unknown diagnostic").replaceAll(/\r?\n/g, " ");

      console.log(`${absoluteFilePath}:${line}:${column}: ${severity} ${ruleId} ${message}`);
      emitted += 1;
    }
  }

  if (emitted === 0) {
    console.error("No diagnostics found in the inventory report.");
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const inputPath = toAbsolutePath(options.input);
  const report = loadReport(inputPath);
  printDiagnostics(report);
}

main();
