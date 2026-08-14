"use client";

import {
  ShoppingCart,
  Truck,
  AlertTriangle,
  DockIcon,
  FileText,
  ArrowRight,
  CheckCircle2,
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
  "Requisition",
  "Supplier selection",
  "Purchase order",
  "Shipment",
  "Receipt",
  "Invoice",
  "3-way match",
  "Payment",
];

// ── Component ─────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <AppShell title="Control tower overview">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8">
        {/* Page header */}
        <PageHeader
          title="Control tower overview"
          description="Real-time visibility across procurement, logistics, and finance."
        />

        {/* KPI grid */}
        <section aria-labelledby="kpi-heading">
          <h2
            id="kpi-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3"
          >
            Key metrics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {KPI_DATA.map((kpi) => (
              <KpiCard key={kpi.label} {...kpi} />
            ))}
          </div>
        </section>

        {/* Priority alerts */}
        <section aria-labelledby="alerts-heading">
          <h2
            id="alerts-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3"
          >
            Priority alerts
          </h2>
          <div className="flex flex-col gap-2">
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
        <section aria-labelledby="pipeline-heading">
          <h2
            id="pipeline-heading"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3"
          >
            Operational pipeline
          </h2>
          <div
            className="rounded-xl bg-card ring-1 ring-foreground/10 p-4 overflow-x-auto"
            aria-label="Procurement-to-payment pipeline"
          >
            <ol
              className="flex items-center gap-0 min-w-max"
              aria-label="Pipeline steps"
            >
              {PIPELINE_STEPS.map((step, i) => (
                <li key={step} className="flex items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 ring-1 ring-primary/20">
                      <CheckCircle2
                        className="size-3.5 text-primary"
                        aria-hidden="true"
                      />
                    </div>
                    <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap px-2">
                      {step}
                    </span>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <ArrowRight
                      className="size-3 text-border mx-1 shrink-0 mb-5"
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
