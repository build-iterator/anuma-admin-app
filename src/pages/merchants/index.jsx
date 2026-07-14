import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { AgGridReact } from "ag-grid-react";
import {
  AllCommunityModule,
  ModuleRegistry,
} from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MERCHANTS, STATUS_META, PLAN_META } from "@/pages/merchants/data";

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
  const [quickFilter, setQuickFilter] = useState("");

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
        valueFormatter: (p) => p.value.toLocaleString(),
      },
      {
        field: "gmv",
        headerName: "GMV (₹)",
        width: 130,
        type: "numericColumn",
        cellStyle: { textAlign: "right" },
        valueFormatter: (p) =>
          p.value.toLocaleString("en-IN", { maximumFractionDigits: 0 }),
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

  const onFilterTextChange = useCallback((e) => {
    setQuickFilter(e.target.value);
  }, []);

  return (
    <div className="os-enter mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Tenants</h1>
          <p className="text-sm text-muted-foreground">
            {MERCHANTS.length} tenants on Anuma infrastructure
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder="Search tenants..."
          value={quickFilter}
          onChange={onFilterTextChange}
          className="h-8 w-64 text-sm"
        />
      </div>

      <div
        className="ag-theme-quartz rounded-md border"
        style={{ height: "calc(100vh - 220px)" }}
      >
        <AgGridReact
          ref={gridRef}
          rowData={MERCHANTS}
          columnDefs={columnDefs}
          defaultColDef={defaultColDef}
          quickFilterText={quickFilter}
          rowHeight={40}
          headerHeight={38}
          animateRows
          suppressCellFocus
          pagination
          paginationPageSize={20}
          paginationPageSizeSelector={[10, 20, 50]}
        />
      </div>
    </div>
  );
}
