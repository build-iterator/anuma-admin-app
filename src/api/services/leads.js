import { createApi } from "@reduxjs/toolkit/query/react";

import apiBaseQuery from "./axiosBaseQuery";

export const LEADS_API_REDUCER_KEY = "leadsApi";

// Endpoints mirror the backend `leads` app (see anuma-admin-backend/leads/urls.py).
// Tag scheme:
//   Lists           — a single "LIST" (invalidated on list CRUD)
//   Records/<slug>  — records for one list (fine-grained so editing anuma
//                     doesn't refetch iterator's records)
//   Views/<slug>    — saved views for one list
//   Events/<recId>  — timeline for one record

export const leadsApi = createApi({
  reducerPath: LEADS_API_REDUCER_KEY,
  baseQuery: apiBaseQuery,
  tagTypes: ["Lists", "Records", "Views", "Events"],
  endpoints: (builder) => ({
    /* ── lists ────────────────────────────────────────────────────────── */
    getLists: builder.query({
      query: () => ({ url: "api/leads/lists/" }),
      providesTags: [{ type: "Lists", id: "ALL" }],
    }),
    createList: builder.mutation({
      query: (body) => ({ url: "api/leads/lists/", method: "POST", body }),
      invalidatesTags: [{ type: "Lists", id: "ALL" }],
    }),
    updateList: builder.mutation({
      query: ({ slug, ...body }) => ({
        url: `api/leads/lists/${slug}/`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "Lists", id: "ALL" }],
    }),
    deleteList: builder.mutation({
      query: (slug) => ({ url: `api/leads/lists/${slug}/`, method: "DELETE" }),
      invalidatesTags: [{ type: "Lists", id: "ALL" }],
    }),

    /* ── records ──────────────────────────────────────────────────────── */
    getRecords: builder.query({
      query: (slug) => ({ url: `api/leads/lists/${slug}/records/`, params: { limit: 100 } }),
      providesTags: (result, error, slug) => [
        { type: "Records", id: slug },
        { type: "Lists", id: "ALL" }, // record_count on lists depends on records
      ],
    }),
    createRecord: builder.mutation({
      query: ({ slug, ...body }) => ({
        url: `api/leads/lists/${slug}/records/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { slug }) => [
        { type: "Records", id: slug },
      ],
    }),
    importRecords: builder.mutation({
      query: ({ slug, rows, source }) => ({
        url: `api/leads/lists/${slug}/records/`,
        method: "POST",
        body: { rows, source },
      }),
      invalidatesTags: (result, error, { slug }) => [
        { type: "Records", id: slug },
      ],
    }),
    updateRecord: builder.mutation({
      query: ({ slug, rid, values, source }) => ({
        url: `api/leads/lists/${slug}/records/${rid}/`,
        method: "PATCH",
        body: source !== undefined ? { values, source } : { values },
      }),
      invalidatesTags: (result, error, { slug }) => [
        { type: "Records", id: slug },
      ],
    }),
    deleteRecord: builder.mutation({
      query: ({ slug, rid }) => ({
        url: `api/leads/lists/${slug}/records/${rid}/`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { slug }) => [
        { type: "Records", id: slug },
      ],
    }),

    /* ── saved views ──────────────────────────────────────────────────── */
    getSavedViews: builder.query({
      query: (slug) => ({ url: `api/leads/lists/${slug}/views/` }),
      providesTags: (result, error, slug) => [{ type: "Views", id: slug }],
    }),
    saveView: builder.mutation({
      query: ({ slug, ...body }) => ({
        url: `api/leads/lists/${slug}/views/`,
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, { slug }) => [{ type: "Views", id: slug }],
    }),
    deleteView: builder.mutation({
      query: ({ slug, vid }) => ({
        url: `api/leads/lists/${slug}/views/${vid}/`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { slug }) => [{ type: "Views", id: slug }],
    }),

    /* ── record events ────────────────────────────────────────────────── */
    getRecordEvents: builder.query({
      query: ({ slug, rid }) => ({
        url: `api/leads/lists/${slug}/records/${rid}/events/`,
      }),
      providesTags: (result, error, { rid }) => [{ type: "Events", id: rid }],
    }),
    logRecordEvent: builder.mutation({
      query: ({ slug, rid, text, type = "note" }) => ({
        url: `api/leads/lists/${slug}/records/${rid}/events/`,
        method: "POST",
        body: { text, type },
      }),
      invalidatesTags: (result, error, { rid }) => [{ type: "Events", id: rid }],
    }),
  }),
});

export const {
  useGetListsQuery,
  useCreateListMutation,
  useUpdateListMutation,
  useDeleteListMutation,
  useGetRecordsQuery,
  useCreateRecordMutation,
  useImportRecordsMutation,
  useUpdateRecordMutation,
  useDeleteRecordMutation,
  useGetSavedViewsQuery,
  useSaveViewMutation,
  useDeleteViewMutation,
  useGetRecordEventsQuery,
  useLogRecordEventMutation,
} = leadsApi;
