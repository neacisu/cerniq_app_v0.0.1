import type { DataProvider, BaseRecord } from "@refinedev/core";
import { api } from "@/lib/api.js";
import { getApiBase } from "@/lib/api-url.js";
import { resourceToApiPath } from "@/lib/api-path.js";

function extractList<T extends BaseRecord>(raw: unknown): { data: T[]; total: number } {
  if (Array.isArray(raw)) {
    return { data: raw as T[], total: raw.length };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const inner = o.data;
    if (Array.isArray(inner)) {
      const meta = o.meta as { total?: number } | undefined;
      const total = typeof meta?.total === "number" ? meta.total : inner.length;
      return { data: inner as T[], total };
    }
  }
  return { data: [], total: 0 };
}

function extractOneRecord(raw: unknown, fallbackId: string): BaseRecord {
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    if ("data" in o && o.data !== null && typeof o.data === "object") {
      const inner = o.data as BaseRecord;
      return inner.id != null ? inner : { ...inner, id: fallbackId };
    }
    if ("id" in o || Object.keys(o).length > 0) {
      return o as BaseRecord;
    }
  }
  return { id: fallbackId } as BaseRecord;
}

export const cerniqDataProvider = {
  getApiUrl: getApiBase,
  getList: async ({
    resource,
    pagination,
  }: {
    resource: string;
    pagination?: { currentPage?: number; pageSize?: number };
  }) => {
    const currentPage = pagination?.currentPage ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const params = new URLSearchParams();
    params.set("page", String(currentPage));
    params.set("limit", String(pageSize));
    const path = `${resourceToApiPath(resource)}?${params}`;
    const raw = await api.get<unknown>(path);
    const { data, total } = extractList<BaseRecord>(raw);
    return { data, total };
  },
  getOne: async ({ resource, id }: { resource: string; id: string }) => {
    const raw = await api.get<unknown>(`${resourceToApiPath(resource)}/${encodeURIComponent(id)}`);
    return { data: extractOneRecord(raw, id) };
  },
  getMany: async ({ resource, ids }: { resource: string; ids: (string | number)[] }) => {
    const params = new URLSearchParams();
    params.set("ids", ids.join(","));
    const raw = await api.get<unknown>(`${resourceToApiPath(resource)}?${params}`);
    const { data } = extractList<BaseRecord>(raw);
    return { data };
  },
  create: async ({
    resource,
    variables,
  }: {
    resource: string;
    variables: Record<string, unknown>;
  }) => {
    const raw = await api.post<unknown>(resourceToApiPath(resource), variables);
    const o = raw as { data?: BaseRecord };
    const created = o?.data ?? extractOneRecord(raw, "");
    return { data: (created.id != null ? created : { ...created, id: "" }) as BaseRecord };
  },
  update: async ({
    resource,
    id,
    variables,
  }: {
    resource: string;
    id: string;
    variables: Record<string, unknown>;
  }) => {
    const raw = await api.patch<unknown>(
      `${resourceToApiPath(resource)}/${encodeURIComponent(id)}`,
      variables,
    );
    const o = raw as { data?: BaseRecord };
    const updated = o?.data ?? extractOneRecord(raw, id);
    return { data: updated };
  },
  deleteOne: async ({ resource, id }: { resource: string; id: string }) => {
    await api.delete(`${resourceToApiPath(resource)}/${encodeURIComponent(id)}`);
    return { data: { id } as BaseRecord };
  },
  getManyReference: async ({ resource }: { resource: string }) => {
    const raw = await api.get<unknown>(resourceToApiPath(resource));
    const { data, total } = extractList<BaseRecord>(raw);
    return { data, total };
  },
} as DataProvider;
