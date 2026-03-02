import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CalendarDays,
  Camera,
  Trophy,
  ArrowRight,
  Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { VerifyInline } from "@/components/auth/verify-inline";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const supabase = await createClient();

  const { data: topProfiles } = await supabase
    .from("profiles")
    .select("name, company, batch, current_streak")
    .order("current_streak", { ascending: false })
    .limit(5);

  const features = [
    {
      icon: CalendarDays,
      title: "Book Gym Sessions",
      description:
        "Book slots at popular gyms in SF to work out with other YC founders.",
    },
    {
      icon: Camera,
      title: "AI-Verified Check-ins",
      description:
        "In-browser CLIP-powered verification. Just take a picture of you at the gym!",
    },
    {
      icon: Trophy,
      title: "Leaderboard",
      description:
        "See who's locked in at the gym. Friendly community competition :)",
    },
  ];

  return (
    <div>
      {/* Top bar — just a login link, no full navbar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-1.5 font-bold">
          <svg viewBox="0 0 48 48" className="h-6 w-6 shrink-0 rounded-lg">
            <rect width="48" height="48" rx="10" fill="#FF6600" />
            <g transform="rotate(-45 24 24)">
              <rect x="14" y="21" width="20" height="6" rx="3" fill="white" />
              <rect x="10" y="17.5" width="7" height="13" rx="2.5" fill="white" />
              <rect x="31" y="17.5" width="7" height="13" rx="2.5" fill="white" />
            </g>
          </svg>
          <span>Y Moginator</span>
        </div>
        <div className="flex items-center gap-1">
          <a href="https://github.com/VikramChennai/YMoginator" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.08-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .1-.78.42-1.3.76-1.6-2.67-.31-5.47-1.34-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.14-.3-.54-1.52.1-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6.02 0c2.28-1.55 3.29-1.23 3.29-1.23.64 1.66.24 2.88.12 3.18a4.65 4.65 0 0 1 1.23 3.22c0 4.61-2.8 5.62-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3" /></svg>
            </Button>
          </a>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center px-4 py-16 text-center sm:py-24">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Work out with other YC founders!
        </h1>
        <p className="mt-4 max-w-lg text-lg text-muted-foreground">
          YMoginator is an Open Source community tool that lets you book shared gym sessions with other YC founders
        </p>

        {/* Inline verification */}
        <VerifyInline />
      </section>

      {/* Features */}
      <section className="border-t bg-muted/30 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-2xl font-bold">How it works</h2>
          <div className="grid gap-6 sm:grid-cols-3">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title}>
                <CardHeader>
                  <Icon className="h-8 w-8 text-primary" />
                  <CardTitle className="mt-2">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    {description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      {topProfiles && topProfiles.length > 0 && (
        <section className="border-t px-4 py-16">
          <div className="mx-auto max-w-md">
            <h2 className="mb-6 text-center text-2xl font-bold">
              Top Streaks
            </h2>
            <div className="space-y-2">
              {topProfiles.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground">
                      #{i + 1}
                    </span>
                    <p className="font-medium">
                      {p.name || "Anonymous"}
                      {(p.company || p.batch) && (
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({[p.company, p.batch].filter(Boolean).join(", ")})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 font-semibold">
                    <Flame className="h-4 w-4 text-orange-500" />
                    {p.current_streak}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-center">
              <Link href="/leaderboard">
                <Button variant="outline" className="gap-1.5">
                  View Full Leaderboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

    </div>
  );
}
