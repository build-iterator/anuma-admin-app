import { createApi } from "@reduxjs/toolkit/query/react";

import apiBaseQuery from "./axiosBaseQuery";

export const TENANTS_API_REDUCER_KEY = "tenantsApi";

// Endpoints mirror the backend `tenants` app (see anuma-admin-backend/tenants/urls.py).
// Tag scheme:
//   Tenants/ALL — a single bucket invalidated on any CRUD; the list is small
//                 (built-in tenants) so cache-busting the whole set on write
//                 is cheap and keeps state trivial.
//
// No `transformResponse` — consumers read `.data.results` from the standard
// {count, next, previous, results} envelope so pagination metadata stays
// accessible if we need it later.
export const tenantsApi = createApi({
  reducerPath: TENANTS_API_REDUCER_KEY,
  baseQuery: apiBaseQuery,
  tagTypes: ["Tenants"],
  endpoints: (builder) => ({
    getTenants: builder.query({
      query: (params) => ({ url: "api/tenants/", params }),
      providesTags: [{ type: "Tenants", id: "ALL" }],
    }),
    getTenant: builder.query({
      query: (id) => ({ url: `api/tenants/${id}/` }),
      providesTags: (result, error, id) => [{ type: "Tenants", id }],
    }),
    createTenant: builder.mutation({
      query: (body) => ({ url: "api/tenants/", method: "POST", body }),
      invalidatesTags: [{ type: "Tenants", id: "ALL" }],
    }),
    updateTenant: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `api/tenants/${id}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Tenants", id: "ALL" }],
    }),
    deleteTenant: builder.mutation({
      query: (id) => ({ url: `api/tenants/${id}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "Tenants", id: "ALL" }],
    }),
  }),
});

export const {
  useGetTenantsQuery,
  useGetTenantQuery,
  useCreateTenantMutation,
  useUpdateTenantMutation,
  useDeleteTenantMutation,
} = tenantsApi;
