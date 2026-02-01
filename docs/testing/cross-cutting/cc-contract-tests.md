# CERNIQ.APP — TESTE CROSS-CUTTING: CONTRACT TESTS

## API Contract Testing cu Pact

**Scope:** API boundaries | **Tool:** Pact 14.x

---

## CONTRACTS MATRIX

| Consumer | Provider | Contract |
| -------- | -------- | -------- |
| WebAdmin | CompaniesAPI | companies.pact.json |
| WebAdmin | ContactsAPI | contacts.pact.json |
| WebAdmin | ApprovalsAPI | approvals.pact.json |
| Workers | EnrichmentAPI | enrichment.pact.json |
| External | WebhooksAPI | webhooks.pact.json |

---

## CONSUMER TESTS

```typescript
// tests/contract/consumer/companies.pact.ts
import { PactV4, MatchersV3 } from '@pact-foundation/pact';

const { like, eachLike, uuid, iso8601DateTime } = MatchersV3;

const provider = new PactV4({
  consumer: 'WebAdminApp',
  provider: 'CompaniesAPI',
  dir: './pacts',
});

describe('Companies API Contract', () => {
  
  it('GET /companies - list with pagination', async () => {
    await provider
      .addInteraction()
      .given('companies exist')
      .uponReceiving('a request for companies list')
      .withRequest('GET', '/api/v1/companies', (builder) => {
        builder
          .query({ page: '1', limit: '10' })
          .headers({ Authorization: like('Bearer token') });
      })
      .willRespondWith(200, (builder) => {
        builder
          .headers({ 'Content-Type': 'application/json' })
          .jsonBody({
            data: eachLike({
              id: uuid(),
              cui: like('12345678'),
              denumire: like('Company SRL'),
              leadScore: like(50),
              createdAt: iso8601DateTime(),
            }),
            pagination: {
              page: like(1),
              limit: like(10),
              total: like(100),
            },
          });
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/v1/companies?page=1&limit=10`,
          { headers: { Authorization: 'Bearer test' } }
        );
        
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.data).toBeDefined();
        expect(data.pagination).toBeDefined();
      });
  });
  
  it('POST /companies - create', async () => {
    await provider
      .addInteraction()
      .given('tenant exists')
      .uponReceiving('a request to create company')
      .withRequest('POST', '/api/v1/companies', (builder) => {
        builder
          .headers({
            Authorization: like('Bearer token'),
            'Content-Type': 'application/json',
          })
          .jsonBody({
            cui: like('12345678'),
            denumire: like('New Company'),
          });
      })
      .willRespondWith(201, (builder) => {
        builder.jsonBody({
          id: uuid(),
          cui: like('12345678'),
          denumire: like('New Company'),
          createdAt: iso8601DateTime(),
        });
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(
          `${mockServer.url}/api/v1/companies`,
          {
            method: 'POST',
            headers: {
              Authorization: 'Bearer test',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cui: '12345678',
              denumire: 'New Company',
            }),
          }
        );
        
        expect(response.status).toBe(201);
      });
  });
});
```

---

## PROVIDER VERIFICATION

```typescript
// tests/contract/provider/verify.ts
import { Verifier } from '@pact-foundation/pact';

describe('Provider Verification', () => {
  it('validates consumer contracts', async () => {
    await new Verifier({
      providerBaseUrl: 'http://localhost:64000',
      pactUrls: [
        './pacts/WebAdminApp-CompaniesAPI.json',
      ],
      stateHandlers: {
        'companies exist': async () => {
          await seedCompanies(10);
        },
        'tenant exists': async () => {
          await createTenant('test-tenant');
        },
      },
    }).verifyProvider();
  });
});
```

---

## CI INTEGRATION

```yaml
# .github/workflows/contract-tests.yml
jobs:
  consumer-tests:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:contract:consumer
      - uses: pactflow/actions/publish-pact-files@v1
        with:
          pactfiles: ./pacts/*.json

  provider-verification:
    needs: consumer-tests
    runs-on: ubuntu-latest
    steps:
      - run: pnpm test:contract:provider
```

---

**Document generat:** 20 Ianuarie 2026
