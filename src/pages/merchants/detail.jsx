import { useParams, useNavigate, Link } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { MERCHANTS, STATUS_META, PLAN_META } from "@/pages/merchants/data";

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value || "—"}</span>
    </div>
  );
}

export default function MerchantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const merchant = MERCHANTS.find((m) => m.id === id);

  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-muted-foreground">
        <p className="text-sm">Merchant not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/merchants")}>
          Back to Merchants
        </Button>
      </div>
    );
  }

  const statusMeta = STATUS_META[merchant.status] ?? STATUS_META.inactive;
  const planMeta = PLAN_META[merchant.plan] ?? PLAN_META.Basic;

  const ssoUrl = `https://app.anuma.com/sso?merchant_id=${merchant.id}&redirect=/dashboard`;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate("/merchants")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {merchant.business_name}
          </h1>
          <p className="text-sm text-muted-foreground">{merchant.id}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ color: statusMeta.color, backgroundColor: statusMeta.bg }}
          >
            {statusMeta.label}
          </span>
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{ color: planMeta.color, backgroundColor: planMeta.bg }}
          >
            {merchant.plan}
          </span>
        </div>
      </div>

      <Separator />

      {/* SSO Action */}
      <div className="rounded-lg border bg-muted/30 p-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Access Merchant Dashboard</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Opens a new tab and logs you in as this merchant via SSO.
          </p>
        </div>
        <Button
          className="shrink-0 gap-1.5"
          onClick={() =>
            window.open(ssoUrl, "_blank", "noopener,noreferrer")
          }
        >
          <ExternalLink className="h-3.5 w-3.5" />
          SSO Login to Dashboard
        </Button>
      </div>

      {/* Details */}
      <div className="rounded-lg border p-5">
        <p className="text-sm font-medium mb-4">Business Details</p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
          <Field label="Business Name" value={merchant.business_name} />
          <Field label="Contact Person" value={merchant.contact_name} />
          <Field label="Email" value={merchant.email} />
          <Field label="Phone" value={merchant.phone} />
          <Field label="City" value={merchant.city} />
          <Field label="Joined Date" value={merchant.joined_date} />
        </div>
      </div>

      {/* Stats */}
      <div className="rounded-lg border p-5">
        <p className="text-sm font-medium mb-4">Performance</p>
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Monthly Orders
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {merchant.monthly_orders.toLocaleString()}
            </p>
          </div>
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              GMV (₹)
            </p>
            <p className="mt-1 text-2xl font-semibold">
              {merchant.gmv.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="rounded-md bg-muted/40 p-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Plan
            </p>
            <p className="mt-1 text-2xl font-semibold">{merchant.plan}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
