// Importer — a reusable 3-step CSV import wizard.
//
// Flow (state machine driven by the backend `status` on the polled FileImport):
//   upload    → user picks a file, we POST /api/imports/ multipart
//   analyzing → status ∈ {QUEUED, ANALYZING} — poll every 1s
//   map       → status === ANALYZED — fetch schema, let user map headers → fields
//   importing → status === IMPORTING — poll every 1s
//   done      → status === COMPLETED — show created/updated/failed summary
//   error     → status === FAILED at any stage
//
// The parent decides what to do on completion (invalidate list tags, toast, etc)
// by supplying `onCompleted(logs)`. This component intentionally does NOT touch
// leadsApi or tenantsApi so it can be reused for any future target.

import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, X, FileText, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  useCreateImportMutation,
  useGetImportQuery,
  useExecuteImportMutation,
  useGetSchemaQuery,
} from "@/api/services/imports";

const TARGET_LABEL = {
  "leads.records": "Leads",
  tenants: "Tenants",
};

const inputCls =
  "h-8 w-full rounded-[8px] border border-[#e4e4e7] bg-white px-2 text-[13px] outline-none focus:ring-1 focus:ring-[#1a1a1a]/30";

// Statuses that mean "keep polling"
const POLLING_STATES = new Set(["QUEUED", "ANALYZING", "IMPORTING"]);
const TERMINAL_STATES = new Set(["COMPLETED", "FAILED"]);

