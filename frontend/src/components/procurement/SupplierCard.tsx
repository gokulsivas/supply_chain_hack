import React from "react";
import { SupplierRecommendation } from "@/types/procurement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

interface SupplierCardProps {
  recommendation: SupplierRecommendation;
  isSelected: boolean;
  onSelect: (supplierId: string) => void;
}

export function SupplierCard({ recommendation, isSelected, onSelect }: SupplierCardProps) {
  const { supplier, score_breakdown, unit_price, available_capacity, lead_time_days, is_recommended } = recommendation;

  return (
    <Card 
      className={cn(
        "relative cursor-pointer transition-all border-2",
        isSelected ? "border-primary shadow-md bg-slate-50/50" : "border-transparent hover:border-slate-200"
      )}
      onClick={() => onSelect(supplier.id)}
      role="radio"
      aria-checked={isSelected}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(supplier.id);
        }
      }}
    >
      <div className="absolute top-4 right-4 text-slate-400">
        {isSelected ? (
          <CheckCircle2 className="w-6 h-6 text-primary fill-primary/10" />
        ) : (
          <Circle className="w-6 h-6" />
        )}
      </div>

      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <CardTitle className="text-xl font-bold">{supplier.name}</CardTitle>
          {is_recommended && (
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              Recommended
            </Badge>
          )}
        </div>
        <CardDescription>{supplier.supplier_code} • {supplier.city || "Unknown location"}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core Metrics */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="text-slate-500 mb-1 font-medium">Unit Price</p>
            <p className="font-semibold text-slate-900">${unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="text-slate-500 mb-1 font-medium">Capacity</p>
            <p className="font-semibold text-slate-900">{available_capacity.toLocaleString()} units</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <p className="text-slate-500 mb-1 font-medium">Lead Time</p>
            <p className="font-semibold text-slate-900">{lead_time_days} days</p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="font-semibold text-sm">Score Breakdown</p>
            <Badge variant="outline" className="text-base font-bold text-primary px-3">
              {score_breakdown.overall_score.toFixed(1)}
            </Badge>
          </div>
          <div className="grid grid-cols-5 gap-2 text-xs">
            <div className="flex flex-col">
              <span className="text-slate-500">Cost</span>
              <span className="font-medium">{score_breakdown.cost_score.toFixed(1)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">Quality</span>
              <span className="font-medium">{score_breakdown.quality_score.toFixed(1)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">Delivery</span>
              <span className="font-medium">{score_breakdown.delivery_score.toFixed(1)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">Capacity</span>
              <span className="font-medium">{score_breakdown.capacity_score.toFixed(1)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">Lead Time</span>
              <span className="font-medium">{score_breakdown.lead_time_score.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Reasons */}
        {score_breakdown.reasons.length > 0 && (
          <div className="bg-blue-50/50 p-3 rounded-lg border border-blue-100 text-sm">
            <ul className="list-disc pl-4 space-y-1 text-slate-700">
              {score_breakdown.reasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
