"use client";

import { useState, useEffect } from "react";
import { getDockRecommendation, assignDock, isApiError } from "@/lib/api";
import type { DockRecommendationResponse } from "@/types/logistics";
import { Button } from "@/components/ui/button";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { Loader2, Star } from "lucide-react";
import { DockSlot } from "./DockSlot";
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
      <div className="flex justify-center p-8 border border-border rounded-xl bg-card">
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
      <div className="p-6 border border-border rounded-xl bg-card text-center text-muted-foreground">
        <p>{data?.reason || "No docks available."}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 border border-[oklch(0.56_0.18_142)] rounded-xl bg-[oklch(0.99_0.02_142)] p-1 overflow-hidden shadow-sm">
      <div className="bg-card rounded-lg p-5 flex flex-col gap-4">
        <div>
          <div className="flex items-center gap-2 text-[oklch(0.56_0.18_142)] mb-1">
            <Star className="size-4 fill-current" />
            <span className="font-semibold text-sm uppercase tracking-wider">Top Recommendation</span>
          </div>
          <p className="text-sm text-muted-foreground">{data.reason}</p>
          {error && (
            <AlertBanner
              status="critical"
              title="Assignment Conflict"
              description={error}
              className="mt-3"
              dismissible
            />
          )}
        </div>

        <DockSlot 
          dock={data.recommended_dock} 
          action={
            <Button 
              disabled={assigning} 
              onClick={() => handleAssign(data.recommended_dock!.id)}
              className="w-full sm:w-auto"
            >
              {assigning && <Loader2 className="size-4 animate-spin mr-2" />}
              Assign Dock
            </Button>
          } 
        />
      </div>
    </div>
  );
}
