import { usersApi } from "./services/users";
import { leadsApi } from "./services/leads";
import { tenantsApi } from "./services/tenants";
import { dashboardApi } from "./services/dashboard";
import { importsApi } from "./services/imports";

// Data-only APIs. authApi is intentionally excluded — resetting it would
// interfere with pending login/logout mutations.
const apis = [usersApi, leadsApi, tenantsApi, dashboardApi, importsApi];

export const resetAllApiState = (dispatch) => {
  apis.forEach((api) => dispatch(api.util.resetApiState()));
};
