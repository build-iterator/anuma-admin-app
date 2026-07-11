import { Suspense, lazy } from "react";
import { Route, Routes, matchPath, useLocation } from "react-router";
import MainLayout from "@/layouts/main-layout";

// Tab titles follow `Location | Anuma Admin`. React 19 hoists the bare
// <title> element into <head>.
const TITLES = [
  { path: "/", end: true, title: "Dashboard" },
  { path: "/merchants/:id", title: "Merchant detail" },
  { path: "/merchants", title: "Merchants" },
];

function RouteTitle() {
  const { pathname } = useLocation();
  const match = TITLES.find((t) =>
    matchPath({ path: t.path, end: t.end ?? false }, pathname)
  );
  return <title>{match ? `${match.title} | Anuma Admin` : "Anuma Admin"}</title>;
}

const DashboardPage = lazy(() => import("@/pages/dashboard/index"));
const MerchantsPage = lazy(() => import("@/pages/merchants/index"));
const MerchantDetail = lazy(() => import("@/pages/merchants/detail"));

function Loading() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

export default function Router() {
  return (
    <>
      <RouteTitle />
      <Routes>
        <Route element={<MainLayout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<Loading />}>
              <DashboardPage />
            </Suspense>
          }
        />
        <Route
          path="/merchants"
          element={
            <Suspense fallback={<Loading />}>
              <MerchantsPage />
            </Suspense>
          }
        />
        <Route
          path="/merchants/:id"
          element={
            <Suspense fallback={<Loading />}>
              <MerchantDetail />
            </Suspense>
          }
        />
        </Route>
      </Routes>
    </>
  );
}
