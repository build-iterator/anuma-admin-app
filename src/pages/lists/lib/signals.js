// CRM temperature — the read on every row: is this lead hot, warm, or cold,
// and should someone reach out today? Derived, never stored: it recomputes
// from whatever signals the record carries (fit score, stage progress,
// reachability, trust), so imported rows get a temperature for free.

export const TEMPS = {
  hot: { key: "hot", label: "Hot", color: "#b91c1c", bg: "#fee2e2" },
  warm: { key: "warm", label: "Warm", color: "#a16207", bg: "#fef9c3" },
  cold: { key: "cold", label: "Cold", color: "#475569", bg: "#f1f5f9" },
};

const DEAD_STAGES = new Set(["Parked", "Churned"]);

function stageIndex(list, record) {
  const stage = record.values[list.stageField];
  const opts = list.fields.find((f) => f.key === list.stageField)?.options ?? [];
  return { idx: opts.findIndex((o) => o.value === stage), stage };
}

export function isReachable(record) {
  const v = record.values;
  return Boolean(v.whatsapp || v.phone || v.email);
}

export function temperature(list, record) {
  const v = record.values;
  // Human judgment beats the derived read: `temp_override` wins when set.
  if (v.temp_override && TEMPS[v.temp_override]) {
    return { ...TEMPS[v.temp_override], overridden: true };
  }
  const fit = Number(v.fit_score);
  const { idx, stage } = stageIndex(list, record);
  if (DEAD_STAGES.has(stage)) return TEMPS.cold;
  const progressed = idx > 0; // moved past the entry stage
  if (progressed || (Number.isFinite(fit) && fit >= 12)) return TEMPS.hot;
  if ((Number.isFinite(fit) && fit >= 9) || (isReachable(record) && v.trustseal === "Yes")) {
    return TEMPS.warm;
  }
  return TEMPS.cold;
}

// The next rung on this list's ladder (Parked/Churned are exits, not rungs).
export function nextStageOf(list, record) {
  const opts = (list.fields.find((f) => f.key === list.stageField)?.options ?? [])
    .map((o) => o.value)
    .filter((s) => !DEAD_STAGES.has(s));
  const idx = opts.indexOf(record.values[list.stageField]);
  return idx >= 0 && idx < opts.length - 1 ? opts[idx + 1] : null;
}

/* ── the clock ──────────────────────────────────────────────────────────── */

export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function addDaysStr(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// 'overdue' | 'today' | 'later' | null — drives the red/amber treatment.
export function dueState(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return null;
  const today = todayStr();
  if (dateStr < today) return "overdue";
  if (dateStr === today) return "today";
  return "later";
}

// The reach-out queue: warm-or-hotter, contactable, still sitting at the
// entry stage — the rows a human should pick up today.
export function needsReachOut(list, record) {
  const t = temperature(list, record);
  if (t.key === "cold") return false;
  if (!isReachable(record)) return false;
  const { idx } = stageIndex(list, record);
  return idx <= 0;
}

// Universal CRM segments — same lens on every list.
export const CRM_SEGMENTS = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "warm", label: "Warm" },
  { key: "cold", label: "Cold" },
  { key: "reach-out", label: "Reach out" },
];

export function matchesCrmSegment(list, record, segmentKey) {
  switch (segmentKey) {
    case "hot":
    case "warm":
    case "cold":
      return temperature(list, record).key === segmentKey;
    case "reach-out":
      return needsReachOut(list, record);
    default:
      return true;
  }
}

// Synthesized history — what we can honestly say happened to this record from
// its own fields; logged events (store) stack on top.
export function baseEvents(list, record) {
  const v = record.values;
  const at = v.date_added ?? "";
  const events = [];
  if (v.source || at) {
    events.push({ at, text: `Added from ${v.source || "import"}`, type: "system" });
  }
  if (v.fit_score !== undefined) {
    events.push({
      at,
      text: `Fit scored ${v.fit_score}${v.account_tier ? ` · tier ${v.account_tier}` : ""}${v.wave ? ` · ${v.wave}` : ""}`,
      type: "system",
    });
  }
  const stage = v[list.stageField];
  if (stage) events.push({ at, text: `Stage set to ${stage}`, type: "system" });
  return events;
}
