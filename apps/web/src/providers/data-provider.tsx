import type { DataProvider, BaseRecord } from "@refinedev/core";
import { api } from "@/lib/api.js";
import { getApiBase } from "@/lib/api-url.js";

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
    params.set("_page", String(currentPage));
    params.set("_limit", String(pageSize));
    const data = await api.get<
      BaseRecord[] | { data?: BaseRecord[]; total?: number; meta?: { total?: number } }
    >(`/api/${resource}?${params}`);
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "data" in data
        ? (data.data ?? [])
        : [];
    const total =
      data &&
      typeof data === "object" &&
      "total" in data &&
      typeof (data as { total?: number }).total === "number"
        ? (data as { total: number }).total
        : data &&
            typeof data === "object" &&
            "meta" in data &&
            (data as { meta?: { total?: number } }).meta?.total != null
          ? (data as { meta: { total: number } }).meta.total
          : list.length;
    return { data: list, total };
  },
  getOne: async ({ resource, id }: { resource: string; id: string }) => {
    const data = await api.get<BaseRecord>(`/api/${resource}/${id}`);
    return { data: data ?? ({ id } as BaseRecord) };
  },
  getMany: async ({ resource, ids }: { resource: string; ids: (string | number)[] }) => {
    const data = await api.get<BaseRecord[]>(`/api/${resource}?ids=${ids.join(",")}`);
    return { data: Array.isArray(data) ? data : [] };
  },
  create: async ({
    resource,
    variables,
  }: {
    resource: string;
    variables: Record<string, unknown>;
  }) => {
    const data = await api.post<{ data?: BaseRecord } & BaseRecord>(`/api/${resource}`, variables);
    const created = (data as { data?: BaseRecord })?.data ?? (data as BaseRecord);
    return { data: (created ?? { id: "" }) as BaseRecord };
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
    const data = await api.patch<{ data?: BaseRecord } & BaseRecord>(
      `/api/${resource}/${id}`,
      variables,
    );
    const updated = (data as { data?: BaseRecord })?.data ?? (data as BaseRecord);
    return { data: (updated ?? { id }) as BaseRecord };
  },
  deleteOne: async ({ resource, id }: { resource: string; id: string }) => {
    await api.delete(`/api/${resource}/${id}`);
    return { data: { id } as BaseRecord };
  },
  getManyReference: async ({ resource }: { resource: string }) => {
    const data = await api.get<
      BaseRecord[] | { data?: BaseRecord[]; total?: number; meta?: { total?: number } }
    >(`/api/${resource}`);
    const list = Array.isArray(data)
      ? data
      : data && typeof data === "object" && "data" in data
        ? (data.data ?? [])
        : [];
    const total =
      data &&
      typeof data === "object" &&
      "total" in data &&
      typeof (data as { total?: number }).total === "number"
        ? (data as { total: number }).total
        : data &&
            typeof data === "object" &&
            "meta" in data &&
            (data as { meta?: { total?: number } }).meta?.total != null
          ? (data as { meta: { total: number } }).meta.total
          : list.length;
    return { data: list, total };
  },
} as DataProvider;
