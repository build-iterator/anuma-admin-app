import { useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { useParams, useSearchParams } from "react-router";
import {
  ArrowDown,
  ArrowUp,
  Kanban,
  Mail,
  MessageCircle,
  Phone,
  Search,
  Star,
  Table2,
  Upload,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  deleteView,
  getList,
  getRecords,
  getSavedViews,
  saveView,
  useListsVersion,
} from "@/pages/lists/lib/store";
import { leadsApi } from "@/api/services/leads";
import Importer from "@/components/Importer/Importer";
import { CRM_SEGMENTS, dueState, matchesCrmSegment, nextStageOf, temperature } from "@/pages/lists/lib/signals";
import { advanceStage, setOwner, setStage } from "@/pages/lists/lib/actions";
import { FieldValue, SelectBadge, TempPill } from "@/pages/lists/components/field-cell";
import RecordPanel from "@/pages/lists/components/record-panel";
import AddRecordModal from "@/pages/lists/components/add-record";

// A list — one lens over one table of companies, read as a CRM: every row
// carries a temperature (hot / warm / cold, derived in lib/signals.js) and the
// Reach out segment is the queue. Rows stay thin; the full enriched record and
// its timeline open in the cockpit overlay.

const DEFAULT_FILTERS = {};
const TEMP_RANK = { hot: 0, warm: 1, cold: 2 };

/* ── small atoms ────────────────────────────────────────────────────────── */

function SortHeader({ col, sort, toggle, right, children }) {
  return (
    <button
      onClick={() => toggle(col)}
      className={cn("inline-flex items-center gap-1 hover:text-foreground", right && "flex-row-reverse")}
    >
      {children}
      {sort.col === col && (sort.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  );
}

function OwnerDot({ list, value }) {
  if (!value) return <span className="text-muted-foreground/40">—</span>;
  const field = list.fields.find((f) => f.key === "owner");
  const opt = field?.options?.find((o) => o.value === value);
  return (
    <span
      title={value}
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9.5px] font-semibold"
      style={opt ? { color: opt.color, backgroundColor: opt.bg } : { backgroundColor: "#f3f4f6", color: "#374151" }}
    >
      {value[0]}
    </span>
  );
}

const REACH_ICONS = { phone: Phone, whatsapp: MessageCircle, email: Mail };

function ReachCell({ record, keys }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {keys.map((k) => {
        const Icon = REACH_ICONS[k];
        const v = record.values[k];
        return (
          <Icon
            key={k}
            title={v ? `${k}: ${v}` : `no ${k}`}
            className={cn("h-3.5 w-3.5", v ? "text-emerald-600" : "text-muted-foreground/25")}
          />
        );
      })}
    </span>
  );
}

function ScoreCell({ value, max }) {
  if (value === undefined || value === null || value === "") {
    return <span className="text-muted-foreground/40">—</span>;
  }
  const pct = Math.max(0, Math.min(100, (Number(value) / max) * 100));
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="h-1 w-8 overflow-hidden rounded-full bg-[#f0f1f3]">
        <span className="block h-full rounded-full bg-[#1a1a1a]/70" style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
}

function FactsCell({ record, parts }) {
  const bits = parts
    .map((p) => {
      const v = record.values[p.key];
      if (v === undefined || v === null || v === "") return null;
      if (p.flag) return v === "Yes" ? p.flag : null;
      return `${v}${p.suffix ?? ""}`;
    })
    .filter(Boolean);
  return bits.length ? (
    <span className="text-[11px] text-muted-foreground">{bits.join(" · ")}</span>
  ) : (
    <span className="text-muted-foreground/40">—</span>
  );
}

function ActionCell({ record }) {
  const action = record.values.next_action;
  const date = record.values.next_action_date;
  if (!action && !date) return <span className="text-muted-foreground/40">—</span>;
  const due = dueState(date);
  return (
    <span className="inline-flex max-w-[170px] items-baseline gap-1.5">
      <span className="truncate text-[11.5px]">{action}</span>
      {date && (
        <span
          className={cn(
            "shrink-0 text-[10px] tabular-nums",
            due === "overdue"
              ? "font-semibold text-red-600"
              : due === "today"
                ? "font-semibold text-amber-700"
                : "text-muted-foreground",
          )}
        >
          {date}
        </span>
      )}
    </span>
  );
}

/* ── column spec → header/cell/sort ─────────────────────────────────────── */

function colLabel(list, col) {
  if (col.label) return col.label;
  if (col.kind === "entity") return "Company";
  if (col.kind === "temp") return "Signal";
  if (col.kind === "reach") return "Reach";
  if (col.kind === "action") return "Next action";
  if (col.kind === "owner") return "";
  return list.fields.find((f) => f.key === col.key)?.label ?? col.key;
}

function colSortKey(col) {
  if (col.kind === "entity") return "company_name";
  if (col.kind === "temp") return "__temp";
  if (col.kind === "field" || col.kind === "score") return col.key;
  if (col.kind === "owner") return "owner";
  if (col.kind === "action") return "next_action_date";
  return null;
}

function Cell({ list, col, record }) {
  switch (col.kind) {
    case "entity": {
      const sub = (col.sub ?? [])
        .map((k) => record.values[k])
        .filter(Boolean)
        .join(" · ");
      return (
        <span className="flex min-w-0 items-baseline gap-1.5">
          <span className="truncate font-medium">{record.values.company_name || "—"}</span>
          {sub && <span className="hidden truncate text-[11px] text-muted-foreground xl:inline">{sub}</span>}
        </span>
      );
    }
    case "temp":
      return <TempPill temp={temperature(list, record)} />;
    case "score":
      return <ScoreCell value={record.values[col.key]} max={col.max ?? 20} />;
    case "reach":
      return <ReachCell record={record} keys={col.keys ?? ["phone", "whatsapp", "email"]} />;
    case "facts":
      return <FactsCell record={record} parts={col.parts ?? []} />;
    case "action":
      return <ActionCell record={record} />;
    case "owner":
      return <OwnerDot list={list} value={record.values.owner} />;
    default: {
      const field = list.fields.find((f) => f.key === col.key);
      return field ? <FieldValue field={field} value={record.values[col.key]} /> : null;
    }
  }
}

/* ── thin table ─────────────────────────────────────────────────────────── */

function SignalTable({ list, rows, sort, toggle, onOpen, selected, onToggleRow, onToggleAll }) {
  // Temperature sits right after the entity column on every list.
  const cols = useMemo(() => {
    const spec = [...list.table];
    spec.splice(1, 0, { kind: "temp" });
    return spec;
  }, [list]);

  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[880px] text-[12.5px]">
        <thead>
          <tr className="border-b bg-muted/30 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="w-8 px-3 py-2">
              <input
                type="checkbox"
                checked={allChecked}
                onChange={() => onToggleAll(rows)}
                className="h-3.5 w-3.5 accent-[#1a1a1a]"
              />
            </th>
            {cols.map((col, i) => {
              const sortKey = colSortKey(col);
              const right = col.kind === "score";
              return (
                <th key={i} className={cn("px-3 py-2 text-left font-semibold", right && "text-right")}>
                  {sortKey ? (
                    <SortHeader col={sortKey} sort={sort} toggle={toggle} right={right}>
                      {colLabel(list, col)}
                    </SortHeader>
                  ) : (
                    colLabel(list, col)
                  )}
                </th>
              );
            })}
            <th className="w-24 px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => {
            const next = nextStageOf(list, r);
            return (
              <tr
                key={r.id}
                onClick={() => onOpen(r)}
                className="group cursor-pointer transition-colors hover:bg-muted/20"
              >
                <td className="w-8 px-3 py-1.5" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => onToggleRow(r.id)}
                    className="h-3.5 w-3.5 accent-[#1a1a1a]"
                  />
                </td>
                {cols.map((col, i) => (
                  <td
                    key={i}
                    className={cn(
                      "whitespace-nowrap px-3 py-1.5 align-middle",
                      col.kind === "score" && "text-right",
                      col.kind === "entity" && "max-w-[260px]",
                    )}
                  >
                    <Cell list={list} col={col} record={r} />
                  </td>
                ))}
                <td className="w-24 whitespace-nowrap px-2 py-1.5 text-right">
                  {next && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        advanceStage(list, r);
                      }}
                      title={`Done → ${next}`}
                      className="invisible inline-flex h-6 items-center gap-0.5 rounded-md border px-1.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:bg-[#1a1a1a] hover:text-white group-hover:visible"
                    >
                      ✓ {next}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 2} className="px-3 py-10 text-center text-sm text-muted-foreground">
                Nothing matches.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── board ──────────────────────────────────────────────────────────────── */

