"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { POTable } from "@/components/procurement/POTable";
import { RefreshCw } from "lucide-react";

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/procurement/purchase-orders`);
      if (Array.isArray(res.data) && res.data.length > 0) {
        setOrders(res.data);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleRowClick = (po: any) => {
    setSelectedPO(po);
  };

  return (
    <AppShell title="Purchase Orders">
      <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full py-6">
        <PageHeader
          title="Purchase orders"
          description="Review issued orders and follow linked shipments."
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={loadOrders}
              disabled={isLoading}
              className="text-xs"
            >
              <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          }
        />

        <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
          <CardContent className="p-0">
            <POTable orders={orders} onRowClick={handleRowClick} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

export default PurchaseOrdersPage;