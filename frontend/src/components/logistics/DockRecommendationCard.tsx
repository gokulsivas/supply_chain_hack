"use client";

import { useState, useEffect } from "react";
import { getDockRecommendation, assignDock, isApiError } from "@/lib/api";
import type { DockRecommendationResponse } from "@/types/logistics";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { Loader2, Sparkles, ArrowRight } from "lucide-react";
import { DockSlot } from "./DockSlot";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface DockRecommendationCardProps {
  truckId: string;
  onAssigned: () => void;
}

export function DockRecommendationCard({ truckId, onAssigned }: DockRecommendationCardProps) {
  const [data, setData] = useState<DockRecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const rec = await getDockRecommendation(truckId);
        if (mounted) setData(rec);
      } catch (err) {
        if (mounted) {
          setError(isApiError(err) ? err.detail : "Failed to load recommendation.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [truckId]);

  async function handleAssign(dockId: string) {
    if (!window.confirm("Are you sure you want to assign this dock?")) {
      return;
    }

    setAssigning(true);
    setError(null);
    try {
      await assignDock(truckId, dockId);
      toast.success("Dock assigned successfully.");
      onAssigned();
    } catch (err) {
      setError(isApiError(err) ? err.detail : "Failed to assign dock.");
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8 border border-border/80 rounded-none bg-card">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <AlertBanner
        status="critical"
        title="Recommendation Error"
        description={error}
        dismissible={false}
      />
    );
  }

  if (!data || !data.recommended_dock) {
    return (
      <div className="p-6 border border-border/80 rounded-none bg-card text-center text-muted-foreground text-xs">
        <p>{data?.reason || "No docks available."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 border border-emerald-500/30 rounded-none bg-emerald-500/10 p-4 shadow-2xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
          <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Optimal AI Dock Match</span>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px] font-bold rounded-none">
          High Confidence
        </Badge>
      </div>

      <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed font-medium">
        {data.reason}
      </p>

      {error && (
        <AlertBanner
          status="critical"
          title="Assignment Conflict"
          description={error}
          dismissible
        />
      )}

      <div className="bg-card rounded-none p-2 border border-border/60">
        <DockSlot 
          dock={data.recommended_dock} 
          action={
            <Button 
              disabled={assigning} 
              onClick={() => handleAssign(data.recommended_dock!.id)}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-8 px-3 shadow-2xs gap-1.5 rounded-none cursor-pointer"
            >
              {assigning ? <Loader2 className="size-3.5 animate-spin" /> : <ArrowRight className="size-3.5" />}
              Assign Dock
            </Button>
          } 
        />
      </div>
    </div>
  );
}

