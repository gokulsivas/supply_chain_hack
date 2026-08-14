import React from "react";
import { SupplierRecommendation } from "@/types/procurement";
import { SupplierCard } from "./SupplierCard";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchX, AlertTriangle } from "lucide-react";

interface SupplierListProps {
  recommendations: SupplierRecommendation[];
  selectedSupplierId: string | null;
  onSelectSupplier: (supplierId: string) => void;
  isLoading: boolean;
  error: Error | null;
}

export function SupplierList({ 
  recommendations, 
  selectedSupplierId, 
  onSelectSupplier, 
  isLoading, 
  error 
}: SupplierListProps) {

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <LoadingSpinner className="size-10 mb-4" />
        <p className="text-slate-500">Calculating recommendations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertTriangle}
        title="Failed to load recommendations"
        description={error.message || "An unexpected error occurred while calculating supplier scores."}
        className="bg-red-50/50 border-red-100"
      />
    );
  }

  if (recommendations.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="No eligible suppliers found"
        description="There are no active suppliers with sufficient capacity for this item."
      />
    );
  }

  return (
    <div className="space-y-4" role="radiogroup" aria-label="Supplier Recommendations">
      {recommendations.map((rec) => (
        <SupplierCard
          key={rec.supplier.id}
          recommendation={rec}
          isSelected={selectedSupplierId === rec.supplier.id}
          onSelect={onSelectSupplier}
        />
      ))}
    </div>
  );
}
