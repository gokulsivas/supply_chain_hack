import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  Minus,
} from "lucide-react";

export type StatusVariant = "success" | "warning" | "critical" | "info" | "neutral";

interface StatusBadgeProps {
  status: StatusVariant;
  label: string;
  className?: string;
}

const STATUS_CONFIG: Record<
  StatusVariant,
  { icon: React.ElementType; colorClass: string; bgClass: string }
> = {
  success: {
    icon: CheckCircle2,
    colorClass: "text-[oklch(0.56_0.18_142)]",
    bgClass: "bg-[oklch(0.97_0.04_142)]",
  },
  warning: {
    icon: AlertTriangle,
    colorClass: "text-[oklch(0.72_0.18_78)]",
    bgClass: "bg-[oklch(0.98_0.04_78)]",
  },
  critical: {
    icon: XCircle,
    colorClass: "text-[oklch(0.58_0.24_27)]",
    bgClass: "bg-[oklch(0.97_0.04_27)]",
  },
  info: {
    icon: Info,
    colorClass: "text-[oklch(0.52_0.18_242)]",
    bgClass: "bg-[oklch(0.97_0.04_242)]",
  },
  neutral: {
    icon: Minus,
    colorClass: "text-muted-foreground",
    bgClass: "bg-muted",
  },
};

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const { icon: Icon, colorClass, bgClass } = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        bgClass,
        colorClass,
        className
      )}
      role="status"
      aria-label={`Status: ${status} — ${label}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden="true" />
      {label}
    </span>
  );
}
