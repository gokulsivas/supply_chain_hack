"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MobileNav } from "./MobileNav";
import { useAuth } from "@/hooks/useAuth";
import { clearToken } from "@/lib/auth";

interface TopbarProps {
  title: string;
}

export function Topbar({ title }: TopbarProps) {
  const router = useRouter();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    clearToken();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-sm">
      {/* Mobile nav trigger — visible only on small screens */}
      <div className="lg:hidden">
        <MobileNav />
      </div>

      {/* Page title */}
      <h1 className="flex-1 text-sm font-semibold tracking-tight text-foreground truncate">
        {title}
      </h1>

      {/* Operational status */}
      <div
        className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground"
        aria-label="System status: operational"
      >
        <CheckCircle2 className="size-3.5 text-[oklch(0.56_0.18_142)]" aria-hidden="true" />
        <span>System operational</span>
      </div>

      {/* Notifications */}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="View notifications"
        className="relative"
      >
        <Bell className="size-4" aria-hidden="true" />
      </Button>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open user menu"
              className="rounded-full"
            />
          }
        >
          <Avatar size="sm">
            <AvatarFallback aria-hidden="true">
              <User className="size-3.5" />
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="bottom" sideOffset={6}>
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="font-medium text-foreground">Operator</span>
              <span className="text-xs font-normal text-muted-foreground">
                Supply Chain Control Tower
              </span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onClick={handleLogout}
          >
            <LogOut className="size-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
