"use client";

import { useReducedMotion, motion } from "motion/react";
import {
  ShoppingCart,
  Truck,
  AlertTriangle,
  DockIcon,
  FileText,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { KpiCard } from "@/components/shared/KpiCard";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { PageHeader } from "@/components/shared/PageHeader";

// ── Static mock data ──────────────────────────────────────────────

const KPI_DATA = [
  {
    label: "Active purchase orders",
    value: 24,
    icon: ShoppingCart,
    status: "info" as const,
    animationDelay: 0,
  },
  {
    label: "Trucks in transit",
    value: 12,
    icon: Truck,
    status: "success" as const,
    animationDelay: 0.04,
  },
  {
    label: "Delayed trucks",
    value: 3,
    icon: AlertTriangle,
    status: "critical" as const,
    animationDelay: 0.08,
  },
  {
    label: "Available docks",
    value: 8,
    icon: DockIcon,
    status: "neutral" as const,
    animationDelay: 0.12,
  },
  {
    label: "Pending invoices",
    value: 17,
    icon: FileText,
    status: "warning" as const,
    animationDelay: 0.16,
  },
] as const;

const PRIORITY_ALERTS = [
  {
    id: "a1",
    status: "critical" as const,
    title: "TRK-1042 is delayed by 45 minutes",
    description: "Last known position: Interstate 85, Georgia. ETA revised to 18:45.",
  },
  {
    id: "a2",
    status: "warning" as const,
    title: "Dock D-03 is unavailable due to maintenance",
    description: "Expected to resume operations at 16:00. Affected vehicles being rerouted.",
  },
  {
    id: "a3",
    status: "info" as const,
    title: "Invoice INV-2081 requires 3-way match review",
    description: "Line item discrepancy detected. Awaiting finance team approval.",
  },
];

const PIPELINE_STEPS = [
  { step: "01", name: "Requisition" },
  { step: "02", name: "Supplier selection" },
  { step: "03", name: "Purchase order" },
  { step: "04", name: "Shipment" },
  { step: "05", name: "Receipt" },
  { step: "06", name: "Invoice" },
  { step: "07", name: "3-way match" },
  { step: "08", name: "Payment" },
];

// ── Component ─────────────────────────────────────────────────────

export default function DashboardPage() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <AppShell title="Control tower overview">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8"
      >
        {/* Page header */}
        <PageHeader
          title="Control tower overview"
          description="Real-time visibility across procurement, logistics, and finance."
        />

        {/* KPI grid */}
        <section aria-labelledby="kpi-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              id="kpi-heading"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Key metrics
            </h2>
            <span className="text-[11px] font-medium text-muted-foreground">
              Live updates active
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {KPI_DATA.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
        </section>

        {/* Priority alerts */}
        <section aria-labelledby="alerts-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              id="alerts-heading"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Priority alerts
            </h2>
            <span className="text-[11px] font-medium text-muted-foreground">
              {PRIORITY_ALERTS.length} critical items
            </span>
          </div>
          <div className="flex flex-col gap-2.5">
            {PRIORITY_ALERTS.map((alert) => (
              <AlertBanner
                key={alert.id}
                status={alert.status}
                title={alert.title}
                description={alert.description}
              />
            ))}
          </div>
        </section>

        {/* Operational pipeline */}
        <section aria-labelledby="pipeline-heading" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2
              id="pipeline-heading"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Operational pipeline
            </h2>
            <span className="text-[11px] font-medium text-muted-foreground">
              End-to-end execution flow
            </span>
          </div>
          <div
            className="rounded-none bg-card border border-border p-5 shadow-xs overflow-x-auto"
            aria-label="Procurement-to-payment pipeline"
          >
            <ol
              className="flex items-center gap-1 min-w-max justify-between"
              aria-label="Pipeline steps"
            >
              {PIPELINE_STEPS.map((item, i) => (
                <li key={item.name} className="flex items-center flex-1">
                  <div className="group flex flex-col items-center gap-2 p-2 rounded-none transition-colors hover:bg-muted/40 min-w-[105px]">
                    <div className="relative flex h-8 w-8 items-center justify-center rounded-none bg-primary/10 border border-primary/20 text-primary transition-transform duration-200 group-hover:scale-105">
                      <CheckCircle2
                        className="size-4 text-primary"
                        aria-hidden="true"
                      />
                      <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-none bg-background border border-border text-[9px] font-mono font-bold text-muted-foreground shadow-2xs">
                        {item.step}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-foreground/90 whitespace-nowrap text-center">
                      {item.name}
                    </span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className="flex items-center justify-center px-1 text-muted-foreground/40 shrink-0">
                      <ChevronRight
                        className="size-4"
                        aria-hidden="true"
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </motion.div>
    </AppShell>
  );
}
