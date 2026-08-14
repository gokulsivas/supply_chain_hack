import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

import { listPurchaseRequests } from "@/lib/api";
import type { PurchaseRequest } from "@/types/procurement";
import { StatusBadge, type StatusVariant } from "@/components/shared/StatusBadge";
import { AlertBanner } from "@/components/shared/AlertBanner";

interface RecentRequestsProps {
  refreshTrigger: number;
}

function getStatusVariant(status: string): StatusVariant {
  switch (status.toUpperCase()) {
    case "VALIDATED":
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "critical";
    case "DRAFT":
      return "neutral";
    default:
      return "info";
  }
}

export function RecentRequests({ refreshTrigger }: RecentRequestsProps) {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRequests() {
      setLoading(true);
      setError(null);
      try {
        const data = await listPurchaseRequests();
        setRequests(data.slice(0, 5)); // show latest 5
      } catch (err: unknown) {
        const message = (err as { detail?: string }).detail || "Failed to load recent requests.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchRequests();
  }, [refreshTrigger]);

  if (loading && requests.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return <AlertBanner status="critical" title="Error loading requests" description={error} />;
  }

  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground border rounded-xl bg-card">
        <p className="text-sm">No recent purchase requests found.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="bg-muted/50 px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">Recent Requests</h3>
      </div>
      <div className="divide-y">
        {requests.map((pr) => {
          const item = pr.items[0];
          return (
            <div key={pr.id} className="p-4 hover:bg-muted/30 transition-colors flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {pr.request_code}
                </span>
                <StatusBadge status={getStatusVariant(pr.status)} label={pr.status} />
              </div>
              <div className="flex justify-between items-start gap-4">
                <div className="flex flex-col">
                  <span className="font-medium">{item?.product?.name || "Unknown Item"}</span>
                  <span className="text-sm text-muted-foreground">Qty: {item?.quantity || 0}</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-sm">{pr.delivery_location}</span>
                  <span className="text-xs text-muted-foreground">
                    Req: {pr.required_date ? format(new Date(pr.required_date), "MMM d, yyyy") : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
