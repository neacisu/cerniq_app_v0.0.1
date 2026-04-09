/**
 * Load: outreach — rute reale din apps/api/src/routes/outreach.ts (prefix /api/v1/outreach):
 * - GET   /leads
 * - PATCH /leads/:id  (tranziție stare — nu există POST .../state-transition)
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { scenarios } from "./k6-config.js";

const BASE = __ENV.API_BASE || "http://127.0.0.1:64010";
const PROFILE = __ENV.K6_PROFILE || "";

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
    "http_req_duration{endpoint:outreach_leads}": ["p(95)<500"],
    "http_req_duration{endpoint:outreach_lead_patch}": ["p(95)<300"],
  };
  if (PROFILE === "ramp") return { scenarios: { ramp: scenarios.ramp }, thresholds };
  if (PROFILE === "ciRamp") return { scenarios: { ci_ramp: scenarios.ciRamp }, thresholds };
  if (PROFILE === "steady") return { scenarios: { steady: scenarios.steady }, thresholds };
  if (PROFILE === "spike") return { scenarios: { spike: scenarios.spike }, thresholds };
  if (PROFILE === "soak") return { scenarios: { soak: scenarios.soak }, thresholds };
  return {
    vus: Number(__ENV.K6_VUS || 2),
    duration: __ENV.K6_DURATION || "2m",
    thresholds: {
      http_req_failed: ["rate<0.05"],
      http_req_duration: ["p(95)<2000"],
    },
  };
}

export const options = buildOptions();

function apiOutreachScenario(data) {
  const token = data.token;
  if (!token) {
    sleep(1);
    return;
  }

  const leads = http.get(`${BASE}/api/v1/outreach/leads?limit=20`, {
    headers: authHeaders(token),
    tags: { endpoint: "outreach_leads" },
  });
  check(leads, { "outreach leads 200": (r) => r.status === 200 });

  let leadId = null;
  let currentState = null;
  try {
    const parsed = JSON.parse(leads.body);
    const rows = parsed.data;
    if (Array.isArray(rows) && rows.length) {
      const cold = rows.find((r) => r.currentState === "COLD");
      const pick = cold || rows[0];
      leadId = pick.id;
      currentState = pick.currentState;
    }
  } catch {
    /* ignore */
  }

  if (leadId && currentState === "COLD") {
    const patch = http.patch(
      `${BASE}/api/v1/outreach/leads/${leadId}`,
      JSON.stringify({ currentState: "CONTACTED_WA" }),
      {
        headers: authHeaders(token),
        tags: { endpoint: "outreach_lead_patch" },
      },
    );
    check(patch, {
      "lead patch 200 sau 400 (curse paralele)": (r) => r.status === 200 || r.status === 400,
    });
  }

  sleep(0.3);
}

export default apiOutreachScenario;
