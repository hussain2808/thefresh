import type { CrudFilter, DataProvider } from "@refinedev/core";
import { apiFetch, API_URL } from "@/lib/api-client";

// Refine resource name → API path under /admin/.
const RESOURCE_PATHS: Record<string, string> = {
  products: "catalog/families",
  categories: "catalog/categories",
  brands: "catalog/brands",
  attributes: "catalog/attributes",
  listings: "listings",
  inventory: "listings", // inventory screen reads the same listings endpoint
  countries: "delivery/countries",
  cities: "delivery/cities",
  zones: "delivery/zones",
  areas: "delivery/areas",
  "delivery-methods": "delivery/methods",
  "delivery-slots": "delivery/slots",
};

function resourcePath(resource: string): string {
  return RESOURCE_PATHS[resource] ?? resource;
}

function buildQuery(filters?: CrudFilter[]): string {
  const params = new URLSearchParams();
  for (const filter of filters ?? []) {
    if ("field" in filter && filter.value !== undefined && filter.value !== "") {
      params.set(filter.field, String(filter.value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const dataProvider: DataProvider = {
  getApiUrl: () => API_URL,

  getList: async ({ resource, filters }) => {
    const data = await apiFetch<Record<string, unknown>[]>(
      `/admin/${resourcePath(resource)}${buildQuery(filters)}`,
    );
    return { data: data as never, total: data.length };
  },

  getOne: async ({ resource, id }) => {
    const data = await apiFetch<Record<string, unknown>>(`/admin/${resourcePath(resource)}/${id}`);
    return { data: data as never };
  },

  create: async ({ resource, variables }) => {
    const data = await apiFetch<Record<string, unknown>>(`/admin/${resourcePath(resource)}`, {
      method: "POST",
      body: JSON.stringify(variables),
    });
    return { data: data as never };
  },

  update: async ({ resource, id, variables }) => {
    const data = await apiFetch<Record<string, unknown>>(`/admin/${resourcePath(resource)}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(variables),
    });
    return { data: data as never };
  },

  deleteOne: async ({ resource, id }) => {
    const data = await apiFetch<Record<string, unknown>>(`/admin/${resourcePath(resource)}/${id}`, {
      method: "DELETE",
    });
    return { data: data as never };
  },
};
