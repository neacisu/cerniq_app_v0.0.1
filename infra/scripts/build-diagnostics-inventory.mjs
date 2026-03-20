import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const DEFAULT_OUTPUT = "test-results/diagnostics/workspace-diagnostics.json";
const DEFAULT_SONAR_OUTPUT = "test-results/diagnostics/sonar-issues.json";
const DEFAULT_MAX_REPORT_AGE_HOURS = 24;
const REPORT_INPUT_TIMESTAMP_SKEW_MS = 1_000;

function parsePositiveIntegerOption(rawValue, flagName) {
  const parsedValue = Number.parseInt(rawValue, 10);
  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Invalid ${flagName} value: ${rawValue}`);
  }

  return parsedValue;
}

function applyParseArg(arg, options) {
  if (arg.startsWith("--output=")) {
    options.output = arg.slice("--output=".length).trim();
    options.scanArgs.push(arg);
    return true;
  }

  if (arg.startsWith("--sonar-input=")) {
    options.sonarInput = arg.slice("--sonar-input=".length).trim();
    return true;
  }

  if (arg.startsWith("--max-report-age-hours=")) {
    const rawValue = arg.slice("--max-report-age-hours=".length).trim();
    options.maxReportAgeHours = parsePositiveIntegerOption(rawValue, "--max-report-age-hours");
    return true;
  }

  const flagHandlers = {
    "--sonar-fetch": () => {
      options.sonarFetch = true;
    },
    "--no-sonar-fetch": () => {
      options.sonarFetch = false;
      options.sonarFetchIfConfigured = false;
    },
    "--sonar-fetch-if-configured": () => {
      options.sonarFetchIfConfigured = true;
    },
    "--no-test-reports": () => {
      options.includeTestReports = false;
    },
    "--no-security-reports": () => {
      options.includeSecurityReports = false;
    },
    "--include-stale-reports": () => {
      options.includeStaleReports = true;
    },
  };

  const handler = flagHandlers[arg];
  if (!handler) {
    return false;
  }

  handler();
  return true;
}

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    sonarInput: DEFAULT_SONAR_OUTPUT,
    sonarFetch: false,
    sonarFetchIfConfigured: true,
    includeTestReports: true,
    includeSecurityReports: true,
    includeStaleReports: false,
    maxReportAgeHours: DEFAULT_MAX_REPORT_AGE_HOURS,
    scanArgs: [],
  };

  for (const arg of argv) {
    if (applyParseArg(arg, options)) {
      continue;
    }

    options.scanArgs.push(arg);
  }

  return options;
}

function resolvePath(relativeOrAbsolutePath) {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(repoRoot, relativeOrAbsolutePath);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function normalizeRelativePath(candidatePath) {
  if (typeof candidatePath !== "string") {
    return null;
  }

  const trimmed = candidatePath.trim();
  if (!trimmed) {
    return null;
  }

  const absolutePath = path.isAbsolute(trimmed) ? trimmed : path.join(repoRoot, trimmed);
  const relativePath = path.relative(repoRoot, absolutePath);

  if (!relativePath || relativePath.startsWith("..")) {
    return null;
  }

  return relativePath.split(path.sep).join("/");
}

function parseTimestampMs(value) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value < 1_000_000_000_000 ? value * 1_000 : value;
  }

  if (typeof value === "string") {
    const parsedValue = Date.parse(value);
    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  return null;
}

function getMaxTimestampMs(values) {
  const timestamps = values.filter((value) => Number.isFinite(value) && value > 0);
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
}

function getFileMtimeMs(filePath) {
  return existsSync(filePath) ? statSync(filePath).mtimeMs : null;
}

function buildSkippedExternalSource(analyzer, reportFile, reason, details = {}) {
  return {
    analyzer,
    report: path.relative(repoRoot, reportFile).split(path.sep).join("/"),
    reason,
    ...details,
  };
}

function collectFreshnessReferenceMtimes(relativePaths) {
  const mtimes = [];

  for (const relativePath of relativePaths) {
    const absolutePath = path.join(repoRoot, relativePath);
    const mtimeMs = getFileMtimeMs(absolutePath);
    if (mtimeMs !== null) {
      mtimes.push(mtimeMs);
    }
  }

  return mtimes;
}

function evaluateReportFreshness({
  analyzer,
  reportFile,
  reportTimestampMs,
  referencedPaths,
  options,
}) {
  if (options.includeStaleReports) {
    return { fresh: true };
  }

  const reportAgeMs = Date.now() - reportTimestampMs;
  const maxReportAgeMs = options.maxReportAgeHours * 60 * 60 * 1_000;
  if (reportAgeMs > maxReportAgeMs) {
    return {
      fresh: false,
      skipped: buildSkippedExternalSource(
        analyzer,
        reportFile,
        `Report is older than ${options.maxReportAgeHours}h freshness window.`,
        {
          reportTimestamp: new Date(reportTimestampMs).toISOString(),
          maxReportAgeHours: options.maxReportAgeHours,
        },
      ),
    };
  }

  const latestReferencedMtimeMs = getMaxTimestampMs(
    collectFreshnessReferenceMtimes(referencedPaths),
  );
  if (
    latestReferencedMtimeMs !== null &&
    latestReferencedMtimeMs > reportTimestampMs + REPORT_INPUT_TIMESTAMP_SKEW_MS
  ) {
    return {
      fresh: false,
      skipped: buildSkippedExternalSource(
        analyzer,
        reportFile,
        "Referenced source files are newer than the imported report.",
        {
          reportTimestamp: new Date(reportTimestampMs).toISOString(),
          latestInputTimestamp: new Date(latestReferencedMtimeMs).toISOString(),
        },
      ),
    };
  }

  return { fresh: true };
}

function flattenMessage(message) {
  return String(message ?? "Unknown diagnostic")
    .replaceAll(/\r?\n/g, " ")
    .trim();
}

function normalizeSeverity(value, fallback = "error") {
  if (!value) {
    return fallback;
  }

  if (["error", "warning"].includes(value)) {
    return value;
  }

  const upper = String(value).toUpperCase();
  return ["CRITICAL", "BLOCKER", "HIGH", "MAJOR", "FAILED"].includes(upper) ? "error" : "warning";
}

function ensurePosInt(value, fallback = 1) {
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function createDiagnostic(source, severity, message, line = 1, column = 1, extras = {}) {
  return {
    source,
    severity: normalizeSeverity(severity),
    message: flattenMessage(message),
    line: ensurePosInt(line),
    column: ensurePosInt(column),
    endLine: extras.endLine ?? null,
    endColumn: extras.endColumn ?? null,
    ruleId: extras.ruleId ?? null,
    fatal: extras.fatal ?? false,
    nodeType: extras.nodeType ?? null,
    suggestionCount: extras.suggestionCount ?? 0,
  };
}

function createRun(analyzer, diagnostics, metadata = {}) {
  return {
    analyzer,
    status: diagnostics.length > 0 ? "diagnostics" : (metadata.status ?? "clean"),
    command: metadata.command ?? null,
    startedAt: metadata.startedAt ?? new Date().toISOString(),
    finishedAt: metadata.finishedAt ?? new Date().toISOString(),
    durationMs: metadata.durationMs ?? 0,
    exitCode: metadata.exitCode ?? (diagnostics.length > 0 ? 1 : 0),
    diagnostics,
    stderr: metadata.stderr ?? null,
    parserError: metadata.parserError ?? null,
  };
}

function appendUniqueDiagnostics(entry, diagnostics, run) {
  const existing = new Set(
    (entry.analysis.diagnostics ?? []).map((diagnostic) =>
      [
        diagnostic.source,
        diagnostic.ruleId,
        diagnostic.message,
        diagnostic.line,
        diagnostic.column,
      ].join("|"),
    ),
  );
  const appended = [];

  for (const diagnostic of diagnostics) {
    const key = [
      diagnostic.source,
      diagnostic.ruleId,
      diagnostic.message,
      diagnostic.line,
      diagnostic.column,
    ].join("|");
    if (existing.has(key)) {
      continue;
    }

    existing.add(key);
    entry.analysis.diagnostics.push(diagnostic);
    appended.push(diagnostic);
  }

  if (appended.length > 0 || run.status === "analyzer-error") {
    entry.analysis.runs.push({
      ...run,
      diagnostics: appended,
    });
  }
}

function getEntryMap(report) {
  const map = new Map();

  for (const entry of report.files ?? []) {
    map.set(entry.path, entry);
  }

  return map;
}

function createExternalEntry(relativePath, extension) {
  const absolutePath = resolvePath(relativePath);
  const stats = existsSync(absolutePath) ? statSync(absolutePath) : null;

  return {
    path: relativePath,
    extension,
    size: stats?.size ?? 0,
    mtimeMs: stats?.mtimeMs ?? Date.now(),
    fingerprint: `${relativePath}:${stats?.size ?? 0}:${Math.trunc(stats?.mtimeMs ?? Date.now())}`,
    analysis: {
      supported: true,
      status: "clean",
      analyzers: [],
      diagnostics: [],
      runs: [],
    },
  };
}

function ensureEntry(report, entryMap, relativePath) {
  const normalizedPath = relativePath.split(path.sep).join("/");
  const existing = entryMap.get(normalizedPath);
  if (existing) {
    return existing;
  }

  const entry = createExternalEntry(normalizedPath, path.extname(normalizedPath));
  report.files.push(entry);
  entryMap.set(normalizedPath, entry);
  return entry;
}

function updateEntryStatus(entry) {
  entry.analysis.analyzers = [...new Set((entry.analysis.runs ?? []).map((run) => run.analyzer))];

  if ((entry.analysis.diagnostics ?? []).length > 0) {
    entry.analysis.status = "diagnostics";
    return;
  }

  if ((entry.analysis.runs ?? []).some((run) => run.status === "analyzer-error")) {
    entry.analysis.status = "analyzer-error";
    return;
  }

  entry.analysis.status = "clean";
}

function incrementCount(counter, key) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function createEmptySummary(totalFiles) {
  return {
    totalFiles,
    supportedFiles: 0,
    unsupportedFiles: 0,
    cleanFiles: 0,
    filesWithDiagnostics: 0,
    analyzerErrors: 0,
    diagnosticsCount: 0,
    severityCounts: {
      error: 0,
      warning: 0,
    },
    analyzerCounts: {},
    ruleCounts: {},
    sourceCounts: {},
  };
}

function addDiagnosticsToSummary(summary, diagnostics) {
  for (const diagnostic of diagnostics) {
    summary.diagnosticsCount += 1;
    incrementCount(summary.severityCounts, diagnostic.severity);
    incrementCount(summary.sourceCounts, diagnostic.source);

    if (diagnostic.ruleId) {
      incrementCount(summary.ruleCounts, diagnostic.ruleId);
    }
  }
}

function summarizeSupportedEntry(summary, entry) {
  summary.supportedFiles += 1;

  for (const run of entry.analysis.runs ?? []) {
    incrementCount(summary.analyzerCounts, run.analyzer);
  }

  if (entry.analysis.status === "clean") {
    summary.cleanFiles += 1;
  }

  if (entry.analysis.status === "analyzer-error") {
    summary.analyzerErrors += 1;
  }

  if ((entry.analysis.diagnostics ?? []).length > 0) {
    summary.filesWithDiagnostics += 1;
  }

  addDiagnosticsToSummary(summary, entry.analysis.diagnostics ?? []);
}

function rebuildSummary(report) {
  const summary = createEmptySummary(report.files.length);

  for (const entry of report.files) {
    if (!entry.analysis.supported) {
      summary.unsupportedFiles += 1;
      continue;
    }

    summarizeSupportedEntry(summary, entry);
  }

  report.summary = summary;
}

function parseStackLocation(text) {
  const normalized = String(text ?? "").replaceAll("\\", "/");
  const matches = normalized.matchAll(/(\/var\/www\/CerniqAPP\/[^\s:()]+):(\d+):(\d+)/g);

  for (const match of matches) {
    if (match[1].includes("/node_modules/")) {
      continue;
    }

    return {
      path: path.relative(repoRoot, match[1]).split(path.sep).join("/"),
      line: Number.parseInt(match[2], 10),
      column: Number.parseInt(match[3], 10),
    };
  }

  return null;
}

function collectVitestDiagnosticsFromReport(reportFile, reportJson) {
  const diagnosticsByPath = new Map();

  for (const suite of reportJson.testResults ?? []) {
    const failedAssertions = (suite.assertionResults ?? []).filter(
      (assertion) => assertion.status === "failed" && (assertion.failureMessages?.length ?? 0) > 0,
    );

    for (const assertion of failedAssertions) {
      const failureText = assertion.failureMessages.join("\n");
      const location = parseStackLocation(failureText) ?? {
        path: path.relative(repoRoot, suite.name).split(path.sep).join("/"),
        line: 1,
        column: 1,
      };
      const firstLine = flattenMessage(failureText.split(/\r?\n/, 1)[0]);
      const message = `${assertion.fullName}: ${firstLine}`;
      const diagnostic = createDiagnostic(
        "vitest",
        "error",
        message,
        location.line,
        location.column,
        {
          ruleId: "vitest.assertion",
          fatal: true,
        },
      );
      const list = diagnosticsByPath.get(location.path) ?? [];
      list.push(diagnostic);
      diagnosticsByPath.set(location.path, list);
    }
  }

  const importedFrom = path.relative(repoRoot, reportFile).split(path.sep).join("/");
  return {
    analyzer: "vitest",
    command: importedFrom,
    diagnosticsByPath,
  };
}

function collectVitestReferencedPaths(reportJson) {
  const referencedPaths = new Set();

  for (const suite of reportJson.testResults ?? []) {
    const relativePath = normalizeRelativePath(suite.name);
    if (relativePath) {
      referencedPaths.add(relativePath);
    }
  }

  return [...referencedPaths];
}

function resolveVitestReportTimestampMs(reportFile, reportJson) {
  return getMaxTimestampMs([
    parseTimestampMs(reportJson.startTime),
    ...(reportJson.testResults ?? []).map((suite) => parseTimestampMs(suite.startTime)),
    getFileMtimeMs(reportFile),
  ]);
}

function createPlaywrightFallbackLocation(spec) {
  return {
    path: spec.file ? path.relative(repoRoot, spec.file).split(path.sep).join("/") : null,
    line: ensurePosInt(spec.line ?? spec.location?.line ?? 1),
    column: ensurePosInt(spec.column ?? spec.location?.column ?? 1),
  };
}

function addDiagnosticToCollector(collector, relativePath, diagnostic) {
  const list = collector.get(relativePath) ?? [];
  list.push(diagnostic);
  collector.set(relativePath, list);
}

function getPlaywrightErrors(result) {
  return result.errors?.length ? result.errors : [result.error].filter(Boolean);
}

function addPlaywrightResultDiagnostics(spec, test, result, collector) {
  const status = result.status ?? test.status;
  if (!["failed", "timedOut", "interrupted"].includes(status)) {
    return;
  }

  const fallbackLocation = createPlaywrightFallbackLocation(spec);

  for (const error of getPlaywrightErrors(result)) {
    const location = parseStackLocation(error?.stack ?? error?.message ?? "") ?? fallbackLocation;

    if (!location.path) {
      continue;
    }

    const message = `${spec.title}: ${flattenMessage(error?.message ?? status)}`;
    addDiagnosticToCollector(
      collector,
      location.path,
      createDiagnostic("playwright", "error", message, location.line, location.column, {
        ruleId: "playwright.test",
        fatal: true,
      }),
    );
  }
}

function addPlaywrightSpecDiagnostics(spec, collector) {
  for (const test of spec.tests ?? []) {
    for (const result of test.results ?? []) {
      addPlaywrightResultDiagnostics(spec, test, result, collector);
    }
  }
}

function walkPlaywrightSuites(suites, collector) {
  for (const suite of suites ?? []) {
    walkPlaywrightSuites(suite.suites, collector);

    for (const spec of suite.specs ?? []) {
      addPlaywrightSpecDiagnostics(spec, collector);
    }
  }
}

function collectPlaywrightDiagnostics(reportFile, reportJson) {
  const diagnosticsByPath = new Map();
  walkPlaywrightSuites(reportJson.suites ?? [], diagnosticsByPath);

  return {
    analyzer: "playwright",
    command: path.relative(repoRoot, reportFile).split(path.sep).join("/"),
    diagnosticsByPath,
  };
}

function collectPlaywrightReferencedPaths(reportJson) {
  const referencedPaths = new Set();
  const visitSuites = (suites) => {
    for (const suite of suites ?? []) {
      visitSuites(suite.suites);

      for (const spec of suite.specs ?? []) {
        const relativePath = normalizeRelativePath(spec.file);
        if (relativePath) {
          referencedPaths.add(relativePath);
        }
      }
    }
  };

  visitSuites(reportJson.suites ?? []);
  return [...referencedPaths];
}

function resolvePlaywrightReportTimestampMs(reportFile, reportJson) {
  return getMaxTimestampMs([
    parseTimestampMs(reportJson.generatedAt),
    parseTimestampMs(reportJson.stats?.startTime),
    getFileMtimeMs(reportFile),
  ]);
}

function collectSonarDiagnostics(reportJson) {
  const diagnosticsByPath = new Map();

  for (const issue of reportJson.issues ?? []) {
    if (!issue.path) {
      continue;
    }

    const diagnostic = createDiagnostic(
      "sonarcloud",
      issue.severity,
      issue.message,
      issue.line,
      issue.column,
      {
        endLine: issue.endLine ?? null,
        endColumn: issue.endColumn ?? null,
        ruleId: issue.rule ?? issue.key ?? "sonar.issue",
        fatal: issue.severity === "error",
      },
    );
    const list = diagnosticsByPath.get(issue.path) ?? [];
    list.push(diagnostic);
    diagnosticsByPath.set(issue.path, list);
  }

  return {
    analyzer: "sonarcloud",
    command: reportJson.projectKey ?? "sonarcloud",
    diagnosticsByPath,
  };
}

function collectTrivyDiagnostics(reportFile, reportJson) {
  const diagnosticsByPath = new Map();

  for (const result of reportJson.Results ?? []) {
    const relativePath = result.Target?.startsWith(repoRoot)
      ? path.relative(repoRoot, result.Target).split(path.sep).join("/")
      : null;

    if (!relativePath) {
      continue;
    }

    for (const vulnerability of result.Vulnerabilities ?? []) {
      const message = `${vulnerability.PkgName ?? "package"}: ${vulnerability.Title ?? vulnerability.VulnerabilityID}`;
      const diagnostic = createDiagnostic("trivy", vulnerability.Severity, message, 1, 1, {
        ruleId: vulnerability.VulnerabilityID ?? "trivy.vulnerability",
        fatal: ["CRITICAL", "HIGH"].includes(vulnerability.Severity ?? ""),
      });
      const list = diagnosticsByPath.get(relativePath) ?? [];
      list.push(diagnostic);
      diagnosticsByPath.set(relativePath, list);
    }

    for (const misconfiguration of result.Misconfigurations ?? []) {
      const location = misconfiguration.CauseMetadata?.StartLine ?? 1;
      const diagnostic = createDiagnostic(
        "trivy",
        misconfiguration.Severity,
        misconfiguration.Message,
        location,
        1,
        {
          ruleId: misconfiguration.ID ?? "trivy.misconfig",
          fatal: ["CRITICAL", "HIGH"].includes(misconfiguration.Severity ?? ""),
        },
      );
      const list = diagnosticsByPath.get(relativePath) ?? [];
      list.push(diagnostic);
      diagnosticsByPath.set(relativePath, list);
    }

    for (const secret of result.Secrets ?? []) {
      const location = ensurePosInt(secret.StartLine ?? 1);
      const message = `${secret.RuleID ?? "secret"}: ${secret.Title ?? secret.Match ?? "Secret detected"}`;
      const diagnostic = createDiagnostic(
        "trivy",
        secret.Severity ?? "error",
        message,
        location,
        1,
        {
          ruleId: secret.RuleID ?? "trivy.secret",
          fatal: true,
        },
      );
      const list = diagnosticsByPath.get(relativePath) ?? [];
      list.push(diagnostic);
      diagnosticsByPath.set(relativePath, list);
    }
  }

  return {
    analyzer: "trivy",
    command: path.relative(repoRoot, reportFile).split(path.sep).join("/"),
    diagnosticsByPath,
  };
}

function resolveGenericReportTimestampMs(reportFile, reportJson) {
  return getMaxTimestampMs([
    parseTimestampMs(reportJson.generatedAt),
    parseTimestampMs(reportJson.createdAt),
    parseTimestampMs(reportJson.startTime),
    getFileMtimeMs(reportFile),
  ]);
}

function applyImportedDiagnostics(report, imported) {
  const entryMap = getEntryMap(report);

  for (const source of imported) {
    for (const [relativePath, diagnostics] of source.diagnosticsByPath.entries()) {
      const entry = ensureEntry(report, entryMap, relativePath);
      appendUniqueDiagnostics(
        entry,
        diagnostics,
        createRun(source.analyzer, diagnostics, {
          command: source.command,
          exitCode: diagnostics.length > 0 ? 1 : 0,
        }),
      );
      updateEntryStatus(entry);
    }
  }
}

function collectExistingJsonFiles(dirPath) {
  if (!existsSync(dirPath)) {
    return [];
  }

  const files = [];

  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectExistingJsonFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && path.extname(entry.name) === ".json") {
      files.push(absolutePath);
    }
  }

  files.sort((left, right) => left.localeCompare(right));
  return files;
}

function collectSonarImportedSources(options) {
  const sonarInputPath = resolvePath(options.sonarInput);
  if (!existsSync(sonarInputPath)) {
    return { imported: [], skipped: [] };
  }

  return { imported: [collectSonarDiagnostics(readJson(sonarInputPath))], skipped: [] };
}

function getTestReportCandidates() {
  return [
    path.join(repoRoot, "test-results", "results.json"),
    path.join(repoRoot, "test-results", "vitest-results.json"),
    path.join(repoRoot, "test-results", "vitest-infra.json"),
    ...collectExistingJsonFiles(path.join(repoRoot, "test-results", "vitest")),
  ];
}

function collectVitestImportedSources(options) {
  const imported = [];
  const skipped = [];
  const seen = new Set();

  for (const candidate of getTestReportCandidates()) {
    if (!existsSync(candidate) || seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    const payload = readJson(candidate);
    if (Array.isArray(payload.testResults)) {
      const freshness = evaluateReportFreshness({
        analyzer: "vitest",
        reportFile: candidate,
        reportTimestampMs:
          resolveVitestReportTimestampMs(candidate, payload) ??
          getFileMtimeMs(candidate) ??
          Date.now(),
        referencedPaths: collectVitestReferencedPaths(payload),
        options,
      });

      if (!freshness.fresh) {
        skipped.push(freshness.skipped);
        continue;
      }

      imported.push(collectVitestDiagnosticsFromReport(candidate, payload));
    }
  }

  return { imported, skipped };
}

function collectPlaywrightImportedSources(options) {
  const playwrightReport = path.join(repoRoot, "test-results", "playwright", "results.json");
  if (!existsSync(playwrightReport)) {
    return { imported: [], skipped: [] };
  }

  const payload = readJson(playwrightReport);
  const freshness = evaluateReportFreshness({
    analyzer: "playwright",
    reportFile: playwrightReport,
    reportTimestampMs:
      resolvePlaywrightReportTimestampMs(playwrightReport, payload) ??
      getFileMtimeMs(playwrightReport) ??
      Date.now(),
    referencedPaths: collectPlaywrightReferencedPaths(payload),
    options,
  });

  if (!freshness.fresh) {
    return { imported: [], skipped: [freshness.skipped] };
  }

  return { imported: [collectPlaywrightDiagnostics(playwrightReport, payload)], skipped: [] };
}

function collectSecurityImportedSources(options) {
  const imported = [];
  const skipped = [];

  for (const candidate of collectExistingJsonFiles(path.join(repoRoot, "security-reports"))) {
    const payload = readJson(candidate);
    if (Array.isArray(payload.Results)) {
      const freshness = evaluateReportFreshness({
        analyzer: "trivy",
        reportFile: candidate,
        reportTimestampMs:
          resolveGenericReportTimestampMs(candidate, payload) ??
          getFileMtimeMs(candidate) ??
          Date.now(),
        referencedPaths: [],
        options,
      });

      if (!freshness.fresh) {
        skipped.push(freshness.skipped);
        continue;
      }

      imported.push(collectTrivyDiagnostics(candidate, payload));
    }
  }

  return { imported, skipped };
}

function collectImportedSources(options) {
  const { imported, skipped } = collectSonarImportedSources(options);

  if (options.includeTestReports) {
    const vitestSources = collectVitestImportedSources(options);
    const playwrightSources = collectPlaywrightImportedSources(options);
    imported.push(...vitestSources.imported, ...playwrightSources.imported);
    skipped.push(...vitestSources.skipped, ...playwrightSources.skipped);
  }

  if (options.includeSecurityReports) {
    const securitySources = collectSecurityImportedSources(options);
    imported.push(...securitySources.imported);
    skipped.push(...securitySources.skipped);
  }

  return { imported, skipped };
}

function runScanner(options) {
  const args = ["./infra/scripts/scan-diagnostics-inventory.mjs", ...options.scanArgs];
  const result = spawnSync("node", args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(`Base diagnostics scan failed with exit code ${result.status ?? 1}`);
  }
}

function shouldFetchSonar(options) {
  if (options.sonarFetch) {
    return true;
  }

  if (!options.sonarFetchIfConfigured) {
    return false;
  }

  return existsSync(path.join(repoRoot, "sonar-project.properties"));
}

function fetchSonarIfNeeded(options) {
  if (!shouldFetchSonar(options)) {
    return false;
  }

  const result = spawnSync(
    "node",
    ["./infra/scripts/fetch-sonar-issues.mjs", `--output=${options.sonarInput}`],
    {
      cwd: repoRoot,
      stdio: "inherit",
      env: process.env,
    },
  );

  if ((result.status ?? 1) !== 0 && options.sonarFetch) {
    throw new Error(`Sonar issue export failed with exit code ${result.status ?? 1}`);
  }

  return (result.status ?? 1) === 0;
}

function writeReport(report, outputPath) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const outputPath = resolvePath(options.output);

  runScanner(options);
  const sonarFetchSucceeded = fetchSonarIfNeeded(options);

  const report = readJson(outputPath);
  if (!sonarFetchSucceeded) {
    options.sonarInput = path.join("test-results", "diagnostics", "missing-sonar-issues.json");
  }
  const { imported, skipped } = collectImportedSources(options);
  applyImportedDiagnostics(report, imported);
  rebuildSummary(report);
  report.completedAt = new Date().toISOString();
  report.externalSources = imported
    .map((source) => ({
      analyzer: source.analyzer,
      filesWithDiagnostics: source.diagnosticsByPath.size,
    }))
    .filter((source) => source.filesWithDiagnostics > 0);
  report.skippedExternalSources = skipped;
  writeReport(report, outputPath);

  console.log(
    JSON.stringify(
      {
        output: path.relative(repoRoot, outputPath),
        diagnosticsCount: report.summary.diagnosticsCount,
        filesWithDiagnostics: report.summary.filesWithDiagnostics,
        externalSources: report.externalSources,
        skippedExternalSources: skipped,
      },
      null,
      2,
    ),
  );
}

main();
