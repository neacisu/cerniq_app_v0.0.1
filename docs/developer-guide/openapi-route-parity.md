# Paritate manifest rute ↔ OpenAPI (Swagger)

## Scop

`infra/scripts/compare_route_manifest_openapi.py` compară:

- **Manifest static** (`docs/generated/api-http-route-manifest.json`) — extras din cod (Fastify).
- **Inventar OpenAPI** (`docs/generated/api-route-inventory.json`) — generat din `app.swagger()` (vezi `apps/api/__tests__/openapi-route-inventory.test.ts`).

## Rulare

```bash
python3 infra/scripts/compare_route_manifest_openapi.py
pnpm exec python3 infra/scripts/compare_route_manifest_openapi.py --strict # eșuează dacă există gap-uri
```

## Fals pozitive frecvente

- **OpenAPI incomplet**: unele rute nu sunt înregistrate în schema Swagger dacă handler-ul nu expune schema Zod / descrieri.
- **Prefixe infrastructură**: `/metrics`, `/docs`, `/health` pot apărea doar în manifest; scriptul le poate filtra din raportul strict (vezi `infra_prefixes` în script).
- **Alias URI**: `negotiation` vs `negotiations` — ambele pot exista în manifest; OpenAPI poate lista o singură formă.
- **Parametri**: normalizăm `:id` → `{id}`; denumiri diferite ale parametrului între cod și documentație pot produce diferențe false.

## Actualizare snapshot OpenAPI

```bash
UPDATE_ROUTE_INVENTORY=1 pnpm --filter @cerniq/api exec vitest run __tests__/openapi-route-inventory.test.ts
```

După aceea, rerulează compararea pentru a reduce lista `manifestOnly`.
