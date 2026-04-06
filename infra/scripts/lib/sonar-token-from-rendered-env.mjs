/**
 * Extrage SONAR_TOKEN din conținut tip fișier randat de OpenBao Agent (KEY=value pe linii).
 * Ghilimele înconjurătoare pe valoare sunt eliminate (fără regex global — compatibil Sonar S7781).
 *
 * @param {string} content
 * @returns {string | null}
 */
export function extractSonarTokenFromRenderedEnvContent(content) {
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const eq = line.indexOf("=");
    if (eq <= 0) {
      continue;
    }
    const key = line.slice(0, eq).trim();
    if (key !== "SONAR_TOKEN") {
      continue;
    }
    return stripSurroundingQuotes(line.slice(eq + 1).trim());
  }
  return null;
}

/**
 * @param {string} value
 * @returns {string}
 */
function stripSurroundingQuotes(value) {
  if (value.length < 2) {
    return value;
  }
  const open = value[0];
  const close = value.at(-1);
  const isDouble = open === '"' && close === '"';
  const isSingle = open === "'" && close === "'";
  if (isDouble || isSingle) {
    return value.slice(1, -1);
  }
  return value;
}
