// Lists registry — the single source of truth for the control-center CRM lists.
// Adding a list here is all it takes: nav, routes, page titles, overview cards
// and the store all render from this. Frontend-only by design; when a backend
// arrives this file becomes seed/config for it.
//
// Field types: text | url | email | phone | number | date | select | notes
// `select` fields carry options with badge colors and power the filter bar.

import { Building2, Gift, ListTodo, Package } from "lucide-react";

import { ANUMA_SEED } from "@/pages/lists/data/anuma.seed";
import { JBX_SEED } from "@/pages/lists/data/jbx-shopify.seed";
import { ITERATOR_SEED } from "@/pages/lists/data/iterator.seed";

const OWNERS = [
  { value: "Janardhan", color: "#7c3aed", bg: "#f3e8ff" },
  { value: "Anu", color: "#db2777", bg: "#fce7f3" },
  { value: "Neil", color: "#0891b2", bg: "#cffafe" },
];

const TIER_OPTIONS = [
  { value: "A", color: "#15803d", bg: "#dcfce7" },
  { value: "B", color: "#a16207", bg: "#fef9c3" },
  { value: "C", color: "#6b7280", bg: "#f3f4f6" },
];

const STAGE_COLORS = {
  start: { color: "#6b7280", bg: "#f3f4f6" },
  active: { color: "#1d4ed8", bg: "#dbeafe" },
  win: { color: "#15803d", bg: "#dcfce7" },
  parked: { color: "#b91c1c", bg: "#fee2e2" },
};

function stages(names, winIndex = names.length - 1) {
  return names.map((value, i) => ({
    value,
    ...(value === "Parked"
      ? STAGE_COLORS.parked
      : i === 0
        ? STAGE_COLORS.start
        : i >= winIndex
          ? STAGE_COLORS.win
          : STAGE_COLORS.active),
  }));
}

// Core fields shared by every list, in display order. Each list appends its
// own fields after these (Airtable-style: the list owns its schema).
export const CORE_FIELDS = [
  { key: "company_name", label: "Company", type: "text" },
  { key: "website", label: "Website", type: "url" },
  { key: "contact_name", label: "Contact", type: "text" },
  { key: "contact_role", label: "Role", type: "text" },
  { key: "email", label: "Email", type: "email" },
  { key: "phone", label: "Phone", type: "phone" },
  { key: "whatsapp", label: "WhatsApp", type: "phone" },
  { key: "annual_revenue_usd", label: "Annual Revenue (USD)", type: "number" },
  { key: "product_type", label: "Product Type", type: "text" },
  { key: "industry", label: "Industry", type: "text" },
  { key: "employees", label: "Employees", type: "number" },
  { key: "location", label: "Location", type: "text" },
  { key: "market_segment", label: "Market Segment", type: "text" },
  { key: "city", label: "City", type: "text" },
  { key: "state", label: "State", type: "text" },
  { key: "owner", label: "Owner", type: "select", options: OWNERS },
  { key: "source", label: "Source", type: "text" },
  { key: "next_action", label: "Next action", type: "text" },
  { key: "next_action_date", label: "Next action date", type: "date" },
  { key: "notes", label: "Notes", type: "notes" },
];

function fields(extra) {
  const overrides = new Map(extra.map((f) => [f.key, f]));
  const merged = CORE_FIELDS.map((f) => overrides.get(f.key) ?? f);
  const coreKeys = new Set(CORE_FIELDS.map((f) => f.key));
  return [...merged, ...extra.filter((f) => !coreKeys.has(f.key))];
}

