// Tenant records now live in the backend (see anuma-admin-backend/tenants).
// This module only owns UI-only metadata for status/plan badges — colors,
// labels, and background swatches — so the frontend can render badges without
// re-fetching or duplicating that mapping across pages.
export const STATUS_META = {
  active: { label: "Active", color: "#16a34a", bg: "#dcfce7" },
  inactive: { label: "Inactive", color: "#6b7280", bg: "#f3f4f6" },
  suspended: { label: "Suspended", color: "#dc2626", bg: "#fee2e2" },
};

export const PLAN_META = {
  Basic: { color: "#6b7280", bg: "#f3f4f6" },
  Pro: { color: "#2563eb", bg: "#dbeafe" },
  Enterprise: { color: "#7c3aed", bg: "#ede9fe" },
};
