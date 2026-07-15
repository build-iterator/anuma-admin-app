import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Plus } from "lucide-react";

import { LoadListModal } from "@/layouts/chrome";
import { getAllLists, getRecords, useListsVersion } from "@/pages/lists/lib/store";

export default function ListsOverviewPage() {
  useListsVersion();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const lists = getAllLists();

  return (
    <div className="os-enter mx-auto max-w-6xl space-y-4 px-4 sm:px-6 lg:px-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Generated lists for outbound — one per motion. Load a built CRM in; companies and
          contacts derive into Records automatically.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {lists.map((list) => {
          const Icon = list.icon;
          const count = getRecords(list.id).length;
          return (
            <Link
              key={list.id}
              to={`/leads/${list.id}`}
              className="group rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
            >
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{list.name}</span>
              </div>
              <p className="mt-2 line-clamp-2 min-h-9 text-[13px] text-muted-foreground">{list.description}</p>
              <p className="mt-3 text-2xl font-semibold tabular-nums">{count}</p>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">leads</p>
            </Link>
          );
        })}
        <button
          onClick={() => setCreating(true)}
          className="flex min-h-[150px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
          <span className="text-sm font-medium">Load list</span>
        </button>
      </div>

      {creating && (
        <LoadListModal
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            navigate(`/leads/${id}`);
          }}
        />
      )}
    </div>
  );
}
