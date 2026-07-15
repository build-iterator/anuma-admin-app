import { Suspense, createElement, lazy } from "react";
import { Navigate, Route, Routes, matchPath, useLocation, useParams } from "react-router";
import MainLayout from "@/layouts/main-layout";
import { getList, useListsVersion } from "@/pages/lists/lib/store";

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
  const match = TITLES.find((t) => matchPath({ path: t.path, end: t.end ?? false }, pathname));
  const title = listName ? `${listName} · Leads` : match?.title;
  return <title>{title ? `${title} | Anuma Admin` : "Anuma Admin"}</title>;
}

const DashboardPage = lazy(() => import("@/pages/dashboard/index"));
const MerchantsPage = lazy(() => import("@/pages/merchants/index"));
const MerchantDetail = lazy(() => import("@/pages/merchants/detail"));
const ListsOverviewPage = lazy(() => import("@/pages/lists/index"));
const ListPage = lazy(() => import("@/pages/lists/list"));
const CompaniesPage = lazy(() => import("@/pages/records/companies"));
const ContactsPage = lazy(() => import("@/pages/records/contacts"));
const LoginPage = lazy(() => import("@/pages/auth/login"));

function Loading() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

// Not JSX (`<Page />`) because this eslint setup doesn't track JSX usage of
// function params; createElement keeps no-unused-vars honest.
function suspended(page) {
  return <Suspense fallback={<Loading />}>{createElement(page)}</Suspense>;
}

// /lists/* was the pre-three-tier path for leads; keep old links alive.
function LegacyListRedirect() {
  const { listId } = useParams();
  return <Navigate to={listId ? `/leads/${listId}` : "/leads"} replace />;
}

export default function Router() {
  return (
    <>
      <RouteTitle />
      <Routes>
        {/* Sign-in lives on its own frame, outside the shell. */}
        <Route path="/login" element={suspended(LoginPage)} />
        <Route element={<MainLayout />}>
          <Route path="/" element={suspended(DashboardPage)} />
          <Route path="/leads" element={suspended(ListsOverviewPage)} />
          <Route path="/leads/:listId" element={suspended(ListPage)} />
          <Route path="/records" element={<Navigate to="/records/companies" replace />} />
          <Route path="/records/companies" element={suspended(CompaniesPage)} />
          <Route path="/records/contacts" element={suspended(ContactsPage)} />
          <Route path="/tenants" element={suspended(MerchantsPage)} />
          <Route path="/tenants/:id" element={suspended(MerchantDetail)} />
          {/* Legacy paths */}
          <Route path="/lists" element={<LegacyListRedirect />} />
          <Route path="/lists/:listId" element={<LegacyListRedirect />} />
          <Route path="/merchants" element={<Navigate to="/tenants" replace />} />
        </Route>
      </Routes>
    </>
  );
}
