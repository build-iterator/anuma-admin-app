import { Link, useLocation } from "react-router";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { NAV_FOOTER, NAV_GROUPS, isItemActive } from "@/layouts/nav";

const BRAND = { name: "Anuma Admin", initials: "TA" };
const USER = { name: "Admin User", role: "Super Admin", initials: "AU" };

function NavItem({ item, active }) {
  const Icon = item.icon;
  const disabled = !item.url;

  const button = (
    <SidebarMenuButton
      isActive={active}
      asChild={!disabled}
      size="sm"
      disabled={disabled}
      aria-disabled={disabled}
      className={cn(
        "h-8 text-[13px] active:scale-[0.98]",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground [&>svg]:text-primary"
          : "text-muted-foreground [&>svg]:text-muted-foreground/60",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      {disabled ? (
        <span className="flex items-center gap-2">
          <Icon />
          <span>{item.label}</span>
        </span>
      ) : (
        <Link to={item.url}>
          <Icon />
          <span>{item.label}</span>
        </Link>
      )}
    </SidebarMenuButton>
  );

  return <SidebarMenuItem>{button}</SidebarMenuItem>;
}

export default function AdminSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 justify-center px-4 py-0">
        <div className="flex items-center gap-2">
          <span
            className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[5px] text-[10px] font-bold text-black"
            style={{ backgroundColor: "#E7A52C" }}
          >
            {BRAND.initials}
          </span>
          <span className="text-[15px] font-semibold tracking-tight group-data-[collapsible=icon]:hidden">
            {BRAND.name}
          </span>
          <SidebarTrigger className="ml-auto h-6 w-6 text-muted-foreground group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarSeparator className="m-0" />

      <SidebarContent>
        {NAV_GROUPS.map((group, gi) => (
          <SidebarGroup key={gi} className={gi > 0 ? "pt-2" : "pt-1"}>
            {group.label && (
              <SidebarGroupLabel className="mb-0.5 px-2 text-[11px] font-medium text-muted-foreground/50">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItem
                    key={item.key}
                    item={item}
                    active={isItemActive(item, pathname)}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t px-2 py-2">
        <SidebarMenu>
          {NAV_FOOTER.map((item) => (
            <NavItem
              key={item.key}
              item={item}
              active={isItemActive(item, pathname)}
            />
          ))}
        </SidebarMenu>
        <div className="flex items-center gap-2 px-1 py-1 group-data-[collapsible=icon]:justify-center">
          <Avatar className="h-7 w-7 shrink-0">
            <AvatarFallback className="bg-muted text-[10px] font-semibold text-foreground">
              {USER.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight group-data-[collapsible=icon]:hidden">
            <div className="truncate text-[12px] font-semibold text-foreground">
              {USER.name}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {USER.role}
            </div>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
