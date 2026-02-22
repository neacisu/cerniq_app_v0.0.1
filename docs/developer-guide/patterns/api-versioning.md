# API Versioning Strategy

**Priority:** MEDIUM | **Version:** 1.0 | **February 2026**

## Overview

This pattern defines API versioning: URL prefix versioning (/v1/), backward compatibility, deprecation headers, and migration guides.

---

## 1. URL Prefix Versioning

**Format:** `/v1/`, `/v2/`, etc.

```
https://api.cerniq.app/v1/leads
https://api.cerniq.app/v1/leads/123
```

- **Pros:** Clear, cacheable, easy to route
- **Cons:** URL duplication when maintaining multiple versions

**No** query param (`?version=1`) or header versioning for public API.

---

## 2. Version in Route Registration

```typescript
fastify.register(leadsRoutes, { prefix: "/v1/leads" });
fastify.register(leadsRoutesV2, { prefix: "/v2/leads" });
```

Or mount all v1 under `/v1`:

```typescript
fastify.register(v1Routes, { prefix: "/v1" });
```

---

## 3. Backward Compatibility

- **Additive changes:** New fields, new endpoints — no new version
- **Breaking changes:** Removed fields, changed types, changed behavior — new version

| Change Type         | Version Bump?            |
| ------------------- | ------------------------ |
| Add optional field  | No                       |
| Add required field  | Yes (v2)                 |
| Remove field        | Yes                      |
| Change field type   | Yes                      |
| Rename endpoint     | Yes                      |
| Change error format | Yes (if client-breaking) |

---

## 4. Deprecation Headers

When announcing deprecation:

```http
HTTP/1.1 200 OK
X-API-Deprecated: true
X-API-Sunset: 2026-06-01
X-API-Version-Supported: v1, v2
Link: </v2/leads>; rel="successor"
```

- `X-API-Deprecated`: Endpoint is deprecated
- `X-API-Sunset`: Date when v1 will be removed
- `Link`: Point to replacement

---

## 5. Migration Guides

Document migrations in `docs/api/migration-v1-to-v2.md`:

- List breaking changes
- Provide before/after examples
- Recommend migration timeline
- Include code samples for common clients

---

## 6. Default Version

- **Unversioned requests:** Redirect to `/v1` or return 400 with `Accept` guidance
- **Recommendation:** Require explicit version; no default to avoid surprises

---

## 7. Romanian Context

- **e-Factura API:** May have separate versioning (ANAF schema versions)
- **CUI validation:** Keep validation logic stable; version API wrapper if needed

---

## 8. Version Negotiation (Optional)

For internal or partner APIs, `Accept` header can request specific version:

```http
Accept: application/vnd.cerniq.v2+json
```

Parse and route to v2. For public REST API, URL prefix is preferred.

---

## 9. OpenAPI / Swagger

- Maintain separate OpenAPI spec per version: `openapi-v1.yaml`, `openapi-v2.yaml`
- Or single spec with `servers` and path prefixes
- Document deprecated endpoints with `deprecated: true`

---

## 10. Testing Strategy

- **Contract tests:** Ensure v1 responses match schema for existing clients
- **Integration tests:** Run against /v1 and /v2 when both active
- **Deprecation tests:** Verify headers present on deprecated endpoints

---

## 11. Lifecycle Timeline

| Phase       | Duration   | Action                             |
| ----------- | ---------- | ---------------------------------- |
| Deprecation | 6+ months  | Add headers, announce              |
| Sunset      | 1–3 months | Final reminders, migration support |
| Removal     | —          | Remove v1, redirect to v2 or 410   |

---

## 12. Related Documents

- `docs/api/openapi-etapa1.yaml` — OpenAPI spec
- `external-api-integration.md` — Error format consistency

---

## Checklist

- [ ] URL prefix /v1/, /v2/
- [ ] Backward compatibility rules
- [ ] Deprecation headers when retiring
- [ ] Migration guides for breaking changes
- [ ] No silent breaking changes
- [ ] OpenAPI per version
- [ ] Lifecycle timeline documented
