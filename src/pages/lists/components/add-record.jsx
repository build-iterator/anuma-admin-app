// "+ Add" — the minimal quick-create: who they are, how to reach them, where
// they enter the ladder. Everything else gets enriched later (import or edit).

import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { addRecord } from "@/pages/lists/lib/store";
import { todayStr } from "@/pages/lists/lib/signals";

const inputCls =
  "h-9 w-full rounded-[10px] border border-[#e4e4e7] bg-white px-3 text-sm outline-none placeholder:text-[#b0b3ba] focus:ring-1 focus:ring-[#1a1a1a]/30";

const QUICK_KEYS = ["contact_name", "phone", "whatsapp", "email", "city"];

export default function AddRecordModal({ list, onClose, onCreated }) {
  const [values, setValues] = useState({});
  const stageField = list.fields.find((f) => f.key === list.stageField);
  const ownerField = list.fields.find((f) => f.key === "owner");
  const quickFields = QUICK_KEYS.map((k) => list.fields.find((f) => f.key === k)).filter(Boolean);
  const canCreate = (values.company_name ?? "").trim().length > 1;

  const set = (key, v) => setValues((cur) => ({ ...cur, [key]: v }));

  const create = () => {
    if (!canCreate) return;
    const clean = Object.fromEntries(
      Object.entries(values)
        .map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])
        .filter(([, v]) => v),
    );
    clean[list.stageField] = clean[list.stageField] ?? stageField?.options?.[0]?.value;
    clean.source = clean.source ?? "manual entry";
    clean.date_added = todayStr();
    const id = addRecord(list.id, clean);
    onCreated?.(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-[16px] bg-white shadow-2xl ring-1 ring-black/10">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full text-[#8a8f98] hover:bg-[#f1f2f4]"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="border-b border-[#ececec] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">Add to {list.name}</h3>
          <p className="mt-0.5 text-[12px] text-[#8a8f98]">
            Name and a way to reach them — enrich the rest later.
          </p>
        </div>
        <div className="space-y-3 p-5">
          <input
            autoFocus
            value={values.company_name ?? ""}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder="Company name *"
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-2">
            {quickFields.map((f) => (
              <input
                key={f.key}
                value={values[f.key] ?? ""}
                onChange={(e) => set(f.key, e.target.value)}
                placeholder={f.label}
                className={cn(inputCls, "h-8 text-[13px]")}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {stageField && (
              <select
                value={values[list.stageField] ?? stageField.options?.[0]?.value ?? ""}
                onChange={(e) => set(list.stageField, e.target.value)}
                className={cn(inputCls, "h-8 text-[13px]")}
              >
                {stageField.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
            )}
            {ownerField && (
              <select
                value={values.owner ?? ""}
                onChange={(e) => set("owner", e.target.value)}
                className={cn(inputCls, "h-8 text-[13px]")}
              >
                <option value="">Owner…</option>
                {ownerField.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.value}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            disabled={!canCreate}
            onClick={create}
            onKeyDown={(e) => e.key === "Enter" && create()}
            className="flex h-10 w-full items-center justify-center rounded-full bg-[#1a1a1a] text-sm font-medium text-white transition-colors hover:bg-[#333] disabled:pointer-events-none disabled:opacity-50"
          >
            Add record
          </button>
        </div>
      </div>
    </div>
  );
}
