import { useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STATUS_META, PLAN_META } from "@/pages/merchants/data";
import { tenantsApi, useGetTenantsQuery } from "@/api/services/tenants";
import Importer from "@/components/Importer/Importer";
import { usePagination } from "@/hooks/usePagination";
import { Pagination } from "@/components/Pagination";

ModuleRegistry.registerModules([AllCommunityModule]);

function StatusBadge({ value }) {
  const meta = STATUS_META[value] ?? STATUS_META.inactive;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {meta.label}
    </span>
  );
}

function PlanBadge({ value }) {
  const meta = PLAN_META[value] ?? PLAN_META.Basic;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: meta.color, backgroundColor: meta.bg }}
    >
      {value}
    </span>
  );
}

function ActionCell({ data }) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-1.5 h-full">
      <Button
        size="xs"
        variant="outline"
        className="h-6 text-xs"
        onClick={() => navigate(`/tenants/${data.id}`)}
      >
        View
      </Button>
      <Button
        size="xs"
        className="h-6 text-xs"
        onClick={() => {
          const ssoUrl = `https://app.anuma.com/sso?merchant_id=${data.id}&redirect=/dashboard`;
          window.open(ssoUrl, "_blank", "noopener,noreferrer");
        }}
      >
        SSO Login
      </Button>
    </div>
  );
}

export default function MerchantsPage() {
  const gridRef = useRef(null);
  const dispatch = useDispatch();
  const [importerOpen, setImporterOpen] = useState(false);

  // URL-driven pagination + search. `params` is passed to the query as-is —
  // DRF picks up `?page`, `?limit`, `?search` server-side.
  const { params, page, limit, search, setPage, setSearch } = usePagination();
  const { data, isLoading, isError, isFetching } = useGetTenantsQuery(params);
  const rows = data?.results ?? [];
  const count = data?.count ?? 0;

  // Bust the tenants list cache once the wizard reports success so the grid
  // refetches with any newly created / updated rows.
  const handleImportDone = (logs) => {
    dispatch(tenantsApi.util.invalidateTags([{ type: "Tenants", id: "ALL" }]));
    const created = logs?.created ?? 0;
    const updated = logs?.updated ?? 0;
    const failed = logs?.failed?.length ?? 0;
    alert(`Imported ${created} new, ${updated} updated, ${failed} failed`);
  };

  const columnDefs = useMemo(
    () => [
      {
        field: "id",
        headerName: "Merchant ID",
        width: 120,
        pinned: "left",
        cellStyle: { fontFamily: "monospace", fontSize: "12px" },
      },
      {
        field: "business_name",
        headerName: "Business Name",
        flex: 1,
        minWidth: 160,
        cellStyle: { fontWeight: "500" },
      },
      {
        field: "contact_name",
        headerName: "Contact Person",
        width: 160,
      },
      {
        field: "email",
        headerName: "Email",
        width: 200,
        cellStyle: { color: "#6b7280", fontSize: "12px" },
      },
      {
        field: "city",
        headerName: "City",
        width: 120,
      },
      {
        field: "plan",
        headerName: "Plan",
        width: 110,
        cellRenderer: (params) => <PlanBadge value={params.value} />,
      },
      {
        field: "status",
        headerName: "Status",
        width: 110,
        cellRenderer: (params) => <StatusBadge value={params.value} />,
      },
      {
        field: "monthly_orders",
        headerName: "Orders/mo",
        width: 120,
        type: "numericColumn",
        cellStyle: { textAlign: "right" },
        valueFormatter: (p) => Number(p.value ?? 0).toLocaleString(),
      },
      {
        field: "gmv",
        headerName: "GMV (₹)",
        width: 130,
        type: "numericColumn",
        cellStyle: { textAlign: "right" },
        // DRF DecimalField serializes as a string ("48200.00"); coerce.
        valueFormatter: (p) =>
          Number(p.value ?? 0).toLocaleString("en-IN", {
            maximumFractionDigits: 0,
          }),
      },
      {
        field: "joined_date",
        headerName: "Joined",
        width: 120,
        cellStyle: { color: "#6b7280", fontSize: "12px" },
      },
      {
        headerName: "Actions",
        width: 160,
        pinned: "right",
        sortable: false,
        filter: false,
        cellRenderer: ActionCell,
      },
    ],
    [],
  );

  const defaultColDef = useMemo(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
      suppressHeaderMenuButton: true,
      cellStyle: { display: "flex", alignItems: "center" },
    }),
    [],
  );

  return (
    <div className="os-enter mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            {isLoading
              ? "Loading tenants…"
              : isError
                ? "Failed to load tenants"
                : `${count} tenants on Anuma infrastructure`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search tenants…"
          defaultValue={search}
          onKeyDown={(e) => {
            if (e.key === "Enter") setSearch(e.currentTarget.value);
          }}
          onBlur={(e) => {
            if (e.currentTarget.value !== search) setSearch(e.currentTarget.value);
          }}
          className="h-8 w-64 text-sm"
        />
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-sm"
          onClick={() => setImporterOpen(true)}
        >
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </Button>
      </div>

      <div
        className="ag-theme-quartz rounded-md border"
        style={{ height: "calc(100vh - 260px)" }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          rowHeight={40}
          headerHeight={38}
          animateRows
          suppressCellFocus
          overlayLoadingTemplate={isFetching ? "Loading…" : undefined}
        />
      </div>

      <Pagination
        count={count}
        page={page}
        limit={limit}
        onPageChange={setPage}
      />

      <Importer
        target="tenants"
        open={importerOpen}
        onClose={() => setImporterOpen(false)}
        onCompleted={handleImportDone}
      />
    </div>
  );
}
