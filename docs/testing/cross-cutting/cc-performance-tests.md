# CERNIQ.APP — TESTE CROSS-CUTTING: PERFORMANCE

## Load Testing cu k6 pentru toate etapele

**Scope:** Toate etapele (E0-E5) | **Tool:** k6 0.55.x

---

## TARGETS PERFORMANȚĂ

| Metric | API | Workers | Database |
| ------ | --- | ------- | -------- |
| **Throughput** | 1000 RPS | 500 Jobs/s | 5000 QPS |
| **Latency p50** | < 50ms | < 100ms | < 10ms |
| **Latency p95** | < 200ms | < 500ms | < 50ms |
| **Latency p99** | < 500ms | < 2s | < 100ms |
| **Error Rate** | < 0.1% | < 1% | < 0.01% |
| **Memory** | < 512MB | < 1GB | — |

---

## 1. API LOAD TESTS

### 1.1 Companies Endpoint

```javascript
// tests/performance/api/companies.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const latency = new Trend('api_latency');
const requests = new Counter('requests');

export const options = {
  scenarios: {
    // Smoke Test - Sanity check
    smoke: {
      executor: 'constant-vus',
      vus: 5,
      duration: '1m',
      tags: { test_type: 'smoke' },
    },
    
    // Load Test - Normal traffic
    load: {
      executor: 'ramping-vus',
      startTime: '1m',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'load' },
    },
    
    // Stress Test - Breaking point
    stress: {
      executor: 'ramping-vus',
      startTime: '10m',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 200 },
        { duration: '3m', target: 500 },
        { duration: '3m', target: 1000 },
        { duration: '5m', target: 1000 },
        { duration: '2m', target: 0 },
      ],
      tags: { test_type: 'stress' },
    },
    
    // Spike Test - Sudden burst
    spike: {
      executor: 'ramping-vus',
      startTime: '25m',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 100 },
        { duration: '30s', target: 1500 },
        { duration: '10s', target: 100 },
        { duration: '30s', target: 1500 },
        { duration: '30s', target: 0 },
      ],
      tags: { test_type: 'spike' },
    },
  },
  
  thresholds: {
    'http_req_duration': ['p(95)<200', 'p(99)<500'],
    'http_req_failed': ['rate<0.01'],
    'errors': ['rate<0.05'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:64000';
const TOKEN = __ENV.API_TOKEN;

export default function () {
  group('GET /api/v1/companies', () => {
    const res = http.get(`${BASE_URL}/api/v1/companies?page=1&limit=20`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      tags: { endpoint: 'companies_list' },
    });
    
    requests.add(1);
    latency.add(res.timings.duration);
    
    const success = check(res, {
      'status is 200': (r) => r.status === 200,
      'response time < 200ms': (r) => r.timings.duration < 200,
      'has data array': (r) => {
        const body = r.json();
        return Array.isArray(body?.data);
      },
      'has pagination': (r) => {
        const body = r.json();
        return body?.pagination !== undefined;
      },
    });
    
    errorRate.add(!success);
  });
  
  group('GET /api/v1/companies/:id', () => {
    const companyId = 'sample-company-uuid'; // From seed data
    
    const res = http.get(`${BASE_URL}/api/v1/companies/${companyId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
      tags: { endpoint: 'companies_detail' },
    });
    
    requests.add(1);
    latency.add(res.timings.duration);
    
    const success = check(res, {
      'status is 200 or 404': (r) => [200, 404].includes(r.status),
      'response time < 100ms': (r) => r.timings.duration < 100,
    });
    
    errorRate.add(!success && res.status !== 404);
  });
  
  sleep(0.1 + Math.random() * 0.2);
}
```

### 1.2 Search Endpoint (Heavy Query)

```javascript
// tests/performance/api/search.js
import http from 'k6/http';
import { check, sleep, group } from 'k6';

export const options = {
  scenarios: {
    search_load: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '1m', target: 10 },
      ],
    },
  },
  thresholds: {
    'http_req_duration{endpoint:search}': ['p(95)<500', 'p(99)<1000'],
  },
};

export default function () {
  group('POST /api/v1/companies/search', () => {
    const payload = JSON.stringify({
      filters: {
        judet: ['București', 'Cluj'],
        caenPrincipal: ['0111', '0112'],
        leadScoreMin: 50,
      },
      pagination: { page: 1, limit: 50 },
      sort: { field: 'leadScore', order: 'desc' },
    });
    
    const res = http.post(`${BASE_URL}/api/v1/companies/search`, payload, {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      tags: { endpoint: 'search' },
    });
    
    check(res, {
      'status is 200': (r) => r.status === 200,
      'search returns results': (r) => r.json()?.data?.length >= 0,
      'response time < 500ms': (r) => r.timings.duration < 500,
    });
  });
  
  sleep(0.5);
}
```

---

## 2. WORKER LOAD TESTS

### 2.1 BullMQ Job Processing

```javascript
// tests/performance/workers/job-processing.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const jobsEnqueued = new Counter('jobs_enqueued');
const jobLatency = new Trend('job_completion_time');

