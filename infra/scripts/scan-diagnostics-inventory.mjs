import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseDocument } from "yaml";

const SCANNER_VERSION = 2;
const repoRoot = process.cwd();
const TRUSTED_EXECUTABLE_PATHS = Object.freeze({
  bash: ["/usr/bin/bash", "/bin/bash"],
  pnpm: ["/usr/local/bin/pnpm", "/usr/bin/pnpm", "/bin/pnpm"],
  python3: ["/usr/local/bin/python3", "/usr/bin/python3", "/bin/python3"],
});

const DEFAULT_EXCLUDED_DIRS = new Set([
  ".git",
  ".turbo",
  "node_modules",
  "dist",
  "build",
  "coverage",
  "playwright-report",
  "test-results",
  "tmp",
  "data",
  "secrets",
  "Arhiva_Research",
]);

const ANALYZER_SUPPORT = {
  eslint: new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]),
  typescript: new Set([".ts", ".tsx"]),
  json: new Set([".json"]),
  yaml: new Set([".yaml", ".yml"]),
  shell: new Set([".sh"]),
  python: new Set([".py"]),
};

const DEFAULT_ANALYZERS = Object.keys(ANALYZER_SUPPORT);
const PYTHON_SYNTAX_CHECK = [
  "import ast",
  "import pathlib",
  "import sys",
  "source = pathlib.Path(sys.argv[1]).read_text(encoding='utf-8')",
  "ast.parse(source, filename=sys.argv[1])",
].join("; ");

