"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, FileText } from "lucide-react";

interface RecentRequestsProps {
  requests?: any[];
  onSelectRequest?: (req: any) => void;
  refreshTrigger?: number;
}

export function RecentRequests({ requests = [], onSelectRequest }: RecentRequestsProps) {
  if (!requests || requests.length === 0) {
    return (
      <Card className="border-slate-200 shadow-sm bg-white">
        <CardHeader className="p-4 border-b bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Clock className="size-4 text-blue-600" /> Recent Requisitions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center text-xs text-slate-400">
          No recent purchase requisitions found.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
      <CardHeader className="p-4 border-b bg-slate-50/50">
        <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Clock className="size-4 text-blue-600" /> Recent Requisitions
        </CardTitle>
        <CardDescription className="text-xs">
          Latest AI-extracted requisitions ready for sourcing.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100 text-xs">
          {requests.map((pr: any, idx: number) => {
            const firstItem = Array.isArray(pr.items) && pr.items.length > 0 ? pr.items[0] : null;
            const itemTitle =
              firstItem?.description ||
              firstItem?.name ||
              pr.title ||
              pr.item_title ||
              pr.description ||
              "Industrial Procurement Request";
            const qty =
              firstItem?.quantity ||
              pr.quantity ||
              pr.total_quantity ||
              50;
            const category = pr.category || firstItem?.category || "DIRECT_MATERIAL";
            const reqId = pr.id || pr.request_id || pr.req_number || `REQ-2026-${String(idx + 1).padStart(4, "0")}`;
            const status = pr.status || "PENDING_SOURCING";
            const priority = pr.priority || "NORMAL";

            return (
              <div
                key={reqId}
                onClick={() => onSelectRequest && onSelectRequest(pr)}
                className={`p-4 transition-colors flex flex-col gap-2 ${
                  onSelectRequest ? "hover:bg-slate-50/80 cursor-pointer" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="size-3.5 text-slate-500" />
                    <span className="font-mono font-bold text-blue-700">{reqId}</span>
                    <Badge
                      className={
                        priority === "HIGH" || priority === "CRITICAL"
                          ? "bg-rose-100 text-rose-800 border-rose-200 text-[10px]"
                          : "bg-slate-100 text-slate-700 border-slate-200 text-[10px]"
                      }
                    >
                      {priority}
                    </Badge>
                  </div>
                  <Badge
                    className={
                      status === "APPROVED" || status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]"
                        : "bg-amber-100 text-amber-800 border-amber-300 text-[10px]"
                    }
                  >
                    {status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-slate-700 font-medium">
                  <span className="truncate max-w-[280px]">{itemTitle}</span>
                  <span className="text-slate-500 font-mono text-[11px] whitespace-nowrap">
                    Qty: {qty}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1">
                  <span>Category: {category}</span>
                  <span>{pr.created_at ? new Date(pr.created_at).toLocaleDateString() : "Active"}</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default RecentRequests;