import axios from "axios";

import { setAccessToken } from "../slices/authSlice";

const axiosInstance = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL || "http://localhost:8000"}/`,
  headers: {
    accept: "application/json",
  },
});

const setUpInterceptors = (getState) => {
  axiosInstance.interceptors.request.clear?.();
  axiosInstance.interceptors.request.use(
    (config) => {
      const token = getState()?.auth?.accessToken;
      if (token) config.headers["Authorization"] = `Token ${token}`;
      return config;
    },
    (error) => Promise.reject(error),
  );
};

const axiosBaseQuery =
  () =>
  async ({ url, method, body, params, ...requestOpts }, { getState, dispatch }, extraOptions) => {
    setUpInterceptors(getState);
    try {
      const result = await axiosInstance({
        url,
        method,
        data: body,
        params,
        headers: requestOpts.headers,
        responseType: requestOpts.responseType,
        withCredentials: Boolean(
          requestOpts.withCredentials || extraOptions?.withCredentials,
        ),
      });
      return { data: result.data };
    } catch (axiosError) {
      const err = axiosError;
      const status = err.response?.status;

      // 401 anywhere except the login page means the token is dead — drop it
      // so the app bounces to /login. Never redirect from the login page or
      // we'd loop.
      if (status === 401 && window.location.pathname !== "/login") {
        dispatch(setAccessToken(null));
      }

      return {
        error: {
          status,
          data: err.response?.data || err.message,
        },
      };
    }
  };

export default axiosBaseQuery();
