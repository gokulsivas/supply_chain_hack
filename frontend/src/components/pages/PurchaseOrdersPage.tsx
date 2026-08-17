"use client";

import React, { useState, useEffect } from "react";
import { motion, useReducedMotion } from "motion/react";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { POTable } from "@/components/procurement/POTable";
import { PODetailDrawer } from "@/components/procurement/PODetailDrawer";
import { RefreshCw, FileText } from "lucide-react";
import { listPurchaseOrders } from "@/lib/api";

export function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPO, setSelectedPO] = useState<Record<string, unknown> | null>(null);

  const shouldReduceMotion = useReducedMotion();

  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const data = await listPurchaseOrders();
      if (Array.isArray(data) && data.length > 0) {
        setOrders(data as unknown as Array<Record<string, unknown>>);
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
    let isMounted = true;
    const fetchInitial = async () => {
      setIsLoading(true);
      try {
        const data = await listPurchaseOrders();
        if (isMounted) {
          setOrders(Array.isArray(data) ? (data as unknown as Array<Record<string, unknown>>) : []);
        }
      } catch {
        if (isMounted) setOrders([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRowClick = (po: Record<string, unknown>) => {
    setSelectedPO(po);
  };

  return (
    <AppShell title="Purchase Orders">
      <motion.div
        initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-6 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6"
      >
        <PageHeader
          title="Purchase orders"
          description="Review issued orders and follow linked shipments."
          action={
            <div className="flex items-center gap-2.5">
              {orders.length > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-muted/60 border border-border text-xs font-medium text-muted-foreground">
                  <FileText className="size-3 text-primary" />
                  {orders.length} Active Records
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={loadOrders}
                disabled={isLoading}
                className="text-xs font-semibold h-8 shadow-2xs rounded-none cursor-pointer"
              >
                <RefreshCw className={`size-3.5 mr-1.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
              </Button>
            </div>
          }
        />

        <Card className="border border-border shadow-xs bg-card rounded-none overflow-hidden">
          <CardContent className="p-0">
            <POTable orders={orders} onRowClick={handleRowClick} />
          </CardContent>
        </Card>

        {/* Purchase Order Detail Drawer */}
        <PODetailDrawer
          order={selectedPO}
          isOpen={Boolean(selectedPO)}
          onClose={() => setSelectedPO(null)}
        />
      </motion.div>
    </AppShell>
  );
}

export default PurchaseOrdersPage;