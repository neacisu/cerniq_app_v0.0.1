import http from "k6/http";
import { check, sleep } from "k6";

const API_BASE = __ENV.API_BASE_URL || "http://localhost:3000";
const TOKEN = __ENV.AUTH_TOKEN || "";

export const options = {
  scenarios: {
    import_pipeline_1000_per_minute: {
      executor: "constant-arrival-rate",
      rate: 1000,
      timeUnit: "1m",
      duration: "10m",
      preAllocatedVUs: 100,
      maxVUs: 300,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1200", "p(99)<2500"],
  },
};

const headers = TOKEN
  ? {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    }
  : { "Content-Type": "application/json" };

export default function () {
  const payload = JSON.stringify({
    force: true,
    sources: ["anaf", "termene", "onrc"],
  });

  const res = http.post(`${API_BASE}/api/v1/silver/companies/00000000-0000-0000-0000-000000000000/enrich`, payload, {
    headers,
    tags: { endpoint: "silver_enrich" },
  });

  check(res, {
    "status is accepted/ok/not-found": (r) => [200, 202, 404].includes(r.status),
  });

  sleep(0.1);
}
