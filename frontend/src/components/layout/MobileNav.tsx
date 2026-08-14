"use client";

import { useState } from "react";
import { Menu, ShieldCheck } from "lucide-react";
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
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavItem } from "./NavItem";

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

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="Open navigation menu" />
        }
      >
        <Menu className="size-5" aria-hidden="true" />
      </SheetTrigger>

      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <ShieldCheck className="size-4" strokeWidth={1.75} aria-hidden="true" />
            </div>
            <SheetTitle className="text-sm font-semibold leading-tight">
              Supply Chain Control Tower
            </SheetTitle>
          </div>
        </SheetHeader>

        <nav
          className="flex flex-col gap-5 px-3 py-4 overflow-y-auto"
          aria-label="Main navigation"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => (
                <NavItem
                  key={item.href}
                  {...item}
                  onClick={() => setOpen(false)}
                />
              ))}
            </div>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
