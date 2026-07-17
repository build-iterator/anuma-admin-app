import { createApi } from "@reduxjs/toolkit/query/react";

import apiBaseQuery from "./axiosBaseQuery";

// One aggregate endpoint hitting backend's `dashboard/views.py::SummaryView`.
// The response is a single object (no pagination envelope) shaped:
//   { tenants: { total, active, inactive, suspended, total_gmv },
//     leads:   { total_records, lists: [{ slug, name, record_count }] } }
// so components consume it directly — no `transformResponse` needed.

export const DASHBOARD_API_REDUCER_KEY = "dashboardApi";

export const dashboardApi = createApi({
  reducerPath: DASHBOARD_API_REDUCER_KEY,
  baseQuery: apiBaseQuery,
  tagTypes: ["DashboardSummary"],
  endpoints: (builder) => ({
    getSummary: builder.query({
      query: () => ({ url: "api/dashboard/summary/" }),
      providesTags: ["DashboardSummary"],
    }),
  }),
});

export const { useGetSummaryQuery } = dashboardApi;
