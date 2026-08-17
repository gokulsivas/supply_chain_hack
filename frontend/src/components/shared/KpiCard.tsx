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

const STATUS_ACCENTS: Record<
  StatusVariant,
  { iconWrap: string; iconColor: string }
> = {
  success: {
    iconWrap: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    iconColor: "text-emerald-600",
  },
  warning: {
    iconWrap: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
    iconColor: "text-amber-600",
  },
  critical: {
    iconWrap: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
    iconColor: "text-rose-600",
  },
  info: {
    iconWrap: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800",
    iconColor: "text-blue-600",
  },
  neutral: {
    iconWrap: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    iconColor: "text-slate-500",
  },
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
  const accent = STATUS_ACCENTS[status] || STATUS_ACCENTS.neutral;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
        delay: animationDelay,
      }}
      whileHover={shouldReduceMotion ? undefined : { y: -2 }}
      className={cn(
        "group relative flex flex-col justify-between rounded-none bg-card border border-border p-4 sm:p-5 shadow-xs transition-all duration-200 hover:border-border hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground leading-snug">
          {label}
        </p>
        <div
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-none border transition-transform duration-200 group-hover:scale-105",
            accent.iconWrap
          )}
          aria-hidden="true"
        >
          <Icon className="size-4" />
        </div>
      </div>

      <div className="mt-3.5 flex items-baseline justify-between gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-foreground leading-none font-mono">
          {value}
        </span>
        {trend && (
          <span
            className={cn(
              "text-xs font-semibold px-1.5 py-0.5 rounded-none flex items-center gap-0.5",
              trend.value > 0
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                : "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400"
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
