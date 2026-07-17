import { lazy } from "react";

// Protected app routes — render inside MainLayout via useAuthRedirection.
// Special redirects (e.g. /records → /records/companies, legacy /merchants →
// /tenants) live in routes/index.jsx where JSX is allowed.
export const AppRoutes = [
  {
    path: "/",
    element: lazy(() => import("@/pages/dashboard/index")),
  },
  {
    path: "/leads",
    element: lazy(() => import("@/pages/lists/index")),
  },
  {
    path: "/leads/:listId",
    element: lazy(() => import("@/pages/lists/list")),
  },
  {
    path: "/records/companies",
    element: lazy(() => import("@/pages/records/companies")),
  },
  {
    path: "/records/contacts",
    element: lazy(() => import("@/pages/records/contacts")),
  },
  {
    path: "/tenants",
    element: lazy(() => import("@/pages/merchants/index")),
  },
  {
    path: "/tenants/:id",
    element: lazy(() => import("@/pages/merchants/detail")),
  },
];
