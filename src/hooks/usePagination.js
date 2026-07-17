import { useSearchParams } from "react-router";

const DEFAULT_LIMIT = 50;

// URL-driven pagination + search state. Every list page hits DRF-paginated
// endpoints of shape { count, next, previous, results }, so this hook is
// deliberately generic:
//
//   const { params, page, limit, setPage, setSearch } = usePagination();
//   const { data } = useGetThingsQuery(params);   // pass params as-is
//
// The endpoint's `query` receives `params` untouched and hands it to axios,
// which serializes into `?page=1&limit=50&search=foo&…`. Adding a new URL
// key (ordering, filters) just works — no destructure at any layer.
//
// State lives in useSearchParams so back/forward buttons and refresh keep
// the current lens.
export function usePagination(defaults = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  // Everything currently in the URL, as a plain object.
  const params = Object.fromEntries(searchParams.entries());
  if (!params.page)  params.page  = String(defaults.page  ?? 1);
  if (!params.limit) params.limit = String(defaults.limit ?? DEFAULT_LIMIT);

  const set = (patch) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(patch)) {
      if (v == null || v === "") next.delete(k);
      else next.set(k, String(v));
    }
    setSearchParams(next, { replace: true });
  };

  return {
    params,
    page: Number(params.page),
    limit: Number(params.limit),
    search: params.search ?? "",
    ordering: params.ordering ?? "",
    setPage:     (n) => set({ page: n }),
    setLimit:    (n) => set({ limit: n, page: 1 }),
    setSearch:   (q) => set({ search: q, page: 1 }),
    setOrdering: (o) => set({ ordering: o }),
  };
}
