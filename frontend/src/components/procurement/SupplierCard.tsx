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
        "relative cursor-pointer transition-all border rounded-none overflow-hidden shadow-xs",
        isSelected 
          ? "border-primary ring-1 ring-primary/20 bg-primary/5" 
          : "border-border/80 hover:border-border bg-card hover:shadow-xs"
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
      <div className="absolute top-4 right-4 text-muted-foreground/60">
        {isSelected ? (
          <CheckCircle2 className="size-5 text-primary fill-primary/10" />
        ) : (
          <Circle className="size-5 text-muted-foreground/40" />
        )}
      </div>

      <CardHeader className="p-4 pb-2 pr-12">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-bold text-foreground">{supplier.name}</CardTitle>
          {is_recommended && (
            <Badge className="bg-primary/15 text-primary border border-primary/25 text-[10px] font-semibold flex items-center gap-1">
              <Trophy className="size-3" />
              AI Best Match
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Code: <span className="font-mono text-foreground font-medium">{supplier.supplier_code}</span> • Location: {supplier.city || "Chennai DC"}
        </CardDescription>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3.5">
        {/* Core Sourcing Metrics */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-muted/30 p-2.5 rounded-none border border-border/60">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <DollarSign className="size-3 text-emerald-600 dark:text-emerald-400" /> Unit Price
            </span>
            <p className="font-bold text-foreground font-mono mt-0.5 text-xs">
              ${unit_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-muted/30 p-2.5 rounded-none border border-border/60">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Zap className="size-3 text-amber-500" /> Capacity
            </span>
            <p className="font-bold text-foreground font-mono mt-0.5 text-xs">
              {available_capacity.toLocaleString()} <span className="text-[10px] font-normal text-muted-foreground">units</span>
            </p>
          </div>

          <div className="bg-muted/30 p-2.5 rounded-none border border-border/60">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
              <Clock className="size-3 text-blue-500" /> Lead Time
            </span>
            <p className="font-bold text-foreground font-mono mt-0.5 text-xs">
              {lead_time_days} <span className="text-[10px] font-normal text-muted-foreground">days</span>
            </p>
          </div>
        </div>

        {/* Multi-Dimensional Scoring Breakdown */}
        <div className="bg-muted/30 p-3 rounded-none border border-border/60 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">Multi-Factor Match Score</span>
            <Badge variant="outline" className="text-xs font-bold font-mono bg-card text-primary border-primary/30">
              {score_breakdown.overall_score.toFixed(1)} / 100
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-xs">
            <div>
              <div className="flex justify-between text-muted-foreground mb-1 text-[10px]">
                <span>Cost</span>
                <span className="font-semibold text-foreground font-mono">{score_breakdown.cost_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.cost_score} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-muted-foreground mb-1 text-[10px]">
                <span>Quality</span>
                <span className="font-semibold text-foreground font-mono">{score_breakdown.quality_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.quality_score} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-muted-foreground mb-1 text-[10px]">
                <span>Delivery</span>
                <span className="font-semibold text-foreground font-mono">{score_breakdown.delivery_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.delivery_score} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-muted-foreground mb-1 text-[10px]">
                <span>Capacity</span>
                <span className="font-semibold text-foreground font-mono">{score_breakdown.capacity_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.capacity_score} className="h-1.5" />
            </div>
            <div>
              <div className="flex justify-between text-muted-foreground mb-1 text-[10px]">
                <span>Lead Time</span>
                <span className="font-semibold text-foreground font-mono">{score_breakdown.lead_time_score.toFixed(0)}</span>
              </div>
              <Progress value={score_breakdown.lead_time_score} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Explainable AI Decision Rationale */}
        {score_breakdown.reasons.length > 0 && (
          <div className="bg-emerald-500/10 p-2.5 rounded-none border border-emerald-500/20 text-xs">
            <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold mb-1 text-[11px]">
              <ShieldCheck className="size-3.5" /> AI Recommendation Rationale
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted-foreground">
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