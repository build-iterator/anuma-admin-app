// The write path — every state change a human makes goes through here, so
// each one lands in the overlay AND on the record's timeline. Patch + event,
// always together; a CRM you can't audit is a spreadsheet.

import { logEvent, updateRecord } from "@/pages/lists/lib/store";
import { addDaysStr, nextStageOf, TEMPS } from "@/pages/lists/lib/signals";

const FOLLOW_UP_DAYS = 3;

function mutate(list, record, patch, eventText) {
  updateRecord(list.id, record.id, patch);
  if (eventText) logEvent(list.id, record.id, eventText);
}

export function setStage(list, record, stage) {
  const from = record.values[list.stageField];
  if (stage === from) return;
  mutate(list, record, { [list.stageField]: stage }, `Stage ${from ?? "—"} → ${stage}`);
}

export function setOwner(list, record, owner) {
  if (owner === (record.values.owner ?? "")) return;
  mutate(list, record, { owner: owner || undefined }, owner ? `Assigned to ${owner}` : "Unassigned");
}

export function setNextAction(list, record, action, date) {
  const cur = record.values;
  if (action === (cur.next_action ?? "") && date === (cur.next_action_date ?? "")) return;
  mutate(
    list,
    record,
    { next_action: action || undefined, next_action_date: date || undefined },
    action ? `Next: ${action}${date ? ` · ${date}` : ""}` : "Next action cleared",
  );
}

export function setTemperature(list, record, key) {
  if (key && !TEMPS[key]) return;
  mutate(
    list,
    record,
    { temp_override: key || undefined },
    key ? `Marked ${TEMPS[key].label} (override)` : "Temperature back to auto",
  );
}

// "Done" — the queue-shrinking action: advance one rung, book the follow-up.
export function advanceStage(list, record) {
  const next = nextStageOf(list, record);
  if (!next) return;
  const date = addDaysStr(FOLLOW_UP_DAYS);
  mutate(
    list,
    record,
    { [list.stageField]: next, next_action: "Follow up", next_action_date: date },
    `Advanced to ${next} · follow-up ${date}`,
  );
}

export function snooze(list, record, days = FOLLOW_UP_DAYS) {
  const date = addDaysStr(days);
  mutate(list, record, { next_action_date: date }, `Snoozed to ${date}`);
}
