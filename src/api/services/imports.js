import { createApi } from "@reduxjs/toolkit/query/react";

import apiBaseQuery from "./axiosBaseQuery";

export const IMPORTS_API_REDUCER_KEY = "importsApi";

// Endpoints mirror the backend `imports` app.
// The FileImport lifecycle is:
//   QUEUED → ANALYZING → ANALYZED → IMPORTING → COMPLETED   (or FAILED at any stage)
//
// Tag scheme:
//   Imports/ALL — the global list bucket, invalidated when a new import is
//                 created or an existing one finishes executing.
//   Import/<id> — the individual FileImport row, invalidated on execute so a
//                 caller observing the record via useGetImportQuery immediately
//                 sees the freshly updated status/logs.
//
// The wizard component polls `getImport` with `pollingInterval` for the two
// "waiting" states (ANALYZING and IMPORTING). List invalidation for the
// underlying target (leads.records or tenants) is done in the wizard's
// executeImport onSuccess handler — we don't know the target upfront here.
export const importsApi = createApi({
  reducerPath: IMPORTS_API_REDUCER_KEY,
  baseQuery: apiBaseQuery,
  tagTypes: ["Imports", "Import"],
  endpoints: (builder) => ({
    // Multipart POST: `body` must be a FormData with `file`, `target_type`, `target_ref`.
    // The axios base query passes `body` straight through as `data`, and the
    // browser will set the correct multipart boundary automatically.
    createImport: builder.mutation({
      query: (formData) => ({
        url: "api/imports/",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [{ type: "Imports", id: "ALL" }],
    }),
    getImport: builder.query({
      query: (id) => ({ url: `api/imports/${id}/` }),
      providesTags: (result, error, id) => [{ type: "Import", id }],
    }),
    executeImport: builder.mutation({
      query: ({ id, column_mappings }) => ({
        url: `api/imports/${id}/execute/`,
        method: "POST",
        body: { column_mappings },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Import", id },
        { type: "Imports", id: "ALL" },
      ],
    }),
    getSchema: builder.query({
      // target is "leads.records" or "tenants"
      query: (target) => ({
        url: "api/imports/schemas/",
        params: { target },
      }),
    }),
  }),
});

export const {
  useCreateImportMutation,
  useGetImportQuery,
  useExecuteImportMutation,
  useGetSchemaQuery,
} = importsApi;
