import { useEffect } from "react";
import { matchPath, useLocation } from "react-router";

import {
  useGetListsQuery,
  useGetRecordsQuery,
  useGetSavedViewsQuery,
  useImportRecordsMutation,
} from "@/api/services/leads";
import { LISTS } from "@/pages/lists/registry";

// Primes the RTK Query cache for the lists/records/views the lib/store.js
// sync-getters read from, and backfills built-in lists' seed rows on first
// load so /leads/<slug> isn't empty out of the gate.

// Backfill guard — process-local so double-mounts (StrictMode, tab switches)
// don't try to seed the same list twice inside one session. The `record_count`
// check keeps it idempotent across sessions.
const seedStarted = new Set();

function useSeedBackfill(rows) {
  const [importRecords] = useImportRecordsMutation();
  useEffect(() => {
    if (!rows?.length) return;
    for (const row of rows) {
      if (row.is_custom) continue;
      if (row.record_count > 0) continue;
      if (seedStarted.has(row.slug)) continue;
      const entry = LISTS.find((l) => l.id === row.slug);
      if (!entry?.seed?.length) continue;
      seedStarted.add(row.slug);
      importRecords({
        slug: row.slug,
        source: "seed",
        rows: entry.seed.map((r) => ({ id: r.id, values: r.values })),
      })
        .unwrap()
        .catch(() => {
          // Backfill is best-effort; on failure allow another attempt next
          // mount so a transient network hiccup doesn't leave the list empty
          // forever.
          seedStarted.delete(row.slug);
        });
    }
  }, [rows, importRecords]);
}

// A tiny component that fires one useGetRecordsQuery per list. Split out so
// we can render N of these when on /records/* without violating the Rules of
// Hooks (can't call hooks inside a .map at the top-level component).
function HydrateOneListRecords({ slug, enabled }) {
  useGetRecordsQuery(slug, { skip: !enabled });
  return null;
}

export default function LeadsHydrator() {
  const { pathname } = useLocation();
  const { data } = useGetListsQuery();
  const lists = data?.results ?? (Array.isArray(data) ? data : []);
  useSeedBackfill(lists);

  // Route-driven hydration:
  //   /leads/:listId       → fire records + views for that ONE list
  //   /records/*           → fire records for ALL lists (companies/contacts
  //                          are derived across every list via graph.js)
  //   /                    → dashboard — its own aggregate endpoint, no
  //                          per-list hydration needed
  const listMatch =
    matchPath({ path: "/leads/:listId" }, pathname) ||
    matchPath({ path: "/leads/:listId/*" }, pathname);
  const listId = listMatch?.params?.listId;
  const onRecordsPage = Boolean(matchPath({ path: "/records/*" }, pathname));

  useGetRecordsQuery(listId, { skip: !listId });
  useGetSavedViewsQuery(listId, { skip: !listId });

  return (
    <>
      {onRecordsPage &&
        lists.map((l) => (
          <HydrateOneListRecords key={l.slug} slug={l.slug} enabled />
        ))}
    </>
  );
}