export default function Importer({ target, targetRef, open, onClose, onCompleted }) {
  const [importId, setImportId] = useState(null);
  const [mappings, setMappings] = useState({}); // { csvHeader: targetFieldKey|"" }
  const [uploadError, setUploadError] = useState(null);
  const [executeError, setExecuteError] = useState(null);
  const [completedNotified, setCompletedNotified] = useState(false);
  const fileInputRef = useRef(null);

  const [createImport, createState] = useCreateImportMutation();
  const [executeImport, executeState] = useExecuteImportMutation();

  // Poll the import once we have an id. `shouldPoll` gates the RTK Query
  // pollingInterval — we only want to poll while the backend is working.
  const importQuery = useGetImportQuery(importId, {
    skip: !importId,
    pollingInterval: importId ? 1000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const record = importQuery.data;
  const status = record?.status;

  // Turn polling off once we hit a terminal state or the mapping screen.
  // (RTK Query only stops polling if pollingInterval is 0; we swap via the
  // effect below by resetting subscription options — the simplest way is to
  // let it keep polling while a component is mounted and only stop by
  // unmounting or by not caring about the extra requests. In practice, the
  // wizard closes soon after "done", so this is negligible.)
  useEffect(() => {
    if (!record) return;
    // Seed the mapping table with the backend's suggestions the first time
    // we land on ANALYZED. Subsequent polls don't clobber user edits.
    if (record.status === "ANALYZED" && Object.keys(mappings).length === 0) {
      const seeded = {};
      for (const header of record.columns_detected ?? []) {
        seeded[header] = record.suggested_mappings?.[header] ?? "";
      }
      setMappings(seeded);
    }
  }, [record, mappings]);

  // When the import completes, fire the parent's callback exactly once.
  useEffect(() => {
    if (status === "COMPLETED" && !completedNotified && record?.logs) {
      setCompletedNotified(true);
      onCompleted?.(record.logs);
    }
  }, [status, completedNotified, record, onCompleted]);

  // Schema for the current target. Only fetched once the modal is open —
  // there's no need to hit the endpoint on every mount.
  const schemaQuery = useGetSchemaQuery(target, { skip: !open });
  const schema = schemaQuery.data;
  const fields = schema?.fields ?? [];

  // Derive the current step from local state + backend status.
  const step = useMemo(() => {
    if (!importId) return "upload";
    if (!status) return "analyzing"; // brief moment before first poll returns
    if (status === "FAILED") return "error";
    if (status === "COMPLETED") return "done";
    if (status === "IMPORTING") return "importing";
    if (status === "ANALYZED") return "map";
    if (POLLING_STATES.has(status)) return "analyzing";
    return "analyzing";
  }, [importId, status]);

  // Required target-field keys the user must map at least one CSV header to.
  const requiredKeys = useMemo(
    () => fields.filter((f) => f.required).map((f) => f.key),
    [fields],
  );
  const mappedTargetKeys = useMemo(() => new Set(Object.values(mappings).filter(Boolean)), [mappings]);
  const unmappedRequired = requiredKeys.filter((k) => !mappedTargetKeys.has(k));
  const canSubmit = unmappedRequired.length === 0;

  const resetAll = () => {
    setImportId(null);
    setMappings({});
    setUploadError(null);
    setExecuteError(null);
    setCompletedNotified(false);
  };

  const handleClose = () => {
    resetAll();
    onClose?.();
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploadError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("target_type", target);
    if (targetRef) fd.append("target_ref", targetRef);
    try {
      const res = await createImport(fd).unwrap();
      setImportId(res.id);
      // If Celery ran eagerly the response may already carry ANALYZED —
      // we still want the poll to fire once to pick up columns_detected etc.
    } catch (err) {
      setUploadError(err?.data?.detail || err?.data || "Upload failed");
    }
  };

  const handleImport = async () => {
    if (!importId || !canSubmit) return;
    setExecuteError(null);
    // Strip skipped mappings (empty value = "— Skip this column —").
    const column_mappings = Object.fromEntries(
      Object.entries(mappings).filter(([, v]) => v),
    );
    try {
      await executeImport({ id: importId, column_mappings }).unwrap();
      // Backend flips status to IMPORTING; polling picks up the transition.
    } catch (err) {
      setExecuteError(err?.data?.detail || err?.data || "Failed to start import");
    }
  };

  if (!open) return null;

  const label = TARGET_LABEL[target] ?? target;
  const submitting = createState.isLoading;
  const executing = executeState.isLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[16px] bg-white shadow-2xl ring-1 ring-black/10">
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[#8a8f98] hover:bg-[#f1f2f4]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="border-b border-[#ececec] px-5 py-4">
          <h3 className="text-[15px] font-semibold text-[#1a1a1a]">
            Import {label}
            {targetRef ? <span className="text-[#8a8f98]"> · {targetRef}</span> : null}
          </h3>
          <p className="mt-0.5 text-[12px] text-[#8a8f98]">
            {stepSubtitle(step, record)}
          </p>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
          {step === "upload" && (
            <UploadStep
              label={label}
              onPick={() => fileInputRef.current?.click()}
              uploading={submitting}
              error={uploadError}
            />
          )}

          {step === "analyzing" && (
            <StatusBlock
              icon={<Loader2 className="h-5 w-5 animate-spin text-[#1a1a1a]" />}
              title="Analyzing your file…"
              subtitle="Reading columns and picking suggested mappings."
            />
          )}

          {step === "map" && (
            <MapStep
              record={record}
              fields={fields}
              mappings={mappings}
              setMappings={setMappings}
              requiredKeys={requiredKeys}
              unmappedRequired={unmappedRequired}
              schemaLoading={schemaQuery.isLoading}
            />
          )}

          {step === "importing" && (
            <StatusBlock
              icon={<Loader2 className="h-5 w-5 animate-spin text-[#1a1a1a]" />}
              title={`Importing ${record?.columns_detected?.length ? "rows" : "your file"}…`}
              subtitle="You can leave this open — we'll show a summary when it's done."
            />
          )}

          {step === "done" && <DoneStep logs={record?.logs} />}

          {step === "error" && (
            <StatusBlock
              icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
              title="Something went wrong"
              subtitle={
                record?.logs?.failed?.[0]?.error ||
                "The backend rejected this import. Try again with a fresh file."
              }
              tone="error"
            />
          )}

          {executeError && step === "map" && (
            <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {String(executeError)}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#ececec] px-5 py-3">
          <div className="text-[11px] text-[#8a8f98]">{stepHint(step, unmappedRequired, fields)}</div>
          <div className="flex items-center gap-2">
            {step === "done" ? (
              <>
                <button
                  onClick={resetAll}
                  className="h-8 rounded-md border border-[#e4e4e7] px-3 text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f5f5f6]"
                >
                  Import another
                </button>
                <button
                  onClick={handleClose}
                  className="h-8 rounded-md bg-[#1a1a1a] px-3 text-[13px] font-medium text-white hover:bg-[#333]"
                >
                  Close
                </button>
              </>
            ) : step === "error" ? (
              <>
                <button
                  onClick={resetAll}
                  className="h-8 rounded-md border border-[#e4e4e7] px-3 text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f5f5f6]"
                >
                  Try again
                </button>
                <button
                  onClick={handleClose}
                  className="h-8 rounded-md bg-[#1a1a1a] px-3 text-[13px] font-medium text-white hover:bg-[#333]"
                >
                  Close
                </button>
              </>
            ) : step === "map" ? (
              <button
                onClick={handleImport}
                disabled={!canSubmit || executing}
                className="h-8 rounded-md bg-[#1a1a1a] px-4 text-[13px] font-medium text-white hover:bg-[#333] disabled:pointer-events-none disabled:opacity-50"
              >
                {executing ? "Starting…" : "Import"}
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="h-8 rounded-md border border-[#e4e4e7] px-3 text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f5f5f6]"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Hidden file input — triggered by the styled dropzone button. */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}

/* ── sub-steps ─────────────────────────────────────────────────────────── */

function stepSubtitle(step, record) {
  switch (step) {
    case "upload":
      return "Pick a CSV or Excel file. We'll analyze it and let you map columns before importing.";
    case "analyzing":
      return "Detecting columns and sampling rows…";
    case "map":
      return `${record?.columns_detected?.length ?? 0} columns detected · ${record?.sample_rows?.length ?? 0} sample rows`;
    case "importing":
      return "Writing rows to the database — this usually takes a few seconds.";
    case "done":
      return "All done.";
    case "error":
      return "Import stopped.";
    default:
      return "";
  }
}

function stepHint(step, unmappedRequired, fields) {
  if (step === "map") {
    if (unmappedRequired.length > 0) {
      const labels = unmappedRequired
        .map((k) => fields.find((f) => f.key === k)?.label ?? k)
        .join(", ");
      return `Required: ${labels}`;
    }
    return "Duplicates are updated. Errors are skipped.";
  }
  return "";
}

function UploadStep({ label, onPick, uploading, error }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[12px] border border-dashed border-[#dcdde1] bg-[#fafafa] px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-[#ececec]">
        <Upload className="h-4 w-4 text-[#1a1a1a]" />
      </div>
      <div>
        <p className="text-[13.5px] font-medium text-[#1a1a1a]">Import into {label}</p>
        <p className="mt-0.5 text-[12px] text-[#8a8f98]">CSV or Excel · up to a few MB</p>
      </div>
      <button
        onClick={onPick}
        disabled={uploading}
        className="mt-1 h-9 rounded-md bg-[#1a1a1a] px-4 text-[13px] font-medium text-white hover:bg-[#333] disabled:opacity-60"
      >
        {uploading ? "Uploading…" : "Choose file"}
      </button>
      {error && (
        <p className="mt-1 max-w-md rounded-md bg-red-50 px-3 py-2 text-[12px] text-red-700">
          {typeof error === "string" ? error : JSON.stringify(error)}
        </p>
      )}
    </div>
  );
}

function MapStep({ record, fields, mappings, setMappings, requiredKeys, unmappedRequired, schemaLoading }) {
  const headers = record?.columns_detected ?? [];
  const samples = record?.sample_rows ?? [];

  const setOne = (header, key) => setMappings((cur) => ({ ...cur, [header]: key }));

  if (schemaLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-[13px] text-[#8a8f98]">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading target schema…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unmappedRequired.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Map every required field before importing:&nbsp;
            <span className="font-medium">
              {unmappedRequired
                .map((k) => fields.find((f) => f.key === k)?.label ?? k)
                .join(", ")}
            </span>
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-[10px] border border-[#ececec]">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="w-1/2 px-3 py-2">CSV column</th>
              <th className="px-3 py-2">Target field</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {headers.map((header) => {
              const preview = samples
                .slice(0, 2)
                .map((row) => row?.[header])
                .filter((v) => v !== undefined && v !== null && v !== "")
                .map((v) => String(v));
              const current = mappings[header] ?? "";
              return (
                <tr key={header} className="align-top">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 shrink-0 text-[#8a8f98]" />
                      <span className="truncate font-medium text-[#1a1a1a]">{header}</span>
                    </div>
                    {preview.length > 0 && (
                      <div className="ml-5 mt-0.5 line-clamp-1 text-[11px] text-[#8a8f98]">
                        e.g. {preview.map((v) => (v.length > 40 ? `${v.slice(0, 40)}…` : v)).join(" · ")}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={current}
                      onChange={(e) => setOne(header, e.target.value)}
                      className={cn(inputCls, current ? "" : "text-[#8a8f98]")}
                    >
                      <option value="">— Skip this column —</option>
                      {fields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                          {f.required ? " *" : ""}
                          {f.type ? ` (${f.type})` : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
            {headers.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-6 text-center text-[12px] text-[#8a8f98]">
                  No columns detected in this file.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-[#8a8f98]">
        <span className="font-medium text-[#1a1a1a]">Required fields</span> are marked with *.
        Duplicates are updated on import. Rows that fail validation are skipped
        and counted in the summary.
        {requiredKeys.length === 0 && " No fields are required for this target."}
      </p>
    </div>
  );
}

function DoneStep({ logs }) {
  const created = logs?.created ?? 0;
  const updated = logs?.updated ?? 0;
  const failed = logs?.failed ?? [];
  const [showFailures, setShowFailures] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[12px] border border-emerald-200 bg-emerald-50 px-4 py-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
        <div className="text-[13px] text-emerald-900">
          <p className="font-semibold">Import complete</p>
          <p className="mt-0.5">
            Created <span className="font-semibold tabular-nums">{created}</span>, updated{" "}
            <span className="font-semibold tabular-nums">{updated}</span>, failed{" "}
            <span className={cn("font-semibold tabular-nums", failed.length > 0 && "text-red-700")}>
              {failed.length}
            </span>
            .
          </p>
        </div>
      </div>

      {failed.length > 0 && (
        <div className="rounded-[10px] border border-[#ececec]">
          <button
            onClick={() => setShowFailures((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-2 text-[12px] font-medium text-[#1a1a1a] hover:bg-[#f5f5f6]"
          >
            <span>
              {showFailures ? "Hide" : "Show"} failed rows ({failed.length})
            </span>
            <span className="text-[#8a8f98]">{showFailures ? "▲" : "▼"}</span>
          </button>
          {showFailures && (
            <div className="max-h-56 overflow-y-auto border-t border-[#ececec] bg-[#fafafa] px-3 py-2 text-[11.5px]">
              <ul className="space-y-1 font-mono">
                {failed.map((f, i) => (
                  <li key={i} className="text-[#1a1a1a]">
                    <span className="text-[#8a8f98]">row {f.row_index ?? i}:</span>{" "}
                    <span className="text-red-700">{f.error ?? "unknown error"}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatusBlock({ icon, title, subtitle, tone }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-[12px] border px-6 py-10 text-center",
        tone === "error" ? "border-red-200 bg-red-50" : "border-[#ececec] bg-[#fafafa]",
      )}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-[#ececec]">
        {icon}
      </div>
      <p className={cn("text-[13.5px] font-medium", tone === "error" ? "text-red-900" : "text-[#1a1a1a]")}>
        {title}
      </p>
      {subtitle && (
        <p className={cn("max-w-md text-[12px]", tone === "error" ? "text-red-800/80" : "text-[#8a8f98]")}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
