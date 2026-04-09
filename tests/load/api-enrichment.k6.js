/**
 * Load: flux enrichment (gold + import) — rute reale din apps/api:
 * - GET  /api/v1/gold/companies (silver-gold.ts, prefix /api/v1)
 * - GET  /api/v1/gold/companies/:id
 * - POST /api/v1/imports (multipart CSV — necesită rol operator)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { scenarios } from "./k6-config.js";

const BASE = __ENV.API_BASE || "http://127.0.0.1:64010";
const PROFILE = __ENV.K6_PROFILE || "";
const INCLUDE_IMPORT = __ENV.K6_INCLUDE_IMPORT !== "0";

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export function setup() {
  const token = __ENV.K6_BEARER_TOKEN || "";
  const email = __ENV.K6_LOGIN_EMAIL || "";
  const password = __ENV.K6_LOGIN_PASSWORD || "";
  if (token) return { token };
  if (!email || !password) return { token: "" };
  const res = http.post(
    `${BASE}/api/v1/auth/login`,
    JSON.stringify({ email, password }),
    { headers: { "Content-Type": "application/json" } },
  );
  if (res.status !== 200) return { token: "" };
  try {
    const body = JSON.parse(res.body);
    return { token: body.data?.token || "" };
  } catch {
    return { token: "" };
  }
}

function buildOptions() {
  const thresholds = {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{endpoint:gold_list}": ["p(95)<500"],
    "http_req_duration{endpoint:gold_detail}": ["p(95)<200"],
    "http_req_duration{endpoint:import_post}": ["p(95)<2000"],
  };
  if (PROFILE === "ramp") return { scenarios: { ramp: scenarios.ramp }, thresholds };
  if (PROFILE === "ciRamp") return { scenarios: { ci_ramp: scenarios.ciRamp }, thresholds };
  if (PROFILE === "steady") return { scenarios: { steady: scenarios.steady }, thresholds };
  if (PROFILE === "spike") return { scenarios: { spike: scenarios.spike }, thresholds };
  if (PROFILE === "soak") return { scenarios: { soak: scenarios.soak }, thresholds };
  return {
    vus: Number(__ENV.K6_VUS || 3),
    duration: __ENV.K6_DURATION || "2m",
    thresholds: {
      http_req_failed: ["rate<0.05"],
      http_req_duration: ["p(95)<2000"],
    },
  };
}

export const options = buildOptions();

function apiEnrichmentScenario(data) {
  const token = data.token;
  if (!token) {
    sleep(1);
    return;
  }

  const list = http.get(`${BASE}/api/v1/gold/companies?limit=20`, {
    headers: authHeaders(token),
    tags: { endpoint: "gold_list" },
  });
  check(list, { "gold list 200": (r) => r.status === 200 });

  let companyId = null;
  try {
    const parsed = JSON.parse(list.body);
    if (parsed.data?.length) companyId = parsed.data[0].id;
  } catch {
    /* ignore */
  }

  if (companyId) {
    const detail = http.get(`${BASE}/api/v1/gold/companies/${companyId}`, {
      headers: authHeaders(token),
      tags: { endpoint: "gold_detail" },
    });
    check(detail, { "gold detail 200": (r) => r.status === 200 });
  }

  if (INCLUDE_IMPORT) {
    const csv = "name,cui\nk6-load,RO12345678\n";
    const imp = http.post(
      `${BASE}/api/v1/imports`,
      { file: http.file(csv, "k6-load.csv", "text/csv") },
      {
        headers: { Authorization: `Bearer ${token}` },
        tags: { endpoint: "import_post" },
      },
    );
    check(imp, {
      "import 201 sau 403 (fără operator)": (r) =>
        r.status === 201 || r.status === 403 || r.status === 400,
    });
  }

  sleep(0.3);
}

export default apiEnrichmentScenario;
