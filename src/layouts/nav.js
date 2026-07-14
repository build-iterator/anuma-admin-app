import { Database, LayoutDashboard, ListTodo, Store } from "lucide-react";

// The admin rail — the three-tier IA: Leads (generated lists, disposable,
// outbound-first), Records (the durable companies + contacts graph, derived),
// Tenants (who has infra with us). Leads and Records carry sub-nav columns.
export const SECTIONS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, to: "/" },
  { key: "leads", label: "Leads", icon: ListTodo, to: "/leads" },
  { key: "records", label: "Records", icon: Database, to: "/records/companies" },
  { key: "tenants", label: "Tenants", icon: Store, to: "/tenants" },
];

export function sectionFor(pathname) {
  if (pathname.startsWith("/leads")) return SECTIONS.find((s) => s.key === "leads");
  if (pathname.startsWith("/records")) return SECTIONS.find((s) => s.key === "records");
  if (pathname.startsWith("/tenants") || pathname.startsWith("/merchants"))
    return SECTIONS.find((s) => s.key === "tenants");
  if (pathname === "/") return SECTIONS.find((s) => s.key === "dashboard");
  return null;
}
