"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, FileText, Tag, Calendar } from "lucide-react";

interface RecentRequestsProps {
  requests?: Record<string, unknown>[];
  onSelectRequest?: (req: Record<string, unknown>) => void;
  refreshTrigger?: number;
}

export function RecentRequests({ requests = [], onSelectRequest }: RecentRequestsProps) {
  if (!requests || requests.length === 0) {
    return (
      <Card className="border border-border shadow-xs bg-card rounded-none overflow-hidden">
        <CardHeader className="p-4 border-b border-border bg-muted/40">
          <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
            <Clock className="size-4 text-primary" /> Recent Requisitions
          </CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Latest AI-extracted requisitions ready for sourcing.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center justify-center gap-2">
          <FileText className="size-8 text-muted-foreground/40" />
          <p>No recent purchase requisitions found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border shadow-xs bg-card rounded-none overflow-hidden max-h-[640px] flex flex-col">
      <CardHeader className="p-4 border-b border-border bg-muted/40 shrink-0">
        <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Recent Requisitions
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          Latest AI-extracted requisitions ready for sourcing.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 overflow-y-auto flex-1">
        <div className="divide-y divide-border text-xs">
          {requests.map((pr: Record<string, unknown>, idx: number) => {
            const firstItem = Array.isArray(pr.items) && pr.items.length > 0 ? (pr.items[0] as Record<string, unknown>) : null;
            const itemTitle = String(
              firstItem?.description ||
              firstItem?.name ||
              pr.title ||
              pr.item_title ||
              pr.description ||
              "Industrial Procurement Request"
            );
            const qty = Number(
              firstItem?.quantity ||
              pr.quantity ||
              pr.total_quantity ||
              50
            );
            const category = String(pr.category || firstItem?.category || "DIRECT_MATERIAL");
            const reqId = String(pr.id || pr.request_id || pr.req_number || `REQ-2026-${String(idx + 1).padStart(4, "0")}`);
            const status = String(pr.status || "PENDING_SOURCING");
            const priority = String(pr.priority || "NORMAL").toUpperCase();
            const createdAt = pr.created_at ? String(pr.created_at) : null;

            const isHighPriority = priority === "HIGH" || priority === "CRITICAL" || priority === "URGENT";
            const isApproved = status === "APPROVED" || status === "CONFIRMED" || status === "VALIDATED";

            return (
              <div
                key={reqId}
                onClick={() => onSelectRequest && onSelectRequest(pr)}
                className={`p-3.5 transition-colors flex flex-col gap-2 ${
                  onSelectRequest ? "hover:bg-muted/40 cursor-pointer" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <FileText className="size-3.5 text-muted-foreground shrink-0" />
                    <span className="font-mono font-bold text-xs text-primary">{reqId}</span>
                    <Badge
                      className={
                        isHighPriority
                          ? "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px] font-semibold rounded-none"
                          : "bg-muted text-muted-foreground border-border text-[10px] font-medium rounded-none"
                      }
                    >
                      {priority}
                    </Badge>
                  </div>
                  <Badge
                    className={
                      isApproved
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-semibold rounded-none"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px] font-semibold rounded-none"
                    }
                  >
                    {status}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-foreground text-xs">{itemTitle}</span>
                  <div className="flex items-center gap-4 text-muted-foreground text-[11px] flex-wrap">
                    <span className="font-medium">Qty: <strong className="text-foreground">{qty} units</strong></span>
                    <span className="flex items-center gap-1">
                      <Tag className="size-3 text-muted-foreground/70" /> {category}
                    </span>
                    {createdAt && (
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3 text-muted-foreground/70" /> {new Date(createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}