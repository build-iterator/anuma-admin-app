import { createApi } from "@reduxjs/toolkit/query/react";

import apiBaseQuery from "./axiosBaseQuery";

export const AUTH_API_REDUCER_KEY = "authApi";

export const authApi = createApi({
  reducerPath: AUTH_API_REDUCER_KEY,
  baseQuery: apiBaseQuery,
  tagTypes: ["auth"],
  endpoints: (builder) => ({
    requestOtp: builder.mutation({
      query: (body) => ({
        url: "api/auth/otp/request/",
        method: "POST",
        body,
      }),
    }),
    verifyOtp: builder.mutation({
      query: (body) => ({
        url: "api/auth/otp/verify/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["auth"],
    }),
    googleLogin: builder.mutation({
      query: (body) => ({
        url: "api/auth/google/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["auth"],
    }),
    logout: builder.mutation({
      query: () => ({
        url: "api/auth/logout/",
        method: "POST",
      }),
      invalidatesTags: ["auth"],
    }),
  }),
});

export const {
  useRequestOtpMutation,
  useVerifyOtpMutation,
  useGoogleLoginMutation,
  useLogoutMutation,
} = authApi;