function Board({ list, rows, onOpen }) {
  const stageField = list.fields.find((f) => f.key === list.stageField);
  const stages = stageField?.options ?? [];
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {stages.map((stage) => {
        const cards = rows.filter((r) => r.values[list.stageField] === stage.value);
        return (
          <div key={stage.value} className="flex w-[240px] shrink-0 flex-col rounded-xl bg-[#f7f7f8] p-2">
            <div className="flex items-center justify-between px-1.5 pb-2 pt-1">
              <SelectBadge field={stageField} value={stage.value} />
              <span className="text-[11px] tabular-nums text-muted-foreground">{cards.length}</span>
            </div>
            <div className="flex min-h-[80px] flex-col gap-1.5">
              {cards.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onOpen(r)}
                  className="rounded-[10px] bg-white p-2.5 text-left shadow-[0_1px_2px_rgba(16,17,20,0.06)] ring-1 ring-[#ececec] transition-shadow hover:shadow-md"
                >
                  <span className="flex items-center gap-1.5">
                    <span className="min-w-0 truncate text-[13px] font-medium">{r.values.company_name}</span>
                    <span className="ml-auto shrink-0">
                      <TempPill temp={temperature(list, r)} />
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                    {[r.values.city, r.values.category ?? r.values.type].filter(Boolean).join(" · ")}
                  </span>
                  {(r.values.next_action || r.values.next_action_date) && (
                    <span className="mt-1.5 flex items-baseline gap-1.5 text-[10.5px] text-muted-foreground">
                      <span className="truncate">{r.values.next_action}</span>
                      {r.values.next_action_date && (
                        <span className="ml-auto shrink-0 tabular-nums">{r.values.next_action_date}</span>
                      )}
                    </span>
                  )}
                </button>
              ))}
              {cards.length === 0 && (
                <span className="rounded-[10px] border border-dashed border-[#e2e3e6] px-2 py-4 text-center text-[11px] text-muted-foreground/60">
                  empty
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── the page ───────────────────────────────────────────────────────────── */

export default function ListPage() {
  const { listId } = useParams();
  const [searchParams] = useSearchParams();
  const version = useListsVersion();
  const list = getList(listId);
  const dispatch = useDispatch();

  const openParam = searchParams.get("open");
  const [view, setView] = useState("table");
  const [segment, setSegment] = useState("all");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [sort, setSort] = useState({ col: null, dir: "asc" });
  const [openId, setOpenId] = useState(openParam);
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [naming, setNaming] = useState(false);
  const [viewName, setViewName] = useState("");
  const [importerOpen, setImporterOpen] = useState(false);

  // The route component survives list-to-list navigation (same Route),
  // so lens state resets and ?open= applies via render adjustment.
  const navKey = `${listId}:${openParam ?? ""}`;
  const [seenNavKey, setSeenNavKey] = useState(navKey);
  if (navKey !== seenNavKey) {
    const listChanged = seenNavKey.split(":")[0] !== listId;
    setSeenNavKey(navKey);
    if (listChanged) {
      setSegment("all");
      setQ("");
      setFilters(DEFAULT_FILTERS);
      setSort({ col: null, dir: "asc" });
      setSelected(new Set());
      setOpenId(openParam);
    } else if (openParam) {
      setOpenId(openParam);
    }
  }

  // Refresh the records list after a successful backend-driven import.
  // The wizard doesn't know about leadsApi — the parent invalidates its own
  // slice tag so `useGetRecordsQuery(listId)` refetches on next mount.
  const handleImportDone = (logs) => {
    if (list?.id) {
      dispatch(leadsApi.util.invalidateTags([{ type: "Records", id: list.id }]));
    }
    const created = logs?.created ?? 0;
    const updated = logs?.updated ?? 0;
    const failed = logs?.failed?.length ?? 0;
    // sonner isn't wired in this project; a plain alert is intentional
    alert(`Imported ${created} new, ${updated} updated, ${failed} failed`);
  };

  // `version` re-reads the store after every mutation (edit, advance, add).
  const records = useMemo(
    () => (list ? getRecords(list.id) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list, version],
  );
  const openRecord = useMemo(() => records.find((r) => r.id === openId) ?? null, [records, openId]);
  const savedViews = list ? getSavedViews(list.id) : [];
  const selectFields = (list?.fields ?? []).filter((f) => f.type === "select");

  const toggleRow = (id) =>
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (visibleRows) =>
    setSelected((cur) => {
      const all = visibleRows.every((r) => cur.has(r.id));
      const next = new Set(cur);
      visibleRows.forEach((r) => (all ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  const bulkApply = (fn) => {
    records.filter((r) => selected.has(r.id)).forEach((r) => fn(r));
  };

  const segmentCount = (s) => records.filter((r) => matchesCrmSegment(list, r, s.key)).length;

  const rows = useMemo(() => {
    if (!list) return [];
    const needle = q.trim().toLowerCase();
    let out = records.filter((r) => {
      if (!matchesCrmSegment(list, r, segment)) return false;
      if (filters.revenue_min || filters.revenue_max) {
        const revenue = Number(r.values.annual_revenue_usd);
        if (Number.isNaN(revenue)) return false;
        if (filters.revenue_min && revenue < Number(filters.revenue_min)) return false;
        if (filters.revenue_max && revenue > Number(filters.revenue_max)) return false;
      }
      for (const [key, v] of Object.entries(filters)) {
        if (key === "revenue_min" || key === "revenue_max") continue;
        if (v && r.values[key] !== v) return false;
      }
      if (!needle) return true;
      return Object.values(r.values).some((val) => String(val).toLowerCase().includes(needle));
    });
    if (sort.col) {
      out = [...out].sort((a, b) => {
        if (sort.col === "__temp") {
          const cmp = TEMP_RANK[temperature(list, a).key] - TEMP_RANK[temperature(list, b).key];
          return sort.dir === "asc" ? cmp : -cmp;
        }
        const av = a.values[sort.col];
        const bv = b.values[sort.col];
        if (av === undefined || av === "") return 1;
        if (bv === undefined || bv === "") return -1;
        const cmp =
          typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sort.dir === "asc" ? cmp : -cmp;
      });
    }
    return out;
  }, [list, records, segment, filters, q, sort]);

  const toggleSort = (col) =>
    setSort((s) => (s.col === col ? { col, dir: s.dir === "asc" ? "desc" : "asc" } : { col, dir: "asc" }));

  const hasLens = q || segment !== "all" || Object.values(filters).some(Boolean);

  const applySaved = (v) => {
    setSegment(v.segment ?? "all");
    setFilters(v.filters ?? {});
    setQ(v.q ?? "");
    setView(v.view ?? "table");
  };

  if (!list) {
    return <div className="px-6 text-sm text-muted-foreground">Unknown list.</div>;
  }

  return (
    <div className={cn("os-enter mx-auto space-y-4 px-4 sm:px-6 lg:px-8", view === "board" ? "max-w-none" : "max-w-6xl")}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{list.name}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {rows.length} of {records.length} · {list.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdding(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            + Add
          </button>
          <button
            onClick={() => setImporterOpen(true)}
            title="Import a CSV or Excel file into this list"
            className="flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </button>
          <div className="flex rounded-lg border p-0.5">
            {[
              { id: "table", icon: Table2 },
              { id: "board", icon: Kanban },
            ].map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                title={v.id}
                className={cn(
                  "flex h-8 items-center rounded-md px-2.5 transition-colors",
                  view === v.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <v.icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CRM segments + saved views */}
      <div className="flex flex-wrap items-center gap-1 border-b">
        {CRM_SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setSegment(s.key)}
            className={cn(
              "border-b-2 px-3 py-2 text-sm transition-colors",
              segment === s.key
                ? "border-primary font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}{" "}
            <span className="ml-1 text-xs tabular-nums text-muted-foreground/70">{segmentCount(s)}</span>
          </button>
        ))}
        {savedViews.length > 0 && <span className="mx-1.5 h-4 w-px self-center bg-border" />}
        {savedViews.map((v) => (
          <span key={v.id} className="group relative self-center">
            <button
              onClick={() => applySaved(v)}
              className="flex items-center gap-1 rounded-full bg-muted/60 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Star className="h-3 w-3" /> {v.name}
            </button>
            <button
              onClick={() => deleteView(list.id, v.id)}
              title="Delete view"
              className="absolute -right-1 -top-1 hidden h-3.5 w-3.5 items-center justify-center rounded-full bg-foreground text-background group-hover:flex"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
      </div>

      {/* Search + filters + save-view */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search any field…"
            className="h-8 w-64 rounded-md border bg-muted/30 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-background focus:ring-1 focus:ring-ring"
          />
        </div>
        {selectFields.map((f) => (
          <select
            key={f.key}
            value={filters[f.key] ?? ""}
            onChange={(e) => setFilters((cur) => ({ ...cur, [f.key]: e.target.value || undefined }))}
            className="h-8 rounded-md border bg-muted/30 px-2 text-xs text-foreground outline-none focus:bg-background focus:ring-1 focus:ring-ring"
          >
            <option value="">{`All ${f.label.toLowerCase()}s`}</option>
            {f.options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value}
              </option>
            ))}
          </select>
        ))}
        <span className="flex items-center gap-1">
          <input
            type="number"
            inputMode="numeric"
            value={filters.revenue_min ?? ""}
            onChange={(e) => setFilters((cur) => ({ ...cur, revenue_min: e.target.value || undefined }))}
            placeholder="Min revenue"
            className="h-8 w-28 rounded-md border bg-muted/30 px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:bg-background focus:ring-1 focus:ring-ring"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <input
            type="number"
            inputMode="numeric"
            value={filters.revenue_max ?? ""}
            onChange={(e) => setFilters((cur) => ({ ...cur, revenue_max: e.target.value || undefined }))}
            placeholder="Max revenue"
            className="h-8 w-28 rounded-md border bg-muted/30 px-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:bg-background focus:ring-1 focus:ring-ring"
          />
        </span>
        {hasLens && (
          <>
            <button
              onClick={() => {
                setQ("");
                setFilters(DEFAULT_FILTERS);
                setSegment("all");
              }}
              className="text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              clear
            </button>
            {naming ? (
              <input
                autoFocus
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && viewName.trim()) {
                    saveView(list.id, { name: viewName, segment, filters, q, view });
                    setNaming(false);
                    setViewName("");
                  }
                  if (e.key === "Escape") setNaming(false);
                }}
                placeholder="Name this view…"
                className="h-7 w-36 rounded-md border bg-background px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
            ) : (
              <button
                onClick={() => setNaming(true)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Star className="h-3 w-3" /> Save view
              </button>
            )}
          </>
        )}
      </div>

      {/* Bulk bar — appears when rows are selected */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2.5 rounded-xl bg-[#1a1a1a] px-3 py-2 text-white">
          <span className="text-xs font-semibold tabular-nums">{selected.size} selected</span>
          <span className="h-4 w-px bg-white/20" />
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const owner = e.target.value;
              bulkApply((r) => setOwner(list, r, owner));
              e.target.value = "";
            }}
            className="h-7 rounded-md border border-white/20 bg-transparent px-1.5 text-xs text-white outline-none [&>option]:text-black"
          >
            <option value="">Assign to…</option>
            {list.fields
              .find((f) => f.key === "owner")
              ?.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value}
                </option>
              ))}
          </select>
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const stage = e.target.value;
              bulkApply((r) => setStage(list, r, stage));
              e.target.value = "";
            }}
            className="h-7 rounded-md border border-white/20 bg-transparent px-1.5 text-xs text-white outline-none [&>option]:text-black"
          >
            <option value="">Set stage…</option>
            {list.fields
              .find((f) => f.key === list.stageField)
              ?.options?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.value}
                </option>
              ))}
          </select>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-white/60 underline-offset-4 hover:text-white hover:underline"
          >
            clear selection
          </button>
        </div>
      )}

      {/* Rows */}
      {records.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-center">
          <Upload className="h-5 w-5 text-muted-foreground/60" />
          <p className="text-sm font-medium">No leads in {list.name} yet</p>
          <p className="max-w-sm text-[13px] text-muted-foreground">
            Import a generated CSV (button above) or add one by hand. {list.description}
          </p>
        </div>
      ) : view === "board" ? (
        <Board list={list} rows={rows} onOpen={(r) => setOpenId(r.id)} />
      ) : (
        <SignalTable
          list={list}
          rows={rows}
          sort={sort}
          toggle={toggleSort}
          onOpen={(r) => setOpenId(r.id)}
          selected={selected}
          onToggleRow={toggleRow}
          onToggleAll={toggleAll}
        />
      )}

      <p className="text-[11px] text-muted-foreground">
        Temperature is derived from fit, stage and reachability (override it in the record) — hover a row for
        the quick-advance, open it for the full record and timeline.
      </p>

      <RecordPanel list={list} record={openRecord} onClose={() => setOpenId(null)} />
      {adding && (
        <AddRecordModal list={list} onClose={() => setAdding(false)} onCreated={(id) => setOpenId(id)} />
      )}
      <Importer
        target="leads.records"
        targetRef={listId}
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        onCompleted={handleImportDone}
      />
    </div>
  );
}
