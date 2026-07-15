import { Outlet, useLocation } from "react-router";

import { cn } from "@/lib/utils";
import { Rail, SheetHeader, LeadsSubNav, RecordsSubNav } from "@/layouts/chrome";
import { INTER, PANEL } from "@/layouts/tokens";
import { sectionFor } from "@/layouts/nav";

// The admin shell — merchant app's v1 frame: dark base, icon rail, one white
// sheet. The rail and sheet sit at stable tree positions so navigation only
// swaps the content area.
export default function MainLayout() {
  const { pathname } = useLocation();
  const section = sectionFor(pathname);

  return (
    <div className={cn("relative flex h-screen w-screen overflow-hidden bg-[#1b1b1b]", INTER)}>
      <Rail activeKey={section?.key} />
      <div className="flex min-w-0 flex-1 py-2 pr-2">
        <div className={cn(PANEL, "flex min-w-0 flex-1 flex-col ring-1 ring-white/10")}>
          <SheetHeader />
          <div className="flex min-h-0 flex-1">
            {section?.key === "leads" && <LeadsSubNav />}
            {section?.key === "records" && <RecordsSubNav />}
            <div className="min-w-0 flex-1 overflow-y-auto py-6">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
