import { Link } from "react-router";

import { useGetSummaryQuery } from "@/api/services/dashboard";
import { useListsVersion } from "@/pages/lists/lib/store";
import { getCompanies, getContacts } from "@/pages/lists/lib/graph";

function Tile({ label, value, to }) {
  const body = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </>
  );
  return to ? (
    <Link to={to} className="rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40">
      {body}
    </Link>
  ) : (
    <div className="rounded-xl border bg-card p-4">{body}</div>
  );
}

function Group({ label, children, cols = "sm:grid-cols-3" }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">{label}</p>
      <div className={`grid grid-cols-2 gap-4 ${cols}`}>{children}</div>
    </div>
  );
}

export default function DashboardPage() {
  // Client-side companies/contacts derive from the RTK-backed leads store
  // (see @/pages/lists/lib/graph). `useListsVersion` fires a rerender when
  // that store changes so the derived counts refresh live.
  useListsVersion();

  const { data, isLoading } = useGetSummaryQuery();
  const dash = isLoading || !data ? null : data;

  // Placeholder for loading tiles — matches the tabular-nums styling.
  const P = "—";
  const inr = (n) => (typeof n === "number" ? n.toLocaleString("en-IN") : n);

  const tenantStats = [
    { label: "Tenants", value: dash ? dash.tenants.total : P, to: "/tenants" },
    { label: "Active", value: dash ? dash.tenants.active : P },
    { label: "Suspended", value: dash ? dash.tenants.suspended : P },
    { label: "Total GMV (₹)", value: dash ? inr(dash.tenants.total_gmv) : P },
  ];

  const lists = dash ? dash.leads.lists : [];

  return (
    <div className="os-enter mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business control center overview</p>
      </div>

      <Group label="Leads">
        {isLoading || !dash
          ? [0, 1, 2].map((i) => <Tile key={i} label="Loading" value={P} />)
          : lists.map((l) => (
              <Tile
                key={l.slug}
                label={l.name}
                value={l.record_count}
                to={`/leads/${l.slug}`}
              />
            ))}
      </Group>

      <Group label="Records" cols="sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Companies" value={getCompanies().length} to="/records/companies" />
        <Tile label="Contacts" value={getContacts().length} to="/records/contacts" />
      </Group>

      <Group label="Tenants" cols="sm:grid-cols-4">
        {tenantStats.map((s) => (
          <Tile key={s.label} label={s.label} value={s.value} to={s.to} />
        ))}
      </Group>
    </div>
  );
}
