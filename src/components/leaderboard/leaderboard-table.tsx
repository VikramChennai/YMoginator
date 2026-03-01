"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Flame, Trophy } from "lucide-react";
import type { Profile } from "@/lib/types";
import { getStreakBadge } from "@/lib/types";

interface LeaderboardTableProps {
  profiles: Profile[];
}

const rankStyles: Record<number, string> = {
  1: "text-amber-500",
  2: "text-gray-400",
  3: "text-orange-600",
};

const rankEmoji: Record<number, string> = {
  1: "\uD83E\uDD47",
  2: "\uD83E\uDD48",
  3: "\uD83E\uDD49",
};

export function LeaderboardTable({ profiles }: LeaderboardTableProps) {
  const [sortBy, setSortBy] = useState<"streak" | "total">("streak");

  const sorted = [...profiles].sort((a, b) =>
    sortBy === "streak"
      ? b.current_streak - a.current_streak
      : b.total_days - a.total_days
  );

  return (
    <div className="space-y-4">
      <Tabs
        value={sortBy}
        onValueChange={(v) => setSortBy(v as "streak" | "total")}
      >
        <TabsList>
          <TabsTrigger value="streak" className="gap-1.5">
            <Flame className="h-4 w-4" /> Current Streak
          </TabsTrigger>
          <TabsTrigger value="total" className="gap-1.5">
            <Trophy className="h-4 w-4" /> Total Days
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Rank</TableHead>
              <TableHead>Founder</TableHead>
              <TableHead className="text-center">Streak</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="hidden sm:table-cell">Badge</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((profile, i) => {
              const rank = i + 1;
              const badge = getStreakBadge(profile.current_streak);
              return (
                <TableRow
                  key={profile.id}
                  className={cn(rank <= 3 && "bg-muted/30")}
                >
                  <TableCell>
                    <span
                      className={cn(
                        "text-lg font-bold",
                        rankStyles[rank] || "text-muted-foreground"
                      )}
                    >
                      {rankEmoji[rank] || `#${rank}`}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {profile.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium leading-tight">
                          {profile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {profile.company}
                          {profile.batch && ` (${profile.batch})`}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="flex items-center justify-center gap-1 font-semibold">
                      <Flame className="h-4 w-4 text-orange-500" />
                      {profile.current_streak}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-medium">
                    {profile.total_days}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {badge && (
                      <Badge
                        variant="secondary"
                        className={cn("text-white", badge.color)}
                      >
                        {badge.label}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {sorted.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="py-8 text-center text-muted-foreground"
                >
                  No one on the leaderboard yet. Be the first to check in!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
