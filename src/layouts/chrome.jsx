import { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { FileUp, Plus, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { MorseA } from "@/components/brand/morse";
import { HAIR, SUB, USER } from "@/layouts/tokens";
import { SECTIONS, sectionFor } from "@/layouts/nav";
import { addList, getAllLists, getList, importRecords, useListsVersion } from "@/pages/lists/lib/store";
import { applyMapping, mapHeaders, parseCSV } from "@/pages/lists/lib/csv";

// Admin chrome — the merchant app's v1 frame grammar (app/v1/chrome.jsx):
// dark #1b1b1b base, icon rail floating on it, white rounded-[16px] sheets,
// hairline rings. Same tokens, same measurements. Tokens live in
// layouts/tokens.js.

/* ── The rail — floats directly on the dark base layer ─────────────────── */

function RailButton({ section, active, navigate }) {
  const Icon = section.icon;
  return (
    <button
      onClick={() => navigate(section.to)}
      title={section.label}
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] transition-colors",
        active ? "bg-[#333333] text-white" : "text-[#8a8a8a] hover:bg-[#2a2a2a] hover:text-white",
      )}
    >
      <Icon className="h-[18px] w-[18px]" />
    </button>
  );
}

export function Rail({ activeKey }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-full w-[76px] shrink-0 flex-col items-center pb-4 pt-6">
      <Link to="/" title="Anuma Admin">
        <MorseA u={6} gap={5} className="mb-8 shrink-0 text-white" />
      </Link>
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto [scrollbar-width:none]">
        {SECTIONS.map((s) => (
          <RailButton key={s.key} section={s} active={activeKey === s.key} navigate={navigate} />
        ))}
      </div>
    </div>
  );
}

/* ── Sheet header — Admin App banner first, then breadcrumbs, ⌘K pill ──── */

export function SheetHeader() {
  const { pathname } = useLocation();
  const section = sectionFor(pathname);

  // Second crumb: the open list, record tab, or tenant.
  let sub = null;
  const listMatch = /^\/leads\/([^/]+)/.exec(pathname);
  if (listMatch) sub = getList(listMatch[1])?.name ?? null;
  if (pathname.startsWith("/records/companies")) sub = "Companies";
  if (pathname.startsWith("/records/contacts")) sub = "Contacts";
  const tenantMatch = /^\/(?:tenants|merchants)\/([^/]+)/.exec(pathname);
  if (tenantMatch) sub = tenantMatch[1];

  return (
    <div className={cn("relative flex h-[56px] shrink-0 items-center gap-3 border-b bg-white px-4", HAIR)}>
      {/* Which-app banner leads the row — before the breadcrumbs, so there's
          never a doubt about which app this is. */}
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-amber-800 ring-1 ring-amber-300/70">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Admin App
      </span>
      <span className={cn("h-4 w-px shrink-0 bg-[#ececec]")} />
      <div className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {section ? (
          <>
            <Link
              to={section.to}
              className={cn("shrink-0 hover:text-[#1a1a1a]", sub ? SUB : "font-semibold text-[#1a1a1a]")}
            >
              {section.label}
            </Link>
            {sub && (
              <>
                <span className={cn("shrink-0", SUB)}>/</span>
                <span className="truncate font-semibold text-[#1a1a1a]">{sub}</span>
              </>
            )}
          </>
        ) : (
          <span className="font-semibold text-[#1a1a1a]">Anuma Admin</span>
        )}
      </div>

      {/* Search — dead center; design surface only for now */}
      <div className="absolute left-1/2 top-1/2 hidden w-72 -translate-x-1/2 -translate-y-1/2 md:block">
        <div className={cn("flex h-8 items-center gap-2 rounded-full bg-[#f1f2f4] px-3 text-[12px]", SUB)}>
          <Search className="h-3.5 w-3.5" /> Search…
          <span className="ml-auto text-[10px]">⌘K</span>
        </div>
      </div>

      {/* Right cluster: user thumbnail */}
      <div className="ml-auto flex shrink-0 items-center gap-2.5">
        <span
          title={`${USER.name} · ${USER.email}`}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1a1a1a] text-[11px] font-semibold text-white"
        >
          {USER.initials}
        </span>
      </div>
    </div>
  );
}

/* ── Sub-nav column primitives ─────────────────────────────────────────── */

function SubNavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={cn(
        "rounded-[12px] px-2.5 py-2 text-[13px] transition-colors",
        active
          ? "bg-white font-medium text-[#1a1a1a] shadow-[0_1px_2px_rgba(16,17,20,0.06)] ring-1 ring-[#ececec]"
          : "text-[#5c6066] hover:bg-white/70",
      )}
    >
      {children}
    </Link>
  );
}

function SubNavColumn({ title, children }) {
  return (
    <div className={cn("flex w-[210px] shrink-0 flex-col gap-0.5 border-r bg-[#fafafa] p-3", HAIR)}>
      <p className="px-2.5 pb-2 pt-1 text-[13px] font-semibold text-[#1a1a1a]">{title}</p>
      {children}
    </div>
  );
}

/* ── Leads sub-nav — one row per list + "Load list" ────────────────────── */

