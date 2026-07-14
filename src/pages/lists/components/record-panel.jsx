// Record cockpit — the v1-leads-style overlay, now with the write path:
// stage / owner / next action edit in place, temperature can be overruled,
// and Done / Snooze work the queue. Every change lands on the timeline.

import { useMemo, useState } from "react";
import { ArrowUpRight, Check, ChevronDown, ChevronsRight, Clock, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { FieldValue, TempPill } from "@/pages/lists/components/field-cell";
import { baseEvents, dueState, nextStageOf, temperature, TEMPS } from "@/pages/lists/lib/signals";
import {
  advanceStage,
  setNextAction,
  setOwner,
  setStage,
  setTemperature,
  snooze,
} from "@/pages/lists/lib/actions";
import { getLoggedEvents, useListsVersion, logEvent } from "@/pages/lists/lib/store";
import { useGetRecordEventsQuery } from "@/api/services/leads";

const CONTACT_KEYS = ["contact_name", "contact_role", "phone", "whatsapp", "email", "website", "indiamart_url", "shopify_domain", "city", "state", "cluster"];

const selectCls =
  "h-7 rounded-md border bg-muted/30 px-1.5 text-xs text-foreground outline-none focus:bg-background focus:ring-1 focus:ring-ring";

/* ── inline editors ─────────────────────────────────────────────────────── */

function StageSelect({ list, record }) {
  const field = list.fields.find((f) => f.key === list.stageField);
  const value = record.values[list.stageField] ?? "";
  const opt = field?.options?.find((o) => o.value === value);
  return (
    <select
      value={value}
      onChange={(e) => setStage(list, record, e.target.value)}
      className={cn(selectCls, "font-medium")}
      style={opt ? { color: opt.color, backgroundColor: opt.bg, borderColor: "transparent" } : undefined}
    >
      {!value && <option value="">stage…</option>}
      {field?.options?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value}
        </option>
      ))}
    </select>
  );
}

function OwnerSelect({ list, record }) {
  const field = list.fields.find((f) => f.key === "owner");
  return (
    <select
      value={record.values.owner ?? ""}
      onChange={(e) => setOwner(list, record, e.target.value)}
      className={selectCls}
    >
      <option value="">unowned</option>
      {field?.options?.map((o) => (
        <option key={o.value} value={o.value}>
          {o.value}
        </option>
      ))}
    </select>
  );
}

function TempMenu({ list, record }) {
  const [open, setOpen] = useState(false);
  const temp = temperature(list, record);
  return (
    <span className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-0.5" title="Override temperature">
        <TempPill temp={temp} />
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>
      {open && (
        <>
          <span className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <span className="absolute left-0 top-full z-50 mt-1 flex w-32 flex-col overflow-hidden rounded-[10px] bg-white p-1 shadow-xl ring-1 ring-black/10">
            {Object.values(TEMPS).map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setTemperature(list, record, t.key);
                  setOpen(false);
                }}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted/50"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.label}
                {temp.overridden && temp.key === t.key && <Check className="ml-auto h-3 w-3" />}
              </button>
            ))}
            <button
              onClick={() => {
                setTemperature(list, record, null);
                setOpen(false);
              }}
              className="rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted/50"
            >
              Auto (derived)
            </button>
          </span>
        </>
      )}
    </span>
  );
}

