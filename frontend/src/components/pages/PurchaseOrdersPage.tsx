"use client";

import React, { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { POTable } from "@/components/procurement/POTable";
import { PODetailDrawer } from "@/components/procurement/PODetailDrawer";
import { listPurchaseOrders } from "@/lib/api";
import { PurchaseOrderResponse } from "@/types/procurement";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw, FileText, AlertCircle } from "lucide-react";

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrderResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrderResponse | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await listPurchaseOrders();
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load purchase orders"));
      toast.error("Failed to refresh purchase orders");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, []);

  const handleRowClick = (order: PurchaseOrderResponse) => {
    setSelectedOrder(order);
    setIsDrawerOpen(true);
  };

  return (
    <AppShell title="Purchase orders">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader 
            title="Purchase orders"
            description="Review issued orders and follow linked shipments."
          />
          <Button 
            variant="outline" 
            onClick={fetchOrders} 
            disabled={isLoading}
            className="w-full sm:w-auto flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner className="size-10 mb-4" />
            <p className="text-slate-500">Loading purchase orders...</p>
          </div>
        ) : error ? (
          <EmptyState
            icon={AlertCircle}
            title="Failed to load orders"
            description={error.message || "An unexpected error occurred while fetching purchase orders."}
            className="bg-red-50 border-red-100"
            action={
              <Button onClick={fetchOrders} variant="outline" size="sm">
                Try again
              </Button>
            }
          />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No purchase orders found"
            description="Purchase orders will appear here once you approve a supplier for a validated purchase request."
          />
        ) : (
          <POTable orders={orders} onRowClick={handleRowClick} />
        )}
      </div>

      <PODetailDrawer 
        order={selectedOrder} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </AppShell>
  );
}
