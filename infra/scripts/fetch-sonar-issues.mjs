import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractSonarTokenFromRenderedEnvContent } from "./lib/sonar-token-from-rendered-env.mjs";

const repoRoot = process.cwd();
const DEFAULT_OUTPUT = "test-results/diagnostics/sonar-issues.json";
const DEFAULT_PAGE_SIZE = 500;

function parsePageSizeArg(rawArg) {
  const value = Number.parseInt(rawArg, 10);
  if (!Number.isInteger(value) || value <= 0 || value > DEFAULT_PAGE_SIZE) {
    throw new Error(`Invalid --page-size value: --page-size=${rawArg}`);
  }

  return value;
}

function parsePropertiesFile(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  const properties = {};
  const content = readFileSync(filePath, "utf-8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    properties[key] = value;
  }

  return properties;
}

/**
 * Încarcă SONAR_TOKEN din fișierul randat de OpenBao Agent (tmpfs / runtime-secrets).
 * Nu suprascrie dacă SONAR_TOKEN e deja în mediu.
 */
function loadSonarTokenFromOpenBaoRenderedEnv() {
  if (process.env.SONAR_TOKEN || process.env.SONARCLOUD_TOKEN || process.env.SONARQUBE_TOKEN) {
    return;
  }

  const candidates = [
    process.env.CERNIQ_OPENBAO_SONAR_ENV_FILE,
    "/opt/cerniq/runtime-secrets/ci/sonar.env",
    path.join(repoRoot, ".cerniq/runtime-secrets/ci/sonar.env"),
  ].filter(Boolean);

  for (const filePath of candidates) {
    if (!existsSync(filePath)) {
      continue;
    }
    const content = readFileSync(filePath, "utf-8");
    const token = extractSonarTokenFromRenderedEnvContent(content);
    if (token) {
      process.env.SONAR_TOKEN = token;
      return;
    }
  }
}

function loadConnectedModeConfig(filePath) {
  if (!existsSync(filePath)) {
    return {};
  }

  return JSON.parse(readFileSync(filePath, "utf-8"));
}

function applyParseArg(arg, options) {
  if (arg.startsWith("--host-url=")) {
    options.hostUrl = arg.slice("--host-url=".length).trim();
    return true;
  }

  if (arg.startsWith("--organization=")) {
    options.organization = arg.slice("--organization=".length).trim();
    return true;
  }

  if (arg.startsWith("--project-key=")) {
    options.projectKey = arg.slice("--project-key=".length).trim();
    return true;
  }

  if (arg.startsWith("--output=")) {
    options.output = arg.slice("--output=".length).trim();
    return true;
  }

  if (arg.startsWith("--page-size=")) {
    options.pageSize = parsePageSizeArg(arg.slice("--page-size=".length));
    return true;
  }

  return false;
}

