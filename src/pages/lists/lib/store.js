// Lists store — thin adapter between the RTK Query `leadsApi` cache and the
// synchronous getter surface the pages/components already use. The sync API
// is preserved so existing consumers keep working: getters read from the RTK
// Query cache via store.getState(), mutations dispatch RTK Query mutations
// (fire-and-forget with cache invalidation), and useListsVersion() rerenders
// on any leadsApi state change.
//
// A separate <LeadsHydrator /> component (mounted from routes/index.jsx)
// primes the queries — otherwise the RTK Query cache would be empty on first
// read and consumers would see "no lists yet" until React tries again.
//
// Icons/select-option colors for the 3 built-in lists still live in
// registry.js since they don't survive a JSON round-trip. Backend data is
// merged with the registry entry to produce the final list object.

import { useSyncExternalStore } from "react";

import { store } from "@/api/store";
import { leadsApi } from "@/api/services/leads";
import { LISTS, makeCustomList } from "@/pages/lists/registry";

/* ── reactivity ─────────────────────────────────────────────────────────── */

// Bump a monotonic counter whenever leadsApi state changes so components using
// useListsVersion re-render when queries resolve or mutations invalidate.
let version = 0;
let lastSlice;
const subscribers = new Set();

store.subscribe(() => {
  const slice = store.getState()[leadsApi.reducerPath];
  if (slice !== lastSlice) {
    lastSlice = slice;
    version += 1;
    subscribers.forEach((fn) => fn());
  }
});

export function useListsVersion() {
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    () => version,
  );
}

/* ── selectors over the RTK Query cache ─────────────────────────────────── */

// Read the resolved data for a query by args. RTK Query keeps entries under
// `<endpointName>(<serialized-args>)` with a `data` field once resolved.
// Paginated list endpoints return `{count, next, previous, results}` — this
// helper unwraps `.results` for consumers that only want the array. Direct
// hook consumers can still read the envelope via `useGetListsQuery()` etc.
function readQuery(endpoint, args) {
  const state = store.getState()[leadsApi.reducerPath];
  const selector = leadsApi.endpoints[endpoint].select(args);
  const data = selector({ [leadsApi.reducerPath]: state }).data;
  if (data && Array.isArray(data.results)) return data.results;
  return data;
}

/* ── lists (backend + registry schema merge) ────────────────────────────── */

const REGISTRY_BY_ID = new Map(LISTS.map((l) => [l.id, l]));

// Merge a backend list row with the frontend registry entry (schema + icon
// live in the registry for built-ins). Custom lists synthesize their schema
// via makeCustomList using the extra_fields the backend stored.
function toClientList(row) {
  if (!row.is_custom) {
    const base = REGISTRY_BY_ID.get(row.slug);
    if (base) return { ...base, id: row.slug, description: row.description || base.description, recordCount: row.record_count ?? 0 };
    // Built-in row we don't know about — fall through to a generic shell.
  }
  const custom = makeCustomList({
    id: row.slug,
    name: row.name,
    description: row.description,
    extraFields: row.extra_fields || [],
  });
  return { ...custom, id: row.slug, recordCount: row.record_count ?? 0 };
}

export function getAllLists() {
  const rows = readQuery("getLists") || [];
  return rows.map(toClientList);
}

export function getList(listId) {
  return getAllLists().find((l) => l.id === listId) ?? null;
}

export async function addList({ name, description, extraFields = [] }) {
  // Slugify locally so the backend URL keys stay predictable.
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "list";
  const taken = new Set(getAllLists().map((l) => l.id));
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  await store
    .dispatch(
      leadsApi.endpoints.createList.initiate({
        slug,
        name: name.trim(),
        description: description?.trim() || "",
        extra_fields: extraFields,
        stage_field: "stage",
      }),
    )
    .unwrap();
  return slug;
}

/* ── records ────────────────────────────────────────────────────────────── */

export function getRecords(listId) {
  const rows = readQuery("getRecords", listId) || [];
  // Preserve the source string so record-panel timeline entries keep working.
  return rows.map((r) => ({ id: r.id, values: r.values || {}, source: r.source || "" }));
}

export function updateRecord(listId, recordId, patch) {
  return store
    .dispatch(
      leadsApi.endpoints.updateRecord.initiate({
        slug: listId,
        rid: recordId,
        values: patch,
      }),
    )
    .unwrap();
}

export function addRecord(listId, values) {
  return store
    .dispatch(
      leadsApi.endpoints.createRecord.initiate({
        slug: listId,
        values,
        source: "added manually",
      }),
    )
    .unwrap()
    .then((row) => row.id);
}

export function deleteRecord(listId, recordId) {
  return store
    .dispatch(leadsApi.endpoints.deleteRecord.initiate({ slug: listId, rid: recordId }))
    .unwrap();
}

export function importRecords(listId, rows, source = "csv import") {
  return store
    .dispatch(
      leadsApi.endpoints.importRecords.initiate({
        slug: listId,
        rows: rows.map((values) => ({ values })),
        source,
      }),
    )
    .unwrap();
}

/* ── saved views ────────────────────────────────────────────────────────── */

export function getSavedViews(listId) {
  return readQuery("getSavedViews", listId) || [];
}

export function saveView(listId, { name, segment, filters, q, view }) {
  return store
    .dispatch(
      leadsApi.endpoints.saveView.initiate({
        slug: listId,
        name,
        segment,
        filters,
        q,
        view,
      }),
    )
    .unwrap()
    .then((row) => row.id);
}

export function deleteView(listId, viewId) {
  return store
    .dispatch(leadsApi.endpoints.deleteView.initiate({ slug: listId, vid: viewId }))
    .unwrap();
}

/* ── event log ──────────────────────────────────────────────────────────── */

export function getLoggedEvents(listId, recordId) {
  const rows = readQuery("getRecordEvents", { slug: listId, rid: recordId }) || [];
  // Keep the frontend's { at, text, type } shape.
  return rows.map((e) => ({
    at: (e.at || "").slice(0, 10),
    text: e.text,
    type: e.type || "note",
  }));
}

export function logEvent(listId, recordId, text) {
  return store
    .dispatch(
      leadsApi.endpoints.logRecordEvent.initiate({
        slug: listId,
        rid: recordId,
        text: text.trim(),
        type: "note",
      }),
    )
    .unwrap();
}

/* ── reset (dev/reset affordance) ───────────────────────────────────────── */

export function resetOverlay(listId) {
  // Backend has no per-list reset endpoint; nuke the cache so the next read
  // refetches from the server (a no-op if the user hasn't imported anything
  // client-only).
  store.dispatch(leadsApi.util.invalidateTags([{ type: "Records", id: listId }]));
}
