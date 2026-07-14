import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";

import authReducer from "./slices/authSlice";
import { authApi } from "./services/auth";
import { usersApi } from "./services/users";
import { leadsApi } from "./services/leads";
import { tenantsApi } from "./services/tenants";
import { dashboardApi } from "./services/dashboard";

const setUpStore = () => {
  const store = configureStore({
    reducer: {
      auth: authReducer,
      [authApi.reducerPath]: authApi.reducer,
      [usersApi.reducerPath]: usersApi.reducer,
      [leadsApi.reducerPath]: leadsApi.reducer,
      [tenantsApi.reducerPath]: tenantsApi.reducer,
      [dashboardApi.reducerPath]: dashboardApi.reducer,
    },
    middleware: (getDefault) =>
      getDefault().concat(
        authApi.middleware,
        usersApi.middleware,
        leadsApi.middleware,
        tenantsApi.middleware,
        dashboardApi.middleware,
      ),
  });
  setupListeners(store.dispatch);
  return store;
};

export const store = setUpStore();
