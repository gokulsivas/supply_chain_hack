"use client";

import { useState } from "react";
import { X } from "lucide-react";
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

const BORDER_COLOR: Record<StatusVariant, string> = {
  success: "border-l-[oklch(0.56_0.18_142)]",
  warning: "border-l-[oklch(0.72_0.18_78)]",
  critical: "border-l-[oklch(0.58_0.24_27)]",
  info: "border-l-[oklch(0.52_0.18_242)]",
  neutral: "border-l-border",
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

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border border-l-4 bg-card p-3 text-sm",
        BORDER_COLOR[status],
        className
      )}
    >
      <StatusBadge status={status} label={status} className="mt-px shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground">{title}</p>
        {description && (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {dismissible && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0 -mt-0.5 -mr-1"
          onClick={() => setDismissed(true)}
          aria-label={`Dismiss alert: ${title}`}
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}
