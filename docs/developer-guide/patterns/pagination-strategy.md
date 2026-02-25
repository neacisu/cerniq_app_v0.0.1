# API Pagination Strategy

**Priority:** HIGH | **Version:** 1.0 | **February 2026**

## Overview

This pattern defines API pagination: cursor-based (recommended), offset fallback, Drizzle query helpers, response envelope, and frontend integration with @refinedev/react-table.

---

## 1. Cursor-Based Pagination (Recommended)

Better for large datasets; avoids offset performance issues.

**Request:**

```http
GET /v1/leads?cursor=eyJsYXN0SWQiOjEwMH0&limit=20
```

**Response:**

```json
{
  "data": [...],
  "meta": {
    "cursor": "eyJsYXN0SWQiOjIwMH0",
    "hasMore": true,
    "total": 1500
  }
}
```

**Cursor:** Opaque string (base64 JSON of `{ lastId: number }` or composite key). Client passes as-is; never parse or modify.

---

## 2. Offset Pagination (Fallback)

For simple cases or when total count is needed:

```http
GET /v1/leads?page=2&limit=20
```

```json
{
  "data": [...],
  "meta": {
    "page": 2,
    "limit": 20,
    "total": 1500,
    "totalPages": 75
  }
}
```

**Warning:** `OFFSET` degrades on large tables. Prefer cursor for lists > 10k rows.

---

## 3. Drizzle Query Helpers

```typescript
// Cursor-based
const limit = Math.min(Number(req.query.limit) || 20, 100);
const cursor = decodeCursor(req.query.cursor);

const rows = await db
  .select()
  .from(leads)
  .where(cursor ? gt(leads.id, cursor.lastId) : undefined)
  .orderBy(asc(leads.id))
  .limit(limit + 1);

const hasMore = rows.length > limit;
const data = hasMore ? rows.slice(0, limit) : rows;
const nextCursor = hasMore ? encodeCursor({ lastId: data[data.length - 1].id }) : null;
```

---

## 4. Response Envelope

Standard shape for all paginated endpoints:

```typescript
interface PaginatedResponse<T> {
  data: T[];
  meta: {
    cursor?: string;
    hasMore?: boolean;
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
}
```

---

## 5. Frontend Integration (@refinedev/react-table)

Refine's `useTable` supports both modes:

```tsx
const { tableQueryResult } = useTable({
  pagination: {
    mode: "server",
    current: 1,
    pageSize: 20,
  },
});

// For cursor-based, use custom getList with cursor in params
```

Sync `cursor` or `page` with URL query params for shareable links.

---

## 6. Defaults

- **limit:** 20 (max 100)
- **Default mode:** Cursor for list endpoints; offset for admin/simple tables

---

## 7. Cursor Encoding

Use base64 JSON for opacity and URL safety:

```typescript
function encodeCursor(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}
function decodeCursor(str: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(str, "base64url").toString());
  } catch {
    return null;
  }
}
```

---

## 8. Sorting with Cursor

For sorted lists, include sort key in cursor: `{ lastId, lastCreatedAt }`. Query: `WHERE (created_at, id) < (cursor.lastCreatedAt, cursor.lastId)`.

---

## 9. Total Count Performance

`COUNT(*)` on large tables is expensive. Options: skip total for cursor-based; use estimated count; cache count for short TTL.

---

## 10. Related Documents

- `search-filter-pattern.md` — Filtering with pagination
- `docs/api/openapi-etapa1.yaml` — API schema

---

## Checklist

- [ ] Cursor-based for large lists
- [ ] Offset fallback where appropriate
- [ ] Response envelope consistent
- [ ] Drizzle helpers for both modes
- [ ] Frontend sync with Refine
- [ ] Cursor encoding secure
