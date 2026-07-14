import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, Search, X } from "lucide-react";

import { getCompanies, domainOf } from "@/pages/lists/lib/graph";
import { useListsVersion } from "@/pages/lists/lib/store";

// Companies — the durable record, derived live from every lead list. Attio's
// Companies view is the reference: dense rows, identity + firmographics +
// which-lists membership. No interaction graph here by design — our drivers
// are fit / size / category, and those live on the lead.

function CompanyMark({ name }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-[#f1f2f4] text-[10px] font-semibold uppercase text-[#5c6066]">
      {name.slice(0, 2)}
    </span>
  );
}

function LeadChip({ lead }) {
  return (
    <Link
      to={`/leads/${lead.listId}?open=${lead.recordId}`}
      onClick={(e) => e.stopPropagation()}
      title={`${lead.listName}${lead.stage ? ` · ${lead.stage}` : ""}`}
      className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lead.temp.color }} />
      {lead.listName}
    </Link>
  );
}

function CompanyOverlay({ company, onClose }) {
  const v = company.values;
  const site = v.website || v.indiamart_url || v.shopify_domain;
  const facts = [
    ["Category", v.category ?? v.type],
    ["Location", [v.city, v.state].filter(Boolean).join(", ")],
    ["Cluster", v.cluster],
    ["Employees", v.employees_band],
    ["Turnover", v.turnover_band],
    ["Legal", v.gst_legal_status],
  ].filter(([, val]) => val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border bg-background shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/50"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="border-b px-6 pb-4 pt-5">
          <div className="flex items-center gap-2.5 pr-10">
            <CompanyMark name={company.name} />
            <h2 className="truncate text-lg font-semibold tracking-tight">{company.name}</h2>
            {site && (
              <a
                href={/^https?:/.test(site) ? site : `https://${site}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <ArrowUpRight className="h-4 w-4" />
              </a>
            )}
          </div>
          {site && <p className="mt-1 text-[12px] text-muted-foreground">{domainOf(site)}</p>}
        </div>
        <div className="space-y-4 p-6">
          {facts.length > 0 && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {facts.map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
                  <p className="text-[13px]">{val}</p>
                </div>
              ))}
            </div>
          )}
          <div>
            <p className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              On {company.leads.length} lead list{company.leads.length === 1 ? "" : "s"}
            </p>
            <div className="flex flex-col gap-1">
              {company.leads.map((lead) => (
                <Link
                  key={`${lead.listId}-${lead.recordId}`}
                  to={`/leads/${lead.listId}?open=${lead.recordId}`}
                  className="flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[12.5px] transition-colors hover:bg-muted/20"
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lead.temp.color }} />
                  <span className="font-medium">{lead.listName}</span>
                  <span className="text-muted-foreground">{lead.stage}</span>
                  {lead.owner && <span className="ml-auto text-[11px] text-muted-foreground">{lead.owner}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CompaniesPage() {
  useListsVersion();
  const [q, setQ] = useState("");
  const [openKey, setOpenKey] = useState(null);

  const companies = getCompanies();
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return companies;
    return companies.filter((c) =>
      [c.name, c.values.category, c.values.city, c.values.state, c.values.website]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(needle)),
    );
  }, [companies, q]);
  const open = companies.find((c) => c.key === openKey) ?? null;

  return (
    <div className="os-enter mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Companies</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {companies.length} companies, deduped across every lead list. Derived — load a list and it grows.
        </p>
      </div>

      <div className="relative w-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search companies…"
          className="h-8 w-full rounded-md border bg-muted/30 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-background focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[760px] text-[12.5px]">
          <thead>
            <tr className="border-b bg-muted/30 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Location</th>
              <th className="px-3 py-2 text-left">Size</th>
              <th className="px-3 py-2 text-left">On lists</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr
                key={c.key}
                onClick={() => setOpenKey(c.key)}
                className="cursor-pointer transition-colors hover:bg-muted/20"
              >
                <td className="max-w-[280px] whitespace-nowrap px-3 py-1.5">
                  <span className="flex items-center gap-2">
                    <CompanyMark name={c.name} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{c.name}</span>
                      {c.values.website && (
                        <span className="block truncate text-[10.5px] text-muted-foreground">
                          {domainOf(c.values.website)}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                  {c.values.category ?? c.values.type ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                  {[c.values.city, c.values.state].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">
                  {c.values.employees_band ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <span className="flex flex-wrap items-center gap-1">
                    {c.leads.slice(0, 3).map((lead) => (
                      <LeadChip key={`${lead.listId}-${lead.recordId}`} lead={lead} />
                    ))}
                    {c.leads.length > 3 && (
                      <span className="text-[10.5px] text-muted-foreground">+{c.leads.length - 3}</span>
                    )}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Nothing matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && <CompanyOverlay company={open} onClose={() => setOpenKey(null)} />}
    </div>
  );
}
