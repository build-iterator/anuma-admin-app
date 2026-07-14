import { lazy } from "react";

// Public/auth routes — render outside MainLayout.
export const AuthRoutes = [
  {
    path: "/login",
    element: lazy(() => import("@/pages/auth/login")),
  },
];
