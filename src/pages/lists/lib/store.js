// Lists store — checked-in seeds plus a localStorage overlay. Frontend-only:
// every mutation (imports, edits, new lists, saved views) lands in
// localStorage; seeds stay pristine. This module is the only thing that
// touches storage, so swapping its internals for API calls later leaves every
// page above it unchanged.
//
// Reactivity: mutations bump a version and notify subscribers; components read
// through useListsVersion() (useSyncExternalStore) so the rail sub-nav and
// pages re-render when a list is added or a view is saved.

import { useSyncExternalStore } from "react";

import { LISTS, makeCustomList } from "@/pages/lists/registry";

const PREFIX = "anuma-admin:lists:";
const CUSTOM_KEY = `${PREFIX}custom`;

/* ── reactivity ─────────────────────────────────────────────────────────── */

let version = 0;
const subscribers = new Set();

function notify() {
  version += 1;
  subscribers.forEach((fn) => fn());
}

export function useListsVersion() {
  return useSyncExternalStore(
    (fn) => {
      subscribers.add(fn);
      return () => subscribers.delete(fn);
    },
    () => version,
  );
}

/* ── storage helpers ────────────────────────────────────────────────────── */

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  notify();
}

/* ── lists (registry + custom) ──────────────────────────────────────────── */

export function getAllLists() {
  const custom = read(CUSTOM_KEY, []);
  return [...LISTS, ...custom.map(makeCustomList)];
}

export function getList(listId) {
  return getAllLists().find((l) => l.id === listId) ?? null;
}

export function addList({ name, description, extraFields = [] }) {
  const custom = read(CUSTOM_KEY, []);
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "list";
  const taken = new Set(getAllLists().map((l) => l.id));
  let id = base;
  for (let n = 2; taken.has(id); n += 1) id = `${base}-${n}`;
  custom.push({ id, name: name.trim(), description: description?.trim() || "", extraFields });
  write(CUSTOM_KEY, custom);
  return id;
}

/* ── records ────────────────────────────────────────────────────────────── */
// Overlay shape per list: { added: Record[], updated: { [id]: values-patch } }

function overlayKey(listId) {
  return `${PREFIX}${listId}`;
}

function readOverlay(listId) {
  const parsed = read(overlayKey(listId), null);
  return {
    added: Array.isArray(parsed?.added) ? parsed.added : [],
    updated: parsed?.updated && typeof parsed.updated === "object" ? parsed.updated : {},
  };
}

export function getRecords(listId) {
  const list = getList(listId);
  if (!list) return [];
  const overlay = readOverlay(listId);
  const merge = (record) => ({
    ...record,
    values: { ...record.values, ...(overlay.updated[record.id] ?? {}) },
  });
  return [...list.seed.map(merge), ...overlay.added.map(merge)];
}

export function updateRecord(listId, recordId, patch) {
  const overlay = readOverlay(listId);
  overlay.updated[recordId] = { ...(overlay.updated[recordId] ?? {}), ...patch };
  write(overlayKey(listId), overlay);
}

export function addRecord(listId, values) {
  const overlay = readOverlay(listId);
  const id = `${listId}-rec-${Date.now().toString(36)}`;
  overlay.added.push({ id, values, source: "added manually" });
  write(overlayKey(listId), overlay);
  return id;
}

export function importRecords(listId, rows, source = "csv import") {
  const overlay = readOverlay(listId);
  const start = overlay.added.length;
  overlay.added.push(
    ...rows.map((values, i) => ({
      id: `${listId}-import-${start + i + 1}`,
      values,
      source,
    })),
  );
  write(overlayKey(listId), overlay);
}

/* ── saved views ────────────────────────────────────────────────────────── */
// A saved view captures the whole lens: segment + filters + search + view mode.

function viewsKey(listId) {
  return `${PREFIX}views:${listId}`;
}

export function getSavedViews(listId) {
  return read(viewsKey(listId), []);
}

export function saveView(listId, { name, segment, filters, q, view }) {
  const views = getSavedViews(listId);
  const id = `view-${Date.now().toString(36)}`;
  views.push({ id, name: name.trim(), segment, filters, q, view });
  write(viewsKey(listId), views);
  return id;
}

export function deleteView(listId, viewId) {
  write(viewsKey(listId), getSavedViews(listId).filter((v) => v.id !== viewId));
}

/* ── event log ──────────────────────────────────────────────────────────── */
// Human-logged timeline entries per record: { [recordId]: [{at, text, type}] }

function eventsKey(listId) {
  return `${PREFIX}events:${listId}`;
}

export function getLoggedEvents(listId, recordId) {
  const all = read(eventsKey(listId), {});
  return all[recordId] ?? [];
}

export function logEvent(listId, recordId, text) {
  const all = read(eventsKey(listId), {});
  const at = new Date().toISOString().slice(0, 10);
  all[recordId] = [...(all[recordId] ?? []), { at, text: text.trim(), type: "note" }];
  write(eventsKey(listId), all);
}

// Dev/reset affordance: wipes local edits + imports for one list.
export function resetOverlay(listId) {
  localStorage.removeItem(overlayKey(listId));
  notify();
}