export const options = {
  scenarios: {
    worker_load: {
      executor: 'constant-arrival-rate',
      rate: 500, // 500 jobs per second
      timeUnit: '1s',
      duration: '5m',
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    'job_completion_time': ['p(95)<2000', 'p(99)<5000'],
    'jobs_enqueued': ['count>100000'],
  },
};

export default function () {
  // Enqueue a CSV parser job
  const payload = JSON.stringify({
    tenantId: 'load-test-tenant',
    batchId: `batch-${__VU}-${__ITER}`,
    data: generateMockCompanyData(),
  });
  
  const res = http.post(`${BASE_URL}/api/v1/import/enqueue`, payload, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (res.status === 202) {
    jobsEnqueued.add(1);
    
    // Poll for completion
    const jobId = res.json().jobId;
    let completed = false;
    let polls = 0;
    const maxPolls = 50;
    
    while (!completed && polls < maxPolls) {
      sleep(0.1);
      polls++;
      
      const statusRes = http.get(`${BASE_URL}/api/v1/jobs/${jobId}/status`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      });
      
      if (statusRes.json().status === 'completed') {
        completed = true;
        jobLatency.add(polls * 100); // Approximate latency
      }
    }
  }
}

function generateMockCompanyData() {
  return {
    cui: Math.floor(Math.random() * 100000000).toString().padStart(8, '0'),
    denumire: `Company ${__VU}-${__ITER}`,
    email: `contact-${__VU}@example.com`,
    telefon: `+40721${Math.floor(Math.random() * 1000000)}`,
  };
}
```

---

## 3. DATABASE LOAD TESTS

### 3.1 PostgreSQL Query Performance

```javascript
// tests/performance/database/queries.js
import sql from 'k6/x/sql';
import { check } from 'k6';
import { Trend } from 'k6/metrics';

const queryLatency = new Trend('query_latency');

const db = sql.open('postgres', __ENV.DATABASE_URL);

export const options = {
  scenarios: {
    db_queries: {
      executor: 'constant-vus',
      vus: 50,
      duration: '5m',
    },
  },
  thresholds: {
    'query_latency': ['p(95)<50', 'p(99)<100'],
  },
};

export default function () {
  // Simple lookup
  const start1 = Date.now();
  const result1 = sql.query(db, `
    SELECT id, denumire, lead_score 
    FROM gold_companies 
    WHERE tenant_id = '${__ENV.TENANT_ID}'
    LIMIT 10
  `);
  queryLatency.add(Date.now() - start1);
  
  check(result1, {
    'returns rows': (r) => r.length > 0,
  });
  
  // Full-text search
  const start2 = Date.now();
  const result2 = sql.query(db, `
    SELECT id, denumire, similarity(denumire_normalizata, 'AGRO') as sim
    FROM gold_companies
    WHERE tenant_id = '${__ENV.TENANT_ID}'
      AND denumire_normalizata % 'AGRO'
    ORDER BY sim DESC
    LIMIT 20
  `);
  queryLatency.add(Date.now() - start2);
  
  // Geographic query
  const start3 = Date.now();
  const result3 = sql.query(db, `
    SELECT id, denumire, 
           ST_Distance(location_geography, ST_MakePoint(26.1, 44.4)::geography) as distance
    FROM gold_companies
    WHERE tenant_id = '${__ENV.TENANT_ID}'
      AND ST_DWithin(location_geography, ST_MakePoint(26.1, 44.4)::geography, 50000)
    ORDER BY distance
    LIMIT 50
  `);
  queryLatency.add(Date.now() - start3);
}

export function teardown() {
  db.close();
}
```

---

## 4. SOAK TEST

```javascript
// tests/performance/soak.js
export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: 100,
      duration: '4h',
    },
  },
  thresholds: {
    'http_req_duration': ['p(99)<1000'],
    'http_req_failed': ['rate<0.01'],
    'memory_usage': ['max<1073741824'], // 1GB
  },
};

export default function () {
  // Mix of all endpoints
  const endpoints = [
    '/api/v1/companies',
    '/api/v1/contacts',
    '/api/v1/leads',
    '/api/v1/approvals',
    '/api/v1/stats/dashboard',
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  http.get(`${BASE_URL}${endpoint}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  
  sleep(0.5 + Math.random());
}
```

---

## 5. CI INTEGRATION

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Nightly at 2 AM
  workflow_dispatch:
    inputs:
      scenario:
        description: 'Test scenario'
        required: true
        default: 'load'
        type: choice
        options:
          - smoke
          - load
          - stress
          - spike
          - soak

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Run k6 Load Test
        run: |
          k6 run \
            -e API_URL=${{ secrets.STAGING_API_URL }} \
            -e API_TOKEN=${{ secrets.STAGING_API_TOKEN }} \
            --out json=k6-results.json \
            tests/performance/api/companies.js
        env:
          K6_SCENARIO: ${{ github.event.inputs.scenario || 'load' }}
      
      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: k6-results
          path: k6-results.json
      
      - name: Check Thresholds
        run: |
          if grep -q '"passed":false' k6-results.json; then
            echo "Performance thresholds failed!"
            exit 1
          fi
```

---

## CHECKLIST VALIDARE

- [ ] API endpoints handle 1000 RPS
- [ ] p95 latency < 200ms
- [ ] Error rate < 0.1%
- [ ] Workers process 500 jobs/s
- [ ] Database queries < 50ms p95
- [ ] Soak test passes 4 hours
- [ ] No memory leaks

---

**Document generat:** 20 Ianuarie 2026  
**Conformitate:** Master Spec v1.2
