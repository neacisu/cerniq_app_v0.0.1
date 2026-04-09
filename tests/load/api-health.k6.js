/**
 * Smoke load: GET /health/live (fără autentificare).
 * Rută reală: apps/api/src/routes/health.ts → prefix /health
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { scenarios } from "./k6-config.js";

const BASE = __ENV.API_BASE || "http://127.0.0.1:64010";
const PROFILE = __ENV.K6_PROFILE || "";

const healthP95 = __ENV.K6_HEALTH_P95_MS || "50";

function buildOptions() {
  const thresholds = {
    http_req_failed: ["rate<0.01"],
    [`http_req_duration{endpoint:health_live}`]: [`p(95)<${healthP95}`],
  };
  if (PROFILE === "ramp") {
    return {
      scenarios: { ramp: scenarios.ramp },
      thresholds,
    };
  }
  if (PROFILE === "ciRamp") {
    return {
      scenarios: { ci_ramp: scenarios.ciRamp },
      thresholds,
    };
  }
  if (PROFILE === "steady") {
    return {
      scenarios: { steady: scenarios.steady },
      thresholds,
    };
  }
  if (PROFILE === "spike") {
    return {
      scenarios: { spike: scenarios.spike },
      thresholds,
    };
  }
  if (PROFILE === "soak") {
    return {
      scenarios: { soak: scenarios.soak },
      thresholds,
    };
  }
  return {
    vus: Number(__ENV.K6_VUS || 5),
    duration: __ENV.K6_DURATION || "1m",
    thresholds: {
      http_req_failed: ["rate<0.01"],
      http_req_duration: ["p(95)<500"],
    },
  };
}

export const options = buildOptions();

function apiHealthScenario() {
  const res = http.get(`${BASE}/health/live`, {
    tags: { endpoint: "health_live" },
  });
  check(res, { "health live 200": (r) => r.status === 200 });
  sleep(0.3);
}

export default apiHealthScenario;
