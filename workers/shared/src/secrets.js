import fs from "node:fs";
const DEFAULT_SECRETS_PATH = "/secrets/workers.env";
const SENSITIVE_KEYS = ["REDIS_URL", "REDIS_PASSWORD", "REDIS_PREFIX", "BULLMQ_PREFIX"];
export function loadSecretsFromFile(forceOverwrite = false, path = DEFAULT_SECRETS_PATH) {
    if (!fs.existsSync(path))
        return;
    const content = fs.readFileSync(path, "utf-8");
    for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#"))
            continue;
        const eq = trimmed.indexOf("=");
        if (eq < 0)
            continue;
        const key = trimmed.slice(0, eq).trim();
        const value = trimmed.slice(eq + 1).trim();
        const isSensitive = SENSITIVE_KEYS.includes(key);
        if (forceOverwrite && isSensitive) {
            process.env[key] = value;
            continue;
        }
        if (!process.env[key])
            process.env[key] = value;
    }
}
