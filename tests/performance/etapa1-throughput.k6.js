import http from "k6/http";
import { check, sleep } from "k6";

const API_BASE = __ENV.API_BASE_URL || "http://localhost:64010";
const ADMIN_API_BASE = __ENV.ADMIN_API_BASE_URL || API_BASE;
const TOKEN = __ENV.AUTH_TOKEN || "";
const ADMIN_TOKEN = __ENV.ADMIN_AUTH_TOKEN || TOKEN;

export const options = {
  scenarios: {
    silver_enrich_pipeline: {
      executor: "constant-arrival-rate",
      exec: "silverEnrich",
      rate: 120,
      timeUnit: "1m",
      duration: "5m",
      preAllocatedVUs: 20,
      maxVUs: 60,
    },
    silver_list: {
      executor: "constant-vus",
      exec: "silverList",
      vus: 10,
      duration: "5m",
    },
    approvals_list: {
      executor: "constant-vus",
      exec: "approvalsList",
      vus: 5,
      duration: "5m",
    },
    monitoring_live: {
      executor: "constant-vus",
      exec: "monitoringLive",
      vus: 3,
      duration: "5m",
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

const adminHeaders = ADMIN_TOKEN
  ? {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    }
  : { "Content-Type": "application/json" };

export function silverEnrich() {
  const payload = JSON.stringify({
    force: true,
    sources: ["anaf", "termene", "onrc"],
  });

  const res = http.post(
    `${API_BASE}/api/v1/silver/companies/00000000-0000-0000-0000-000000000000/enrich`,
    payload,
    {
      headers,
      tags: { endpoint: "silver_enrich" },
    },
  );

  check(res, {
    "status is accepted/ok/not-found": (r) => [200, 202, 404].includes(r.status),
  });

  sleep(0.1);
}

export function silverList() {
  const res = http.get(`${API_BASE}/api/v1/silver/companies?limit=25&offset=0`, {
    headers,
    tags: { endpoint: "silver_list" },
  });

  check(res, {
    "silver list reachable": (r) => [200, 401, 403].includes(r.status),
  });

  sleep(0.2);
}

export function approvalsList() {
  const res = http.get(`${API_BASE}/api/v1/enrichment/approvals?limit=25`, {
    headers,
    tags: { endpoint: "approvals_list" },
  });

  check(res, {
    "approvals list reachable": (r) => [200, 401, 403].includes(r.status),
  });

  sleep(0.2);
}

export function monitoringLive() {
  const res = http.get(`${ADMIN_API_BASE}/api/admin/live`, {
    headers: adminHeaders,
    tags: { endpoint: "admin_live" },
  });

  check(res, {
    "admin live reachable": (r) => [200, 401, 403].includes(r.status),
  });

  sleep(0.5);
}
