"use client";

import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Users } from "lucide-react";
import type { Location } from "@/lib/types";
import { cn } from "@/lib/utils";

interface LocationPickerProps {
  locations: Location[];
  selected: Location | null;
  onSelect: (location: Location) => void;
}

export function LocationPicker({
  locations,
  selected,
  onSelect,
}: LocationPickerProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {locations.map((loc) => (
        <Card
          key={loc.id}
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            selected?.id === loc.id && "ring-2 ring-primary"
          )}
          onClick={() => onSelect(loc)}
        >
          <CardContent className="px-3 py-2.5">
            <h3 className="text-sm font-semibold">{loc.name}</h3>
            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{loc.address}</span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {loc.max_capacity_per_slot} spots &middot; {loc.opening_hour}:00&ndash;{loc.closing_hour}:00
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
