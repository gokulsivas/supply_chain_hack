"use client";

import { useReducedMotion, motion } from "motion/react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { StatusVariant } from "./StatusBadge";

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  status?: StatusVariant;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  animationDelay?: number;
}

const STATUS_ICON_COLOR: Record<StatusVariant, string> = {
  success: "text-[oklch(0.56_0.18_142)] bg-[oklch(0.97_0.04_142)]",
  warning: "text-[oklch(0.72_0.18_78)] bg-[oklch(0.98_0.04_78)]",
  critical: "text-[oklch(0.58_0.24_27)] bg-[oklch(0.97_0.04_27)]",
  info: "text-[oklch(0.52_0.18_242)] bg-[oklch(0.97_0.04_242)]",
  neutral: "text-muted-foreground bg-muted",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  status = "neutral",
  trend,
  className,
  animationDelay = 0,
}: KpiCardProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" as const, delay: animationDelay }}
      className={cn(
        "flex flex-col gap-3 rounded-xl bg-card ring-1 ring-foreground/10 p-4",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
          {label}
        </p>
        <div
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            STATUS_ICON_COLOR[status]
          )}
          aria-hidden="true"
        >
          <Icon className="size-3.5" />
        </div>
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className="text-3xl font-bold tabular-nums tracking-tight text-foreground leading-none">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-medium",
              trend.value > 0 ? "text-[oklch(0.56_0.18_142)]" : "text-[oklch(0.58_0.24_27)]"
            )}
            aria-label={`Trend: ${trend.value > 0 ? "up" : "down"} ${Math.abs(trend.value)}${trend.label}`}
          >
            {trend.value > 0 ? "+" : ""}
            {trend.value}
            {trend.label}
          </span>
        )}
      </div>
    </motion.div>
  );
}
