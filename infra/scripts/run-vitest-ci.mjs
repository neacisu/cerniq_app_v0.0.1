import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import prettier from "prettier";

const rootDir = process.cwd();
const resultsDir = path.join(rootDir, "test-results", "vitest");

const registryPath = path.join(rootDir, "docs/developer-guide/testing-coverage-tiers.json");
const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
const packages = registry.packages.filter((p) => p.includeInVitestCi !== false).map((p) => p.package);

/**
 * Rapoarte `--reporter=json` (Vitest) pe o singură linie → formatare Prettier.
 * NU folosim `filepath` în `prettier.format`: `.prettierignore` conține `test-results`,
 * iar cu filepath Prettier returnează conținutul nemodificat (fișier „ignorat”).
 */
async function formatVitestJsonReports() {
  const baseOptions = (await prettier.resolveConfig(rootDir)) ?? {};
  let names;
  try {
    names = readdirSync(resultsDir);
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    const filePath = path.join(resultsDir, name);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const formatted = await prettier.format(raw, {
        ...baseOptions,
        parser: "json",
      });
      writeFileSync(filePath, formatted);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[run-vitest-ci] prettier skip ${name}: ${msg}`);
    }
  }
}

mkdirSync(resultsDir, { recursive: true });

const summary = [];
let failed = false;

{
  const outputFile = path.join(resultsDir, "root-plan-contracts.json");
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "tests/plans",
      "tests/infra",
      "--reporter=json",
      `--outputFile=${outputFile}`,
    ],
    {
      cwd: rootDir,
      stdio: "inherit",
      env: {
        ...process.env,
        CI: "1",
      },
    },
  );

  const entry = {
    package: "@root/plan-contracts",
    outputFile: path.relative(rootDir, outputFile),
    exitCode: result.status ?? 1,
  };

  if (result.status === 0) {
    try {
      const report = JSON.parse(readFileSync(outputFile, "utf-8"));
      summary.push({
        ...entry,
        numTotalTests: report.numTotalTests ?? null,
        numPassedTests: report.numPassedTests ?? null,
        numFailedTests: report.numFailedTests ?? null,
        success: report.success ?? result.status === 0,
      });
    } catch {
      summary.push(entry);
    }
  } else {
    failed = true;
    summary.push(entry);
  }
}

for (const pkg of packages) {
  const safeName = pkg.replace(/^@/, "").replaceAll("/", "-");
  const outputFile = path.join(resultsDir, `${safeName}.json`);
  const args = [
    "--filter",
    pkg,
    "exec",
    "vitest",
    "run",
    "--reporter=json",
    `--outputFile=${outputFile}`,
  ];

  const result = spawnSync("pnpm", args, {
    cwd: rootDir,
    stdio: "inherit",
    env: {
      ...process.env,
      CI: "1",
    },
  });

  const entry = {
    package: pkg,
    outputFile: path.relative(rootDir, outputFile),
    exitCode: result.status ?? 1,
  };

  if (result.status === 0) {
    try {
      const report = JSON.parse(readFileSync(outputFile, "utf-8"));
      summary.push({
        ...entry,
        numTotalTests: report.numTotalTests ?? null,
        numPassedTests: report.numPassedTests ?? null,
        numFailedTests: report.numFailedTests ?? null,
        success: report.success ?? result.status === 0,
      });
    } catch {
      summary.push(entry);
    }
  } else {
    failed = true;
    summary.push(entry);
  }
}

writeFileSync(
  path.join(resultsDir, "summary.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      registry: path.relative(rootDir, registryPath),
      packages,
      items: summary,
    },
    null,
    2,
  ),
);

await formatVitestJsonReports();

if (failed) {
  process.exit(1);
}