function parseArgs(argv) {
  const defaults = resolveDefaults();
  const options = {
    hostUrl: defaults.hostUrl,
    organization: defaults.organization,
    projectKey: defaults.projectKey,
    output: DEFAULT_OUTPUT,
    pageSize: DEFAULT_PAGE_SIZE,
  };

  for (const arg of argv) {
    if (arg === "--help") {
      printHelp();
      process.exit(0);
    }

    if (applyParseArg(arg, options)) {
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.hostUrl || !options.projectKey) {
    throw new Error("Could not resolve Sonar host URL and project key from configuration.");
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node ./infra/scripts/fetch-sonar-issues.mjs [options]

Options:
  --host-url=https://sonarcloud.io
  --organization=neacisu
  --project-key=neacisu_cerniq_app_v0.0.1
  --output=test-results/diagnostics/sonar-issues.json
  --page-size=500
  --help
`);
}

function resolveDefaults() {
  const properties = parsePropertiesFile(path.join(repoRoot, "sonar-project.properties"));
  const connectedMode = loadConnectedModeConfig(
    path.join(repoRoot, ".sonarlint", "connectedMode.json"),
  );

  return {
    hostUrl: properties["sonar.host.url"] ?? "https://sonarcloud.io",
    organization: connectedMode.sonarCloudOrganization ?? properties["sonar.organization"] ?? null,
    projectKey: connectedMode.projectKey ?? properties["sonar.projectKey"] ?? null,
  };
}

function getAuthHeader() {
  const token =
    process.env.SONAR_TOKEN ?? process.env.SONARCLOUD_TOKEN ?? process.env.SONARQUBE_TOKEN ?? null;

  if (!token) {
    return null;
  }

  const credentials = `${token}:`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

function buildIssuesUrl(options, page) {
  const url = new URL("/api/issues/search", options.hostUrl);
  url.searchParams.set("componentKeys", options.projectKey);
  url.searchParams.set("ps", String(options.pageSize));
  url.searchParams.set("p", String(page));
  url.searchParams.set("resolved", "false");
  url.searchParams.set("additionalFields", "_all");

  if (options.organization) {
    url.searchParams.set("organization", options.organization);
  }

  return url;
}

function toRepoRelativePath(componentPath) {
  if (!componentPath) {
    return null;
  }

  const normalized = componentPath.replaceAll("\\", "/");
  const marker = `${repoRoot.replaceAll("\\", "/")}/`;

  if (normalized.startsWith(marker)) {
    return normalized.slice(marker.length);
  }

  if (normalized.startsWith("file:")) {
    const pathname = new URL(normalized).pathname;
    const normalizedPathname = pathname.replaceAll("\\", "/");
    if (normalizedPathname.startsWith(marker)) {
      return normalizedPathname.slice(marker.length);
    }
  }

  const sourceIndex = normalized.indexOf(":");
  if (sourceIndex >= 0) {
    const candidate = normalized.slice(sourceIndex + 1);
    if (candidate.includes("/")) {
      return candidate.replace(/^\/+/, "");
    }
  }

  return normalized.replace(/^\/+/, "");
}

async function fetchIssues(options) {
  const issues = [];
  const authHeader = getAuthHeader();
  let page = 1;
  let total = null;

  while (total === null || issues.length < total) {
    const url = buildIssuesUrl(options, page);
    const response = await fetch(url, {
      headers: authHeader ? { Authorization: authHeader } : {},
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `Sonar issue fetch failed (${response.status}): ${body.trim() || response.statusText}`,
      );
    }

    const payload = await response.json();
    const batch = Array.isArray(payload.issues) ? payload.issues : [];
    total = Number.isInteger(payload.total) ? payload.total : batch.length;
    issues.push(...batch);

    if (batch.length === 0) {
      break;
    }

    page += 1;
  }

  return issues;
}

function normalizeIssue(issue) {
  const relativePath = toRepoRelativePath(issue.component ?? issue.project ?? null);
  const textRange = issue.textRange ?? {};
  const severity =
    issue.severity === "BLOCKER" || issue.severity === "CRITICAL" || issue.severity === "MAJOR"
      ? "error"
      : "warning";

  return {
    key: issue.key ?? null,
    rule: issue.rule ?? null,
    severity,
    type: issue.type ?? null,
    status: issue.status ?? null,
    message: issue.message ?? "Unknown Sonar issue",
    path: relativePath,
    line: textRange.startLine ?? issue.line ?? 1,
    column: textRange.startOffset ?? 1,
    endLine: textRange.endLine ?? null,
    endColumn: textRange.endOffset ?? null,
    effort: issue.effort ?? null,
    component: issue.component ?? null,
  };
}

function writeOutput(outputPath, payload) {
  mkdirSync(path.dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);
}

async function main() {
  loadSonarTokenFromOpenBaoRenderedEnv();
  const options = parseArgs(process.argv.slice(2));
  const outputPath = path.isAbsolute(options.output)
    ? options.output
    : path.join(repoRoot, options.output);
  const rawIssues = await fetchIssues(options);
  const normalizedIssues = rawIssues.map(normalizeIssue).filter((issue) => issue.path);

  writeOutput(outputPath, {
    generatedAt: new Date().toISOString(),
    hostUrl: options.hostUrl,
    organization: options.organization,
    projectKey: options.projectKey,
    total: normalizedIssues.length,
    issues: normalizedIssues,
  });

  console.log(
    JSON.stringify(
      {
        output: path.relative(repoRoot, outputPath),
        total: normalizedIssues.length,
      },
      null,
      2,
    ),
  );
}

await main();