function resolveTrustedExecutable(executableName) {
  const candidates = TRUSTED_EXECUTABLE_PATHS[executableName] ?? [];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolvePnpmRuntime() {
  const npmExecPath = process.env.npm_execpath;
  if (typeof npmExecPath === "string" && path.isAbsolute(npmExecPath) && existsSync(npmExecPath)) {
    return {
      command: process.execPath,
      argsPrefix: [npmExecPath],
    };
  }

  const pnpmExecutable = resolveTrustedExecutable("pnpm");
  if (pnpmExecutable) {
    return {
      command: pnpmExecutable,
      argsPrefix: [],
    };
  }

  return null;
}

function createMissingExecutableContext(command) {
  return {
    command,
    exitCode: 1,
    diagnosticsByFile: new Map(),
    stderr: null,
    parserError: `Required executable is not available in trusted system paths: ${command}`,
  };
}

function createMissingExecutableRun(analyzer, startedAt, startedMs, command) {
  return createAnalyzerRun(analyzer, startedAt, startedMs, {
    status: "analyzer-error",
    command,
    exitCode: 1,
    diagnostics: [],
    stderr: null,
    parserError: `Required executable is not available in trusted system paths: ${command}`,
  });
}

function printHelp() {
  console.log(`Usage: node ./infra/scripts/scan-diagnostics-inventory.mjs [options]

Options:
  --extensions=.ts,.tsx       Restrict scan to specific extensions.
  --roots=apps,packages       Restrict scan to specific top-level roots.
  --analyzers=eslint,typescript,json,yaml,shell,python
                              Enable a comma-separated analyzer list.
  --output=path/to/report.json
                              Output JSON path relative to repo root.
  --max-files=250             Stop after scanning N files.
  --checkpoint-every=25       Persist report every N scanned files.
  --resume                    Reuse an existing output file and skip unchanged entries.
  --supported-only            Omit files that have no configured analyzer.
  --quiet                     Reduce progress logging.
  --help                      Show this message.
`);
}

function normalizeExtension(extension) {
  if (!extension) {
    return extension;
  }

  return extension.startsWith(".") ? extension : `.${extension}`;
}

function parsePositiveInteger(rawValue, flagName) {
  const value = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Invalid value for ${flagName}: ${rawValue}`);
  }

  return value;
}

function parseCsvValue(rawValue) {
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseExtensionsArg(arg, options) {
  const extensions = parseCsvValue(arg.slice("--extensions=".length)).map((extension) =>
    normalizeExtension(extension),
  );
  options.extensions = extensions.length > 0 ? extensions : null;
}

function parseRootsArg(arg, options) {
  const roots = parseCsvValue(arg.slice("--roots=".length));
  options.roots = roots.length > 0 ? roots : null;
}

function parseAnalyzersArg(arg, options) {
  const analyzers = parseCsvValue(arg.slice("--analyzers=".length));

  for (const analyzer of analyzers) {
    if (!(analyzer in ANALYZER_SUPPORT)) {
      throw new Error(`Unknown analyzer: ${analyzer}`);
    }
  }

  options.analyzers = analyzers.length > 0 ? analyzers : [...DEFAULT_ANALYZERS];
}

function parseOutputArg(arg, options) {
  const output = arg.slice("--output=".length).trim();

  if (!output) {
    throw new Error("--output requires a non-empty path");
  }

  options.output = output;
}

function parseNumericArg(arg, prefix, flagName) {
  return parsePositiveInteger(arg.slice(prefix.length), flagName);
}

function applySimpleFlag(arg, options) {
  const simpleFlags = {
    "--resume": () => {
      options.resume = true;
    },
    "--supported-only": () => {
      options.includeUnsupported = false;
    },
    "--quiet": () => {
      options.quiet = true;
    },
  };

  const apply = simpleFlags[arg];
  if (!apply) {
    return false;
  }

  apply();
  return true;
}

function applyValueFlag(arg, options) {
  if (arg.startsWith("--extensions=")) {
    parseExtensionsArg(arg, options);
    return true;
  }

  if (arg.startsWith("--roots=")) {
    parseRootsArg(arg, options);
    return true;
  }

  if (arg.startsWith("--analyzers=")) {
    parseAnalyzersArg(arg, options);
    return true;
  }

  if (arg.startsWith("--output=")) {
    parseOutputArg(arg, options);
    return true;
  }

  if (arg.startsWith("--max-files=")) {
    options.maxFiles = parseNumericArg(arg, "--max-files=", "--max-files");
    return true;
  }

  if (arg.startsWith("--checkpoint-every=")) {
    options.checkpointEvery = parseNumericArg(arg, "--checkpoint-every=", "--checkpoint-every");
    return true;
  }

  return false;
}

function parseArgs(argv) {
  const options = {
    extensions: null,
    roots: null,
    analyzers: [...DEFAULT_ANALYZERS],
    output: "test-results/diagnostics/workspace-diagnostics.json",
    maxFiles: null,
    checkpointEvery: 25,
    resume: false,
    includeUnsupported: true,
    quiet: false,
  };

  for (const arg of argv) {
    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }

    if (applySimpleFlag(arg, options)) {
      continue;
    }

    if (applyValueFlag(arg, options)) {
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function toRepoRelative(absolutePath) {
  return path.relative(repoRoot, absolutePath).split(path.sep).join("/");
}

function toAbsolutePath(relativeOrAbsolutePath) {
  return path.isAbsolute(relativeOrAbsolutePath)
    ? relativeOrAbsolutePath
    : path.join(repoRoot, relativeOrAbsolutePath);
}

function shouldSkipDirectory(entryName) {
  return DEFAULT_EXCLUDED_DIRS.has(entryName);
}

function enumerateFiles(currentPath, files) {
  const entries = readdirSync(currentPath, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(currentPath, entry.name);

    if (entry.isDirectory()) {
      if (shouldSkipDirectory(entry.name)) {
        continue;
      }

      enumerateFiles(absolutePath, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    const stat = statSync(absolutePath);
    files.push({
      absolutePath,
      relativePath: toRepoRelative(absolutePath),
      extension: path.extname(entry.name),
      size: stat.size,
      mtimeMs: stat.mtimeMs,
    });
  }
}

function listWorkspaceFiles(options) {
  const roots = options.roots?.length
    ? options.roots.map((root) => path.join(repoRoot, root))
    : [repoRoot];
  const files = [];

  for (const root of roots) {
    if (!existsSync(root)) {
      continue;
    }

    const rootStat = statSync(root);

    if (rootStat.isFile()) {
      files.push({
        absolutePath: root,
        relativePath: toRepoRelative(root),
        extension: path.extname(root),
        size: rootStat.size,
        mtimeMs: rootStat.mtimeMs,
      });
      continue;
    }

    enumerateFiles(root, files);
  }

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));

  if (!options.extensions) {
    return files;
  }

  return files.filter((file) => options.extensions.includes(file.extension));
}

function createFingerprint(file) {
  return `${file.relativePath}:${file.size}:${Math.trunc(file.mtimeMs)}`;
}

function createDiagnostic(source, severity, message, line = 1, column = 1, extras = {}) {
  return {
    source,
    severity,
    message,
    line,
    column,
    endLine: extras.endLine ?? null,
    endColumn: extras.endColumn ?? null,
    ruleId: extras.ruleId ?? null,
    fatal: extras.fatal ?? false,
    nodeType: extras.nodeType ?? null,
    suggestionCount: extras.suggestionCount ?? 0,
  };
}

function createAnalyzerRun(name, startedAt, startedMs, result) {
  return {
    analyzer: name,
    status: result.status,
    command: result.command,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedMs,
    exitCode: result.exitCode ?? null,
    diagnostics: result.diagnostics ?? [],
    stderr: result.stderr ?? null,
    parserError: result.parserError ?? null,
  };
}

function parseEslintOutput(stdout) {
  const diagnosticsByFile = new Map();

  if (!stdout) {
    return diagnosticsByFile;
  }

  const parsed = JSON.parse(stdout);
  const results = Array.isArray(parsed) ? parsed : [];

  for (const result of results) {
    const filePath = result.filePath ? normalizeTypeScriptPath(result.filePath) : null;

    if (!filePath) {
      continue;
    }

    const diagnostics = (result.messages ?? []).map((message) =>
      createDiagnostic(
        "eslint",
        message.severity === 2 ? "error" : "warning",
        message.message,
        message.line ?? 1,
        message.column ?? 1,
        {
          endLine: message.endLine ?? null,
          endColumn: message.endColumn ?? null,
          ruleId: message.ruleId ?? null,
          fatal: Boolean(message.fatal),
          nodeType: message.nodeType ?? null,
          suggestionCount: Array.isArray(message.suggestions) ? message.suggestions.length : 0,
        },
      ),
    );

    diagnosticsByFile.set(filePath, diagnostics);
  }

  return diagnosticsByFile;
}

function prepareEslintContext(targetFiles, options) {
  const eslintTargets = targetFiles.filter(
    (file) => options.analyzers.includes("eslint") && ANALYZER_SUPPORT.eslint.has(file.extension),
  );
  const pnpmRuntime = resolvePnpmRuntime();

  if (eslintTargets.length === 0) {
    return {
      command: "pnpm exec eslint --format json <files>",
      exitCode: 0,
      diagnosticsByFile: new Map(),
      stderr: null,
      parserError: null,
    };
  }

  if (!pnpmRuntime) {
    return createMissingExecutableContext("pnpm");
  }

  const result = spawnSync(
    pnpmRuntime.command,
    [
      ...pnpmRuntime.argsPrefix,
      "exec",
      "eslint",
      "--format",
      "json",
      "--no-warn-ignored",
      ...eslintTargets.map((file) => file.relativePath),
    ],
    {
      cwd: repoRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        FORCE_COLOR: "0",
      },
      maxBuffer: 40 * 1024 * 1024,
    },
  );

  const stdout = result.stdout?.trim() ?? "";
  const stderr = result.stderr?.trim() ?? "";

  try {
    return {
      command: "pnpm exec eslint --format json <files>",
      exitCode: result.status ?? 1,
      diagnosticsByFile: parseEslintOutput(stdout),
      stderr: stderr || null,
      parserError: null,
    };
  } catch (error) {
    return {
      command: "pnpm exec eslint --format json <files>",
      exitCode: result.status ?? 1,
      diagnosticsByFile: new Map(),
      stderr: stderr || null,
      parserError: error instanceof Error ? error.message : "Unknown ESLint parser error",
    };
  }
}

function runEslint(file, context) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const diagnostics = context.eslint.diagnosticsByFile.get(file.relativePath) ?? [];
  const hasParserError = Boolean(context.eslint.parserError);
  let status = "clean";

  if (hasParserError) {
    status = "analyzer-error";
  } else if (diagnostics.length > 0) {
    status = "diagnostics";
  }

  return createAnalyzerRun("eslint", startedAt, startedMs, {
    status,
    command: context.eslint.command,
    exitCode: context.eslint.exitCode,
    diagnostics,
    stderr: context.eslint.stderr,
    parserError: context.eslint.parserError,
  });
}

function normalizeLineColumnFromIndex(content, index) {
  const safeIndex = Math.max(0, Math.min(index, content.length));
  const prefix = content.slice(0, safeIndex);
  const lines = prefix.split(/\r?\n/);
  const line = lines.length;
  const column = (lines.at(-1)?.length ?? 0) + 1;

  return { line, column };
}

function parseJsonDiagnostic(error, content) {
  const message = error instanceof Error ? error.message : "Invalid JSON";
  const positionMatch = /position\s+(\d+)/i.exec(message);
  const position = positionMatch ? Number.parseInt(positionMatch[1], 10) : 0;
  const { line, column } = normalizeLineColumnFromIndex(content, position);

  return createDiagnostic("json", "error", message, line, column, {
    ruleId: "json.parse",
    fatal: true,
  });
}

function runJson(file) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const content = readFileSync(file.absolutePath, "utf-8");

  try {
    JSON.parse(content);
    return createAnalyzerRun("json", startedAt, startedMs, {
      status: "clean",
      command: "JSON.parse(<file>)",
      exitCode: 0,
      diagnostics: [],
      stderr: null,
    });
  } catch (error) {
    return createAnalyzerRun("json", startedAt, startedMs, {
      status: "diagnostics",
      command: "JSON.parse(<file>)",
      exitCode: 1,
      diagnostics: [parseJsonDiagnostic(error, content)],
      stderr: null,
    });
  }
}

function runYaml(file) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const content = readFileSync(file.absolutePath, "utf-8");

  try {
    const document = parseDocument(content, { prettyErrors: false });
    const diagnostics = (document.errors ?? []).map((error) => {
      const position = error.linePos?.[0] ?? { line: 1, col: 1 };
      return createDiagnostic("yaml", "error", error.message, position.line, position.col, {
        ruleId: "yaml.parse",
        fatal: true,
      });
    });

    return createAnalyzerRun("yaml", startedAt, startedMs, {
      status: diagnostics.length > 0 ? "diagnostics" : "clean",
      command: "yaml.parseDocument(<file>)",
      exitCode: diagnostics.length > 0 ? 1 : 0,
      diagnostics,
      stderr: null,
    });
  } catch (error) {
    return createAnalyzerRun("yaml", startedAt, startedMs, {
      status: "analyzer-error",
      command: "yaml.parseDocument(<file>)",
      exitCode: 1,
      diagnostics: [],
      stderr: null,
      parserError: error instanceof Error ? error.message : "Unknown YAML parser error",
    });
  }
}

function parseShellDiagnostic(stderr) {
  const normalized = stderr.trim().replaceAll(/\r?\n/g, " ");
  const lineMatch = /line\s+(\d+)/i.exec(normalized);
  const line = lineMatch ? Number.parseInt(lineMatch[1], 10) : 1;
  return createDiagnostic("shell", "error", normalized || "Shell syntax error", line, 1, {
    ruleId: "bash.syntax",
    fatal: true,
  });
}

function runShell(file) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const bashExecutable = resolveTrustedExecutable("bash");

  if (!bashExecutable) {
    return createMissingExecutableRun("shell", startedAt, startedMs, "bash -n <file>");
  }

  const result = spawnSync(bashExecutable, ["-n", file.absolutePath], {
    cwd: repoRoot,
    encoding: "utf-8",
  });
  const stderr = result.stderr?.trim() ?? "";

  if ((result.status ?? 0) === 0) {
    return createAnalyzerRun("shell", startedAt, startedMs, {
      status: "clean",
      command: "bash -n <file>",
      exitCode: 0,
      diagnostics: [],
      stderr: null,
    });
  }

  return createAnalyzerRun("shell", startedAt, startedMs, {
    status: "diagnostics",
    command: "bash -n <file>",
    exitCode: result.status ?? 1,
    diagnostics: [parseShellDiagnostic(stderr)],
    stderr: stderr || null,
  });
}

function parsePythonDiagnostic(stderr) {
  const normalized = stderr.trim().replaceAll(/\r?\n/g, " ");
  const lineMatch = /line\s+(\d+)/i.exec(normalized);
  const line = lineMatch ? Number.parseInt(lineMatch[1], 10) : 1;
  return createDiagnostic("python", "error", normalized || "Python syntax error", line, 1, {
    ruleId: "python.syntax",
    fatal: true,
  });
}

function runPython(file) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const pythonExecutable = resolveTrustedExecutable("python3");

  if (!pythonExecutable) {
    return createMissingExecutableRun(
      "python",
      startedAt,
      startedMs,
      "python3 -c <ast.parse checker> <file>",
    );
  }

  const result = spawnSync(pythonExecutable, ["-c", PYTHON_SYNTAX_CHECK, file.absolutePath], {
    cwd: repoRoot,
    encoding: "utf-8",
  });

  if (result.error) {
    return createAnalyzerRun("python", startedAt, startedMs, {
      status: "analyzer-error",
      command: "python3 -c <ast.parse checker> <file>",
      exitCode: 1,
      diagnostics: [],
      stderr: null,
      parserError: result.error.message,
    });
  }

  const stderr = result.stderr?.trim() ?? "";

  if ((result.status ?? 0) === 0) {
    return createAnalyzerRun("python", startedAt, startedMs, {
      status: "clean",
      command: "python3 -c <ast.parse checker> <file>",
      exitCode: 0,
      diagnostics: [],
      stderr: null,
    });
  }

  return createAnalyzerRun("python", startedAt, startedMs, {
    status: "diagnostics",
    command: "python3 -c <ast.parse checker> <file>",
    exitCode: result.status ?? 1,
    diagnostics: [parsePythonDiagnostic(stderr)],
    stderr: stderr || null,
  });
}

function normalizeTypeScriptPath(filePath) {
  return toRepoRelative(toAbsolutePath(filePath));
}

function appendTypeScriptDiagnostic(map, filePath, diagnostic) {
  const diagnostics = map.get(filePath) ?? [];
  diagnostics.push(diagnostic);
  map.set(filePath, diagnostics);
}

function parseTypeScriptDiagnosticLine(line) {
  const suffixSeparator = line.indexOf(": ");
  const locationSeparator = line.lastIndexOf("): ", suffixSeparator);
  if (locationSeparator < 0) {
    return null;
  }

  const openParen = line.lastIndexOf("(", locationSeparator);
  if (openParen < 0) {
    return null;
  }

  const filePath = line.slice(0, openParen);
  const locationText = line.slice(openParen + 1, locationSeparator);
  const [lineText, columnText] = locationText.split(",", 2);
  const lineNumber = Number.parseInt(lineText, 10);
  const columnNumber = Number.parseInt(columnText, 10);
  if (!Number.isInteger(lineNumber) || !Number.isInteger(columnNumber)) {
    return null;
  }

  const diagnosticText = line.slice(locationSeparator + 3);
  let severity = null;
  if (diagnosticText.startsWith("error ")) {
    severity = "error";
  } else if (diagnosticText.startsWith("warning ")) {
    severity = "warning";
  }

  if (!severity) {
    return null;
  }

  const rulePrefixLength = severity.length + 1;
  if (!diagnosticText.startsWith("TS", rulePrefixLength)) {
    return null;
  }

  const messageSeparator = diagnosticText.indexOf(": ", rulePrefixLength + 2);
  if (messageSeparator < 0) {
    return null;
  }

  const ruleSuffix = diagnosticText.slice(rulePrefixLength + 2, messageSeparator);
  if (
    !Number.isInteger(Number.parseInt(ruleSuffix, 10)) ||
    String(Number.parseInt(ruleSuffix, 10)) !== ruleSuffix
  ) {
    return null;
  }

  const message = diagnosticText.slice(messageSeparator + 2);

  return {
    filePath,
    lineNumber,
    columnNumber,
    severity,
    ruleId: `TS${ruleSuffix}`,
    message,
  };
}

function parseTypeScriptOutput(output) {
  const diagnosticsByFile = new Map();
  const lines = output.split(/\r?\n/);
  let currentDiagnostic = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) {
      continue;
    }

    const match = parseTypeScriptDiagnosticLine(line);
    if (match) {
      const filePath = normalizeTypeScriptPath(match.filePath);
      currentDiagnostic = createDiagnostic(
        "typescript",
        match.severity === "error" ? "error" : "warning",
        match.message,
        match.lineNumber,
        match.columnNumber,
        {
          ruleId: match.ruleId,
          fatal: match.severity === "error",
        },
      );
      appendTypeScriptDiagnostic(diagnosticsByFile, filePath, currentDiagnostic);
      continue;
    }

    if (currentDiagnostic) {
      currentDiagnostic.message = `${currentDiagnostic.message} ${line.trim()}`;
    }
  }

  return diagnosticsByFile;
}

function prepareTypeScriptContext(targetFiles, options) {
  const hasTypeScriptTargets = targetFiles.some(
    (file) =>
      options.analyzers.includes("typescript") && ANALYZER_SUPPORT.typescript.has(file.extension),
  );
  const pnpmRuntime = resolvePnpmRuntime();

  if (!hasTypeScriptTargets) {
    return {
      command: "pnpm exec tsc --noEmit --pretty false --project tsconfig.json",
      exitCode: 0,
      diagnosticsByFile: new Map(),
      stderr: null,
      parserError: null,
    };
  }

  if (!pnpmRuntime) {
    return createMissingExecutableContext("pnpm");
  }

  const result = spawnSync(
    pnpmRuntime.command,
    [
      ...pnpmRuntime.argsPrefix,
      "exec",
      "tsc",
      "--noEmit",
      "--pretty",
      "false",
      "--project",
      "tsconfig.json",
    ],
    {
      cwd: repoRoot,
      encoding: "utf-8",
      maxBuffer: 40 * 1024 * 1024,
    },
  );

  const stdout = result.stdout?.trim() ?? "";
  const stderr = result.stderr?.trim() ?? "";
  const combined = [stdout, stderr].filter(Boolean).join("\n");

  try {
    return {
      command: "pnpm exec tsc --noEmit --pretty false --project tsconfig.json",
      exitCode: result.status ?? 1,
      diagnosticsByFile: parseTypeScriptOutput(combined),
      stderr: stderr || null,
      parserError: null,
    };
  } catch (error) {
    return {
      command: "pnpm exec tsc --noEmit --pretty false --project tsconfig.json",
      exitCode: result.status ?? 1,
      diagnosticsByFile: new Map(),
      stderr: stderr || null,
      parserError: error instanceof Error ? error.message : "Unknown TypeScript parser error",
    };
  }
}

function runTypeScript(file, context) {
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const diagnostics = context.typeScript.diagnosticsByFile.get(file.relativePath) ?? [];
  const hasParserError = Boolean(context.typeScript.parserError);
  let status = "clean";

  if (hasParserError) {
    status = "analyzer-error";
  } else if (diagnostics.length > 0) {
    status = "diagnostics";
  }

  return createAnalyzerRun("typescript", startedAt, startedMs, {
    status,
    command: context.typeScript.command,
    exitCode: context.typeScript.exitCode,
    diagnostics,
    stderr: context.typeScript.stderr,
    parserError: context.typeScript.parserError,
  });
}

function loadExistingReport(outputPath) {
  if (!existsSync(outputPath)) {
    return null;
  }

  return JSON.parse(readFileSync(outputPath, "utf-8"));
}

function writeReportAtomic(outputPath, report) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  const tempPath = `${outputPath}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(report, null, 2)}\n`);
  renameSync(tempPath, outputPath);
}

function summarizeAnalysisRuns(runs) {
  const diagnostics = runs.flatMap((run) => run.diagnostics);
  const hasAnalyzerError = runs.some((run) => run.status === "analyzer-error");
  let status = "clean";

  if (diagnostics.length > 0) {
    status = "diagnostics";
  } else if (hasAnalyzerError) {
    status = "analyzer-error";
  }

  return {
    supported: runs.length > 0,
    status,
    analyzers: runs.map((run) => run.analyzer),
    diagnostics,
    runs,
  };
}

function incrementCount(counter, key) {
  counter[key] = (counter[key] ?? 0) + 1;
}

function updateSummaryForDiagnostic(summary, diagnostic) {
  summary.diagnosticsCount += 1;
  incrementCount(summary.severityCounts, diagnostic.severity);
  incrementCount(summary.sourceCounts, diagnostic.source);

  if (diagnostic.ruleId) {
    incrementCount(summary.ruleCounts, diagnostic.ruleId);
  }
}

function updateSummaryForEntry(summary, entry) {
  if (!entry.analysis.supported) {
    summary.unsupportedFiles += 1;
    return;
  }

  summary.supportedFiles += 1;

  for (const run of entry.analysis.runs) {
    incrementCount(summary.analyzerCounts, run.analyzer);
  }

  if (entry.analysis.status === "clean") {
    summary.cleanFiles += 1;
  }

  if (entry.analysis.status === "analyzer-error") {
    summary.analyzerErrors += 1;
  }

  if (entry.analysis.diagnostics.length > 0) {
    summary.filesWithDiagnostics += 1;
  }

  for (const diagnostic of entry.analysis.diagnostics) {
    updateSummaryForDiagnostic(summary, diagnostic);
  }
}

function buildSummary(entries) {
  const summary = {
    totalFiles: entries.length,
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

  for (const entry of entries) {
    updateSummaryForEntry(summary, entry);
  }

  return summary;
}

function createBaseReport(options, discoveredFiles) {
  return {
    scannerVersion: SCANNER_VERSION,
    generatedAt: new Date().toISOString(),
    completedAt: null,
    interrupted: false,
    root: repoRoot,
    options: {
      extensions: options.extensions,
      roots: options.roots,
      analyzers: options.analyzers,
      output: options.output,
      maxFiles: options.maxFiles,
      checkpointEvery: options.checkpointEvery,
      resume: options.resume,
      includeUnsupported: options.includeUnsupported,
    },
    excludedDirectories: [...DEFAULT_EXCLUDED_DIRS],
    discoveredFiles: discoveredFiles.length,
    summary: {
      totalFiles: 0,
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
    },
    files: [],
  };
}

function createUnsupportedEntry(file) {
  return {
    path: file.relativePath,
    extension: file.extension,
    size: file.size,
    mtimeMs: file.mtimeMs,
    fingerprint: createFingerprint(file),
    analysis: {
      supported: false,
      status: "unsupported",
      analyzers: [],
      diagnostics: [],
      runs: [],
      reason: `No enabled analyzer supports extension ${file.extension || "<none>"}.`,
    },
  };
}

function createScannedEntry(file, runs) {
  return {
    path: file.relativePath,
    extension: file.extension,
    size: file.size,
    mtimeMs: file.mtimeMs,
    fingerprint: createFingerprint(file),
    analysis: summarizeAnalysisRuns(runs),
  };
}

function createResumeIndex(report) {
  const index = new Map();

  for (const entry of report.files ?? []) {
    index.set(entry.path, entry);
  }

  return index;
}

function shouldReuseEntry(existingEntry, file) {
  return existingEntry?.fingerprint === createFingerprint(file);
}

function registerSignalHandlers(options) {
  const state = { stopRequested: false };

  const signalHandler = (signal) => {
    state.stopRequested = true;
    if (!options.quiet) {
      console.log(`Received ${signal}. Finishing current file and writing partial report.`);
    }
  };

  process.on("SIGINT", signalHandler);
  process.on("SIGTERM", signalHandler);

  return state;
}

function getTargetFiles(discoveredFiles, options) {
  return options.maxFiles ? discoveredFiles.slice(0, options.maxFiles) : discoveredFiles;
}

function getApplicableAnalyzers(file, options) {
  return options.analyzers.filter((analyzer) => ANALYZER_SUPPORT[analyzer]?.has(file.extension));
}

function createAnalysisContext(targetFiles, options) {
  return {
    eslint: prepareEslintContext(targetFiles, options),
    typeScript: prepareTypeScriptContext(targetFiles, options),
  };
}

function runAnalyzer(analyzer, file, context) {
  switch (analyzer) {
    case "eslint":
      return runEslint(file, context);
    case "typescript":
      return runTypeScript(file, context);
    case "json":
      return runJson(file);
    case "yaml":
      return runYaml(file);
    case "shell":
      return runShell(file);
    case "python":
      return runPython(file);
    default:
      throw new Error(`Unhandled analyzer: ${analyzer}`);
  }
}

function createEntryForFile(file, options, context) {
  const analyzers = getApplicableAnalyzers(file, options);

  if (analyzers.length === 0) {
    return createUnsupportedEntry(file);
  }

  const runs = analyzers.map((analyzer) => runAnalyzer(analyzer, file, context));
  return createScannedEntry(file, runs);
}

function shouldSkipUnsupportedEntry(entry, options) {
  return !options.includeUnsupported && !entry.analysis.supported;
}

function maybeWriteCheckpoint(report, outputPath, scannedCount, options) {
  if (scannedCount === 0 || scannedCount % options.checkpointEvery !== 0) {
    return;
  }

  report.summary = buildSummary(report.files);
  writeReportAtomic(outputPath, report);
}

function logEntryProgress(entry, file, report, targetFiles, options) {
  if (options.quiet) {
    return;
  }

  console.log(
    `[${report.files.length}/${targetFiles.length}] ${file.relativePath} -> ${entry.analysis.status}`,
  );
}

function scanFiles(targetFiles, report, resumeIndex, outputPath, options, signalState, context) {
  let scannedCount = 0;
  let reusedCount = 0;

  for (const file of targetFiles) {
    const existingEntry = resumeIndex.get(file.relativePath);

    if (existingEntry && shouldReuseEntry(existingEntry, file)) {
      report.files.push(existingEntry);
      reusedCount += 1;
      continue;
    }

    const entry = createEntryForFile(file, options, context);
    if (shouldSkipUnsupportedEntry(entry, options)) {
      continue;
    }

    report.files.push(entry);
    scannedCount += 1;

    logEntryProgress(entry, file, report, targetFiles, options);
    maybeWriteCheckpoint(report, outputPath, scannedCount, options);

    if (signalState.stopRequested) {
      report.interrupted = true;
      break;
    }
  }

  return { reusedCount };
}

function finalizeReport(report, existingReport, outputPath) {
  report.generatedAt = existingReport?.generatedAt ?? report.generatedAt;
  report.completedAt = new Date().toISOString();
  report.summary = buildSummary(report.files);
  writeReportAtomic(outputPath, report);
}

function logFinalSummary(report, outputPath, reusedCount, options) {
  if (options.quiet) {
    return;
  }

  console.log(`Diagnostics inventory written to ${toRepoRelative(outputPath)}`);
  console.log(
    JSON.stringify(
      {
        ...report.summary,
        reusedEntries: reusedCount,
        interrupted: report.interrupted,
      },
      null,
      2,
    ),
  );
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const discoveredFiles = listWorkspaceFiles(options);
  const outputPath = path.join(repoRoot, options.output);
  const existingReport = options.resume ? loadExistingReport(outputPath) : null;
  const resumeIndex = existingReport ? createResumeIndex(existingReport) : new Map();
  const report = createBaseReport(options, discoveredFiles);
  const signalState = registerSignalHandlers(options);
  const targetFiles = getTargetFiles(discoveredFiles, options);
  const context = createAnalysisContext(targetFiles, options);
  const { reusedCount } = scanFiles(
    targetFiles,
    report,
    resumeIndex,
    outputPath,
    options,
    signalState,
    context,
  );

  finalizeReport(report, existingReport, outputPath);
  logFinalSummary(report, outputPath, reusedCount, options);
}

main();
