import { Suspense, createElement } from "react";
import {
  Navigate,
  Route,
  Routes,
  matchPath,
  useLocation,
  useParams,
} from "react-router";

import MainLayout from "@/layouts/main-layout";
import AuthProvider from "@/providers/AuthProvider";
import { useAuthRedirection } from "@/hooks/auth-redirection";
import { AuthRoutes } from "@/routes/auth-routes";
import { AppRoutes } from "@/routes/app-routes";
import { getList, useListsVersion } from "@/pages/lists/lib/store";
import LeadsHydrator from "@/pages/lists/lib/LeadsHydrator";

// Tab titles follow `Location | Anuma Admin`. React 19 hoists the bare
// <title> element into <head>. List titles resolve from the store so
// runtime-loaded lists title correctly too.
const TITLES = [
  { path: "/", end: true, title: "Dashboard" },
  { path: "/login", title: "Sign in" },
  { path: "/tenants/:id", title: "Tenant detail" },
  { path: "/tenants", title: "Tenants" },
  { path: "/records/companies", title: "Companies · Records" },
  { path: "/records/contacts", title: "Contacts · Records" },
  { path: "/leads", end: true, title: "Leads" },
];

function RouteTitle() {
  useListsVersion();
  const { pathname } = useLocation();
  const listMatch = matchPath({ path: "/leads/:listId" }, pathname);
  const listName = listMatch ? getList(listMatch.params.listId)?.name : null;
  const match = TITLES.find((t) =>
    matchPath({ path: t.path, end: t.end ?? false }, pathname),
  );
  const title = listName ? `${listName} · Leads` : match?.title;
  return <title>{title ? `${title} | Anuma Admin` : "Anuma Admin"}</title>;
}

function Loading() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

function suspended(page) {
  return (
    <Suspense fallback={<Loading />}>{createElement(page)}</Suspense>
  );
}

// /lists/* was the pre-three-tier path for leads; keep old links alive.
function LegacyListRedirect() {
  const { listId } = useParams();
  return <Navigate to={listId ? `/leads/${listId}` : "/leads"} replace />;
}

// Wraps MainLayout with the auth guard so unauthed users are punted to /login.
// MainLayout renders <Outlet /> internally. LeadsHydrator lives here so the
// leadsApi cache is populated by the time any leads page reads from it.
function ProtectedShell() {
  useAuthRedirection();
  return (
    <>
      <LeadsHydrator />
      <MainLayout />
    </>
  );
}

export default function Router() {
  return (
    <AuthProvider>
      <RouteTitle />
      <Routes>
        {AuthRoutes.map((r) => (
          <Route key={r.path} path={r.path} element={suspended(r.element)} />
        ))}
        <Route element={<ProtectedShell />}>
          {AppRoutes.map((r) => (
            <Route key={r.path} path={r.path} element={suspended(r.element)} />
          ))}
          {/* Special redirects */}
          <Route
            path="/records"
            element={<Navigate to="/records/companies" replace />}
          />
          <Route path="/lists" element={<LegacyListRedirect />} />
          <Route path="/lists/:listId" element={<LegacyListRedirect />} />
          <Route
            path="/merchants"
            element={<Navigate to="/tenants" replace />}
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
