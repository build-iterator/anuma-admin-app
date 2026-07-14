import { Link } from "react-router";

import { MERCHANTS } from "@/pages/merchants/data";
import { getAllLists, getRecords, useListsVersion } from "@/pages/lists/lib/store";
import { getCompanies, getContacts } from "@/pages/lists/lib/graph";

const tenantStats = [
  { label: "Tenants", value: MERCHANTS.length },
  { label: "Active", value: MERCHANTS.filter((m) => m.status === "active").length },
  { label: "Suspended", value: MERCHANTS.filter((m) => m.status === "suspended").length },
  {
    label: "Total GMV (₹)",
    value: MERCHANTS.reduce((s, m) => s + m.gmv, 0).toLocaleString("en-IN"),
  },
];

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
  useListsVersion();
  const lists = getAllLists();

  return (
    <div className="os-enter mx-auto max-w-6xl space-y-6 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business control center overview</p>
      </div>

      <Group label="Leads">
        {lists.map((l) => (
          <Tile key={l.id} label={l.name} value={getRecords(l.id).length} to={`/leads/${l.id}`} />
        ))}
      </Group>

      <Group label="Records" cols="sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Companies" value={getCompanies().length} to="/records/companies" />
        <Tile label="Contacts" value={getContacts().length} to="/records/contacts" />
      </Group>

      <Group label="Tenants" cols="sm:grid-cols-4">
        {tenantStats.map((s) => (
          <Tile key={s.label} label={s.label} value={s.value} to={s.label === "Tenants" ? "/tenants" : undefined} />
        ))}
      </Group>
    </div>
  );
}
