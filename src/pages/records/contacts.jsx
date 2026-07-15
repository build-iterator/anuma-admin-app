import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Search } from "lucide-react";

import { getContacts } from "@/pages/lists/lib/graph";
import { useListsVersion } from "@/pages/lists/lib/store";

// Contacts — the people layer of the derived records graph. One row per
// person (deduped by email → phone → name@company) with every lead list
// they appear on.

export default function ContactsPage() {
  useListsVersion();
  const [q, setQ] = useState("");

  const contacts = getContacts();
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return contacts;
    return contacts.filter((c) =>
      [c.name, c.company, c.role, c.email, c.phone]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(needle)),
    );
  }, [contacts, q]);

  return (
    <div className="os-enter mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {contacts.length} people across every lead list, deduped by email / phone.
        </p>
      </div>

      <div className="relative w-64">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search contacts…"
          className="h-8 w-full rounded-md border bg-muted/30 pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:bg-background focus:ring-1 focus:ring-ring"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[720px] text-[12.5px]">
          <thead>
            <tr className="border-b bg-muted/30 text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Company</th>
              <th className="px-3 py-2 text-left">Phone / WhatsApp</th>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">On lists</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((c) => (
              <tr key={c.key} className="transition-colors hover:bg-muted/20">
                <td className="whitespace-nowrap px-3 py-1.5 font-medium">{c.name}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{c.role ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-1.5 text-muted-foreground">{c.company ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  {c.phone || c.whatsapp ? (
                    <a href={`tel:${(c.phone ?? c.whatsapp).replace(/\s/g, "")}`} className="hover:underline">
                      {c.phone ?? c.whatsapp}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  {c.email ? (
                    <a href={`mailto:${c.email}`} className="hover:underline">
                      {c.email}
                    </a>
                  ) : (
                    <span className="text-muted-foreground/40">—</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-1.5">
                  <span className="flex flex-wrap items-center gap-1">
                    {c.leads.map((lead) => (
                      <Link
                        key={`${lead.listId}-${lead.recordId}`}
                        to={`/leads/${lead.listId}?open=${lead.recordId}`}
                        className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: lead.temp.color }} />
                        {lead.listName}
                      </Link>
                    ))}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">
                  Nothing matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