function NextActionEditor({ list, record }) {
  const v = record.values;
  const [action, setAction] = useState(v.next_action ?? "");
  const [date, setDate] = useState(v.next_action_date ?? "");
  const due = dueState(v.next_action_date);
  const dirty = action !== (v.next_action ?? "") || date !== (v.next_action_date ?? "");

  const commit = () => dirty && setNextAction(list, record, action, date);

  return (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5",
        due === "overdue"
          ? "border-red-200 bg-red-50"
          : due === "today"
            ? "border-amber-200 bg-amber-50"
            : "border-border bg-muted/20",
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
          Next action{due === "overdue" ? " · overdue" : due === "today" ? " · today" : ""}
        </p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => snooze(list, record)}
            title="Snooze 3 days"
            className="flex h-6 items-center gap-1 rounded-md px-1.5 text-[11px] text-muted-foreground hover:bg-white hover:text-foreground"
          >
            <Clock className="h-3 w-3" /> Snooze
          </button>
          {nextStageOf(list, record) && (
            <button
              onClick={() => advanceStage(list, record)}
              title={`Done → ${nextStageOf(list, record)}`}
              className="flex h-6 items-center gap-1 rounded-md bg-[#1a1a1a] px-2 text-[11px] font-medium text-white hover:bg-[#333]"
            >
              <ChevronsRight className="h-3 w-3" /> Done → {nextStageOf(list, record)}
            </button>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          value={action}
          onChange={(e) => setAction(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          placeholder="What happens next…"
          className="h-7 min-w-0 flex-1 rounded-md border bg-white/70 px-2 text-xs outline-none placeholder:text-muted-foreground focus:bg-white focus:ring-1 focus:ring-ring"
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          onBlur={commit}
          className="h-7 rounded-md border bg-white/70 px-1.5 text-[11px] tabular-nums outline-none focus:bg-white focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}

/* ── read-only atoms ────────────────────────────────────────────────────── */

function FieldRow({ field, value }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-baseline gap-2 py-1">
      <span className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {field.label}
      </span>
      <span className="min-w-0 break-words text-[12.5px]">
        <FieldValue field={field} value={value} />
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="rounded-xl border bg-card px-4 py-3">
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Timeline({ list, record }) {
  const version = useListsVersion();
  // Hydrate this record's timeline into the RTK Query cache — the sync
  // getLoggedEvents below reads it back through lib/store.js.
  useGetRecordEventsQuery({ slug: list.id, rid: record.id });
  const [draft, setDraft] = useState("");
  const events = useMemo(() => {
    const logged = getLoggedEvents(list.id, record.id);
    return [...baseEvents(list, record), ...logged].reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, record, version]);

  const submit = () => {
    if (!draft.trim()) return;
    logEvent(list.id, record.id, draft);
    setDraft("");
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2.5">
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="Log an event — called, replied, met…"
        className="h-8 w-full shrink-0 rounded-[10px] border bg-muted/30 px-3 text-[12.5px] outline-none placeholder:text-muted-foreground focus:bg-background focus:ring-1 focus:ring-ring"
      />
      <div className="relative min-h-0 flex-1 overflow-y-auto pl-4">
        <span className="absolute bottom-1 left-[3px] top-1 w-px bg-border" />
        <div className="flex flex-col gap-3 py-1">
          {events.map((e, i) => (
            <div key={i} className="relative">
              <span
                className={cn(
                  "absolute -left-[15px] top-[5px] h-[7px] w-[7px] rounded-full",
                  e.type === "note" ? "bg-[#1a1a1a]" : "bg-muted-foreground/40",
                )}
              />
              <p className="text-[12.5px] leading-snug">{e.text}</p>
              {e.at && <p className="text-[10.5px] tabular-nums text-muted-foreground">{e.at}</p>}
            </div>
          ))}
          {events.length === 0 && <p className="text-[12px] text-muted-foreground">No history yet.</p>}
        </div>
      </div>
    </div>
  );
}

/* ── the cockpit ────────────────────────────────────────────────────────── */

export default function RecordPanel({ list, record, onClose }) {
  if (!record) return null;
  const values = record.values;

  const notesFields = list.fields.filter((f) => f.type === "notes");
  const contactFields = list.fields.filter((f) => CONTACT_KEYS.includes(f.key) && values[f.key]);
  const skip = new Set([
    "company_name",
    "owner",
    "next_action",
    "next_action_date",
    list.stageField,
    ...CONTACT_KEYS,
    ...notesFields.map((f) => f.key),
  ]);
  const detailFields = list.fields.filter((f) => !skip.has(f.key));

  const primaryLink = values.website || values.indiamart_url || values.shopify_domain;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex max-h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground shadow-sm ring-1 ring-border backdrop-blur hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header — who, and the working state (all editable) */}
        <div className="shrink-0 border-b px-6 pb-4 pt-5">
          <div className="flex items-center gap-2 pr-10">
            <h2 className="truncate text-lg font-semibold tracking-tight">{values.company_name}</h2>
            {primaryLink && (
              <a
                href={/^https?:/.test(primaryLink) ? primaryLink : `https://${primaryLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <TempMenu list={list} record={record} />
            <StageSelect list={list} record={record} />
            <OwnerSelect list={list} record={record} />
            <span className="text-[11px] text-muted-foreground">
              {[values.city, values.category ?? values.type].filter(Boolean).join(" · ")}
              {record.source ? ` · ${record.source}` : ""}
            </span>
          </div>
        </div>

        {/* Body — fields left, work right */}
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 md:grid-cols-[1fr_300px] md:overflow-hidden">
          <div className="min-h-0 space-y-3 md:overflow-y-auto md:pr-1">
            {contactFields.length > 0 && (
              <Section title="Contact">
                {contactFields.map((f) => (
                  <FieldRow key={f.key} field={f} value={values[f.key]} />
                ))}
              </Section>
            )}
            <Section title="Profile">
              {detailFields.map((f) => (
                <FieldRow key={f.key} field={f} value={values[f.key]} />
              ))}
            </Section>
            {notesFields.map(
              (f) =>
                values[f.key] && (
                  <Section key={f.key} title={f.label}>
                    <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed">{values[f.key]}</p>
                  </Section>
                ),
            )}
          </div>
          <div className="flex min-h-[300px] flex-col gap-3 md:min-h-0">
            {/* Keyed on the stored values so Snooze/Done remount the editor
                with fresh state instead of leaving stale local drafts. */}
            <NextActionEditor
              key={`${record.id}:${values.next_action ?? ""}:${values.next_action_date ?? ""}`}
              list={list}
              record={record}
            />
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              Timeline
            </p>
            <Timeline list={list} record={record} />
          </div>
        </div>
      </div>
    </div>
  );
}
