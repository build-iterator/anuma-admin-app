import { createApi } from "@reduxjs/toolkit/query/react";

import apiBaseQuery from "./axiosBaseQuery";

export const USERS_API_REDUCER_KEY = "usersApi";

export const usersApi = createApi({
  reducerPath: USERS_API_REDUCER_KEY,
  baseQuery: apiBaseQuery,
  tagTypes: ["user"],
  endpoints: (builder) => ({
    getMe: builder.query({
      query: () => ({ url: "api/auth/me/" }),
      providesTags: ["user"],
    }),
  }),
});

export const { useGetMeQuery } = usersApi;
