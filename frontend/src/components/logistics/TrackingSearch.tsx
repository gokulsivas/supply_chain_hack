import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_CHIPS = [
  "TRK-1042",
  "TRL-8821",
  "SHP-1001",
  "PO-2026-0042",
];

interface TrackingSearchProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
}

export function TrackingSearch({ onSearch, isLoading }: TrackingSearchProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleChipClick = (chip: string) => {
    setQuery(chip);
    onSearch(chip);
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <Label htmlFor="tracking-search" className="sr-only">
          Search for a shipment
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="tracking-search"
              type="text"
              placeholder="Tracking no., trailer ID, shipment ID, or PO reference"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9 bg-background h-10"
              disabled={isLoading}
              required
            />
          </div>
          <Button type="submit" disabled={isLoading || !query.trim()} className="h-10 px-6">
            {isLoading ? "Searching..." : "Track"}
          </Button>
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground font-medium">Demo searches:</span>
        {DEMO_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            disabled={isLoading}
            className="text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground px-2 py-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}
