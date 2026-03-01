"use client";

import { useEffect, useState } from "react";
import { GymVerifier } from "@/components/checkin/gym-verifier";
import {
  Card,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { GymCheckin } from "@/lib/types";
import { format, parseISO } from "date-fns";

export default function CheckinPage() {
  const [history, setHistory] = useState<GymCheckin[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      const res = await fetch("/api/checkins");
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
      setLoadingHistory(false);
    };
    fetchHistory();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold">Check In</h1>
        <p className="text-muted-foreground">
          Take a picture of yourself at the gym and we use an in-browser vLLM to verify it. This will add to your streak!
        </p>
      </div>

      {/* Verifier */}
      <GymVerifier />

      {/* History */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent Check-ins</h2>
        {loadingHistory ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No check-ins yet. Upload your first gym photo above!
          </p>
        ) : (
          <div className="space-y-2">
            {history.map((checkin) => (
              <Card key={checkin.id}>
                <CardHeader className="p-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {format(parseISO(checkin.created_at), "EEE, MMM d, yyyy 'at' h:mm a")}
                    </CardTitle>
                    <Badge
                      variant={checkin.verified ? "default" : "destructive"}
                    >
                      {checkin.verified ? "Verified" : "Rejected"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
