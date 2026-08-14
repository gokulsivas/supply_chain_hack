"use client";

import {
  LayoutDashboard,
  Bot,
  Users2,
  ShoppingCart,
  Truck,
  LayoutGrid,
  DockIcon,
  FileText,
  GitMerge,
  CreditCard,
  BarChart3,
  ShieldCheck,
} from "lucide-react";
import { NavItem } from "./NavItem";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Procurement",
    items: [
      { href: "/procurement/ai-assistant", label: "AI Assistant", icon: Bot },
      { href: "/procurement/suppliers", label: "Suppliers", icon: Users2 },
      { href: "/procurement/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Logistics",
    items: [
      { href: "/logistics/tracking", label: "Truck Tracking", icon: Truck },
      { href: "/logistics/yard", label: "Yard Management", icon: LayoutGrid },
      { href: "/logistics/docks", label: "Dock Assignment", icon: DockIcon },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/finance/invoices", label: "Invoices", icon: FileText },
      { href: "/finance/matching", label: "3-Way Matching", icon: GitMerge },
      { href: "/finance/payments", label: "Payments", icon: CreditCard },
    ],
  },
  {
    label: "Insights",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }],
  },
] as const;

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col w-60 shrink-0 border-r border-border bg-sidebar h-screen sticky top-0 overflow-y-auto",
        className
      )}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
          <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold leading-tight text-foreground truncate">
            Supply Chain
          </p>
          <p className="text-[10px] text-muted-foreground leading-tight truncate">
            Control Tower
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-5 px-3 py-4 flex-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavItem key={item.href} {...item} />
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-border">
        <p className="text-[10px] text-muted-foreground">
          Cognizant E2 + PR2 &middot; v0.1
        </p>
      </div>
    </aside>
  );
}