export const LISTS = [
  {
    id: "jbx-shopify",
    name: "JBX Shopify App",
    shortName: "JBX",
    icon: Gift,
    description: "DTC brands prospecting/using the JoyBox Shopify app.",
    seed: JBX_SEED,
    fields: fields([
      { key: "shopify_domain", label: "Shopify domain", type: "url" },
      {
        key: "stage",
        label: "Stage",
        type: "select",
        options: stages(["Prospect", "Contacted", "Installed", "Active", "Churned", "Parked"], 3),
      },
      { key: "plan", label: "Plan", type: "select", options: TIER_OPTIONS.map((t, i) => ({ ...t, value: ["Free", "Growth", "Scale"][i] })) },
      { key: "monthly_orders", label: "Orders/mo", type: "number" },
    ]),
    visible: ["company_name", "shopify_domain", "stage", "plan", "owner", "monthly_orders", "next_action", "notes"],
    stageField: "stage",
    // Condensed signal row — what the table shows; everything else lives in
    // the record peek panel (enriched behind, signals in front).
    table: [
      { kind: "entity", sub: ["shopify_domain"] },
      { kind: "field", key: "stage" },
      { kind: "field", key: "plan" },
      { kind: "field", key: "monthly_orders" },
      { kind: "reach", keys: ["phone", "whatsapp", "email"] },
      { kind: "action" },
      { kind: "owner" },
    ],
  },
  {
    id: "anuma",
    name: "Anuma",
    shortName: "Anuma",
    icon: Package,
    description: "Corp-gifting sellers to onboard as Anuma merchants (IndiaMART Wave 1).",
    seed: ANUMA_SEED,
    fields: fields([
      { key: "indiamart_url", label: "IndiaMART", type: "url" },
      { key: "glid", label: "GLID", type: "text" },
      { key: "cluster", label: "Cluster", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "subcategory", label: "Product lines", type: "text" },
      { key: "bulk_keywords", label: "Bulk keywords", type: "text" },
      { key: "indiamart_tier", label: "IM tier", type: "text" },
      { key: "trustseal", label: "TrustSEAL", type: "select", options: [{ value: "Yes", ...STAGE_COLORS.win }, { value: "No", ...STAGE_COLORS.start }] },
      { key: "turnover_band", label: "Turnover", type: "text" },
      { key: "employees_band", label: "Employees", type: "text" },
      { key: "gst_legal_status", label: "GST legal status", type: "text" },
      { key: "gst_reg_year", label: "GST reg year", type: "number" },
      { key: "years_on_indiamart", label: "Yrs on IM", type: "number" },
      { key: "gst_registered", label: "GST", type: "text" },
      { key: "catalog_depth", label: "Catalog depth", type: "number" },
      { key: "response_rate_badge", label: "Response badge", type: "text" },
      { key: "wave", label: "Wave", type: "text" },
      { key: "fit_score", label: "Fit score", type: "number" },
      { key: "account_tier", label: "Tier", type: "select", options: TIER_OPTIONS },
      {
        key: "pipeline_stage",
        label: "Stage",
        type: "select",
        options: stages(["Signal", "Contacted", "Qualified", "Demo", "Onboarding", "Live", "Parked"], 5),
      },
      { key: "demand_channels", label: "Demand channels", type: "text" },
      { key: "festive_vs_perennial", label: "Festive/Perennial", type: "text" },
      { key: "scope_appetite", label: "Scope appetite", type: "text" },
      { key: "erp_stack", label: "ERP", type: "text" },
      { key: "courier_stack", label: "Courier", type: "text" },
      { key: "quote_authority", label: "Quote authority", type: "text" },
      { key: "date_added", label: "Added", type: "date" },
    ]),
    visible: ["company_name", "city", "cluster", "account_tier", "fit_score", "pipeline_stage", "phone", "trustseal", "owner", "next_action", "notes"],
    stageField: "pipeline_stage",
    table: [
      { kind: "entity", sub: ["city", "category"] },
      { kind: "score", key: "fit_score", label: "Fit", max: 20 },
      { kind: "field", key: "account_tier" },
      { kind: "field", key: "pipeline_stage" },
      { kind: "reach", keys: ["phone", "whatsapp", "email"] },
      {
        kind: "facts",
        label: "Trust",
        parts: [
          { key: "trustseal", flag: "TS" },
          { key: "gst_registered", flag: "GST" },
          { key: "years_on_indiamart", suffix: "y" },
        ],
      },
      { kind: "action" },
      { kind: "owner" },
    ],
  },
  {
    id: "iterator",
    name: "Iterator",
    shortName: "Iterator",
    icon: Building2,
    description: "Brand & agency pipeline for Iterator (successor to the JoyBox CRM board).",
    seed: ITERATOR_SEED,
    fields: fields([
      {
        key: "type",
        label: "Type",
        type: "select",
        options: [
          { value: "DTC", color: "#1d4ed8", bg: "#dbeafe" },
          { value: "Brand", color: "#7c3aed", bg: "#f3e8ff" },
          { value: "Agency", color: "#a16207", bg: "#fef9c3" },
        ],
      },
      { key: "category", label: "Category", type: "text" },
      {
        key: "stage",
        label: "Stage",
        type: "select",
        options: stages(["Lead", "Contacted", "Pitched", "Negotiating", "Won", "Parked"], 4),
      },
      { key: "plan", label: "Plan", type: "text" },
    ]),
    visible: ["company_name", "type", "category", "stage", "owner", "plan", "next_action", "notes"],
    stageField: "stage",
    table: [
      { kind: "entity", sub: ["category", "city"] },
      { kind: "field", key: "type" },
      { kind: "field", key: "stage" },
      { kind: "field", key: "plan" },
      { kind: "reach", keys: ["phone", "whatsapp", "email"] },
      { kind: "action" },
      { kind: "owner" },
    ],
  },
];

// Generic ladder + spec for lists created at runtime ("+ New list" / a loaded
// CSV) — core fields plus a stage plus whatever ad-hoc columns the generated
// CRM carried; persisted by the store; same shape as a registry list.
export function makeCustomList({ id, name, description, extraFields = [] }) {
  const stage = {
    key: "stage",
    label: "Stage",
    type: "select",
    options: stages(["Lead", "Contacted", "Active", "Won", "Parked"], 3),
  };
  const coreKeys = new Set([...CORE_FIELDS.map((f) => f.key), "stage"]);
  const adHoc = extraFields
    .filter((f) => !coreKeys.has(f.key))
    .map((f) => ({
      key: f.key,
      label: f.label ?? f.key,
      type: f.key === "fit_score" ? "number" : (f.type ?? "text"),
    }));
  const has = (key) => adHoc.some((f) => f.key === key);
  return {
    id,
    name,
    shortName: name,
    icon: ListTodo,
    description: description || "Custom list.",
    custom: true,
    seed: [],
    fields: fields([stage, ...adHoc]),
    visible: ["company_name", "stage", "owner", "next_action", "notes"],
    stageField: "stage",
    table: [
      { kind: "entity", sub: ["city", "category"] },
      ...(has("fit_score") ? [{ kind: "score", key: "fit_score", label: "Fit", max: 20 }] : []),
      ...(has("category") ? [{ kind: "field", key: "category" }] : []),
      { kind: "field", key: "stage" },
      { kind: "reach", keys: ["phone", "whatsapp", "email"] },
      { kind: "action" },
      { kind: "owner" },
    ],
  };
}

export function getList(listId) {
  return LISTS.find((l) => l.id === listId) ?? null;
}

export function getField(list, key) {
  return list.fields.find((f) => f.key === key) ?? null;
}