export function LeadsSubNav() {
  useListsVersion();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const lists = getAllLists();

  return (
    <SubNavColumn title="Leads">
      {lists.map((list) => {
        const to = `/leads/${list.id}`;
        return (
          <SubNavLink key={list.id} to={to} active={pathname === to || pathname.startsWith(to + "/")}>
            {list.name}
          </SubNavLink>
        );
      })}
      <button
        onClick={() => setCreating(true)}
        className="mt-1 flex items-center gap-1.5 rounded-[12px] border border-dashed border-[#d9dade] px-2.5 py-2 text-left text-[13px] text-[#5c6066] transition-colors hover:border-[#1a1a1a]/30 hover:bg-white/70 hover:text-[#1a1a1a]"
      >
        <Plus className="h-3.5 w-3.5" /> Load list
      </button>
      {creating && (
        <LoadListModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            navigate(`/leads/${id}`);
          }}
        />
      )}
    </SubNavColumn>
  );
}

/* ── Records sub-nav — the derived graph ───────────────────────────────── */

export function RecordsSubNav() {
  const { pathname } = useLocation();
  return (
    <SubNavColumn title="Records">
      <SubNavLink to="/records/companies" active={pathname.startsWith("/records/companies")}>
        Companies
      </SubNavLink>
      <SubNavLink to="/records/contacts" active={pathname.startsWith("/records/contacts")}>
        Contacts
      </SubNavLink>
      <p className="mt-2 px-2.5 text-[11px] leading-relaxed text-[#8a8f98]">
        Derived from every lead list — load a generated CRM and its companies &
        contacts appear here, deduped.
      </p>
    </SubNavColumn>
  );
}

/* ── Load list — name it, drop the generated CSV in ────────────────────── */

export function LoadListModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [csv, setCsv] = useState(null); // { fileName, headers, records, mapping }
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const canCreate = name.trim().length > 1;

  const onFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const { headers, records } = parseCSV(text);
      if (!headers.length || !records.length) {
        setError("Couldn't read rows out of that file.");
        return;
      }
      const mapping = mapHeaders(headers);
      setCsv({ fileName: file.name, headers, records, mapping });
      setError("");
      if (!name.trim()) setName(file.name.replace(/\.csv$/i, "").replace(/[-_]+/g, " "));
    } catch {
      setError("Couldn't read that file.");
    }
  };

  const create = () => {
    if (!canCreate) return;
    const extraFields = (csv?.mapping ?? [])
      .filter((m) => !m.known)
      .map((m) => ({ key: m.key, label: m.label }));
    const id = addList({ name, description, extraFields });
    if (csv) {
      importRecords(id, applyMapping(csv.records, csv.mapping), `loaded from ${csv.fileName}`);
    }
    onCreated(id);
  };

  const matched = csv ? csv.mapping.filter((m) => m.known).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm overflow-hidden rounded-[16px] bg-white shadow-2xl ring-1 ring-black/10">
        <button
          onClick={onClose}
          className={cn("absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full hover:bg-[#f1f2f4]", SUB)}
        >
          <X className="h-4 w-4" />
        </button>
        <div className={cn("border-b px-5 py-4", HAIR)}>
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Load a list</h3>
          <p className={cn("mt-0.5 text-[12px]", SUB)}>
            Drop a generated CRM in as CSV — columns map onto the lead vocabulary
            automatically. Or start empty.
          </p>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <label className={cn("mb-1 block text-[11px] font-medium uppercase tracking-wide", SUB)}>Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Diwali 2026 targets"
              className="h-9 w-full rounded-[10px] border border-[#e4e4e7] bg-white px-3 text-sm outline-none placeholder:text-[#b0b3ba] focus:ring-1 focus:ring-[#1a1a1a]/30"
            />
          </div>
          <div>
            <label className={cn("mb-1 block text-[11px] font-medium uppercase tracking-wide", SUB)}>
              Description <span className="normal-case">(optional)</span>
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What lives in this list"
              className="h-9 w-full rounded-[10px] border border-[#e4e4e7] bg-white px-3 text-sm outline-none placeholder:text-[#b0b3ba] focus:ring-1 focus:ring-[#1a1a1a]/30"
            />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex w-full items-center gap-2 rounded-[10px] border border-dashed px-3 py-2.5 text-left text-[13px] transition-colors",
              csv ? "border-emerald-300 bg-emerald-50/50 text-emerald-900" : "border-[#d9dade] text-[#5c6066] hover:border-[#1a1a1a]/30",
            )}
          >
            <FileUp className="h-4 w-4 shrink-0" />
            {csv ? (
              <span className="min-w-0">
                <span className="block truncate font-medium">{csv.fileName}</span>
                <span className="block text-[11px] text-emerald-700">
                  {csv.records.length} rows · {matched} columns matched · {csv.mapping.length - matched} kept as-is
                </span>
              </span>
            ) : (
              "Attach the generated CSV (optional)"
            )}
          </button>
          {error && <p className="text-[12px] text-red-600">{error}</p>}

          <button
            disabled={!canCreate}
            onClick={create}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-full bg-[#1a1a1a] text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:pointer-events-none disabled:opacity-50"
          >
            {csv ? `Load ${csv.records.length} leads` : "Create empty list"}
          </button>
        </div>
      </div>
    </div>
  );
}
