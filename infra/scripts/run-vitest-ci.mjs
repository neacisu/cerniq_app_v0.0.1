import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const resultsDir = path.join(rootDir, "test-results", "vitest");

const packages = [
  "@cerniq/api",
  "@cerniq/web",
  "@cerniq/web-admin",
  "@cerniq/monitoring-api",
  "@cerniq/db",
  "@cerniq/shared-types",
  "@cerniq/config",
  "@cerniq/observability",
  "@cerniq/worker-enrichment",
  "@cerniq/worker-shared",
  "@cerniq/worker-ai",
  "@cerniq/worker-outreach",
  "@cerniq/worker-e3-ai-sales",
  "@cerniq/worker-e4-postsale",
  "@cerniq/worker-e5-nurturing",
];

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
      packages: summary,
    },
    null,
    2,
  ),
);

if (failed) {
  process.exit(1);
}
