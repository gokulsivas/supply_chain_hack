"use client";

import { useState } from "react";
import { X, AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusVariant } from "./StatusBadge";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";

interface AlertBannerProps {
  status: StatusVariant;
  title: string;
  description?: string;
  dismissible?: boolean;
  className?: string;
}

const ALERT_STYLES: Record<
  StatusVariant,
  { card: string; icon: React.ElementType; iconColor: string }
> = {
  critical: {
    card: "border-rose-200/80 bg-rose-50/40 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/20 dark:text-rose-200",
    icon: AlertCircle,
    iconColor: "text-rose-600 dark:text-rose-400",
  },
  warning: {
    card: "border-amber-200/80 bg-amber-50/40 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200",
    icon: AlertTriangle,
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  info: {
    card: "border-blue-200/80 bg-blue-50/40 text-blue-950 dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-blue-200",
    icon: Info,
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  success: {
    card: "border-emerald-200/80 bg-emerald-50/40 text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200",
    icon: CheckCircle2,
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  neutral: {
    card: "border-border bg-muted/40 text-foreground",
    icon: Info,
    iconColor: "text-muted-foreground",
  },
};

export function AlertBanner({
  status,
  title,
  description,
  dismissible = true,
  className,
}: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const style = ALERT_STYLES[status] || ALERT_STYLES.neutral;
  const Icon = style.icon;

  return (
    <div
      role="alert"
      className={cn(
        "group relative flex items-start gap-3.5 rounded-none border p-4 text-sm shadow-xs transition-all duration-200 hover:shadow-sm",
        style.card,
        className
      )}
    >
      <div className={cn("mt-0.5 shrink-0 rounded-md p-0.5", style.iconColor)} aria-hidden="true">
        <Icon className="size-4" />
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            status={status}
            label={status.toUpperCase()}
            className="text-[10px] font-bold tracking-wider py-0 px-1.5 uppercase shrink-0"
          />
          <p className="font-semibold text-foreground tracking-tight leading-snug">{title}</p>
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{description}</p>
        )}
      </div>

      {dismissible && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 rounded-lg -mt-1 -mr-1 size-7"
          onClick={() => setDismissed(true)}
          aria-label={`Dismiss alert: ${title}`}
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
