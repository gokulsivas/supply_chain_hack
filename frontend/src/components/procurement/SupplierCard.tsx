import React from "react";
import { SupplierRecommendation } from "@/types/procurement";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Trophy, Zap, Clock, ShieldCheck, DollarSign } from "lucide-react";
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
        "relative cursor-pointer transition-all border-2 rounded-xl overflow-hidden",
        isSelected ? "border-blue-600 shadow-lg bg-blue-50/20" : "border-slate-200 hover:border-slate-300 bg-white"
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
          <CheckCircle2 className="w-6 h-6 text-blue-600 fill-blue-50" />
        ) : (
          <Circle className="w-6 h-6 text-slate-300" />
        )}
      </div>

      <CardHeader className="pb-3 pr-12">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-bold text-slate-900">{supplier.name}</CardTitle>
          {is_recommended && (
            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium flex items-center gap-1 shadow-sm">
              <Trophy className="w-3.5 h-3.5" />
              AI Best Match
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs text-slate-500">
          Code: <span className="font-mono text-slate-700">{supplier.supplier_code}</span> • Location: {supplier.city || "Chennai DC"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core Sourcing Metrics */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Unit Price
            </span>
            <p className="font-bold text-slate-900 mt-1">
              ${unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Zap className="w-3.5 h-3.5 text-amber-500" /> Capacity
            </span>
            <p className="font-bold text-slate-900 mt-1">
              {available_capacity.toLocaleString()} <span className="text-xs font-normal text-slate-500">units</span>
            </p>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-500" /> Lead Time
            </span>
            <p className="font-bold text-slate-900 mt-1">
              {lead_time_days} <span className="text-xs font-normal text-slate-500">days</span>
            </p>
          </div>
        </div>

        {/* Multi-Dimensional Scoring Breakdown */}
        <div className="bg-slate-50/60 p-3 rounded-lg border border-slate-100 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Multi-Factor Match Score</span>
            <Badge variant="outline" className="text-sm font-bold bg-white text-blue-700 border-blue-200 shadow-sm">
              {score_breakdown.overall_score.toFixed(1)} / 100
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
            <div>
              <div className="flex justify-between text-slate-500 mb-1 text-[11px]">
                <span>Cost</span>
                <span className="font-semibold text-slate-800">{score_breakdown.cost_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.cost_score} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-slate-500 mb-1 text-[11px]">
                <span>Quality</span>
                <span className="font-semibold text-slate-800">{score_breakdown.quality_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.quality_score} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-slate-500 mb-1 text-[11px]">
                <span>Delivery</span>
                <span className="font-semibold text-slate-800">{score_breakdown.delivery_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.delivery_score} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-slate-500 mb-1 text-[11px]">
                <span>Capacity</span>
                <span className="font-semibold text-slate-800">{score_breakdown.capacity_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.capacity_score} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-slate-500 mb-1 text-[11px]">
                <span>Lead Time</span>
                <span className="font-semibold text-slate-800">{score_breakdown.lead_time_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.lead_time_score} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Explainable AI Decision Rationale */}
        {score_breakdown.reasons.length > 0 && (
          <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100 text-xs">
            <div className="flex items-center gap-1 text-emerald-800 font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" /> AI Recommendation Rationale
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-slate-700">
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