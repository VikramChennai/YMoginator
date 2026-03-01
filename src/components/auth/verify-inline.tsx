"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

export function VerifyInline() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/verify-yc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      const params = new URLSearchParams({
        name: data.name,
        company: data.company,
        batch: data.batch,
        email: data.email,
        code: data.code,
      });
      router.push(`/signup?${params.toString()}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleVerify} className="mt-8 flex w-full max-w-md flex-col gap-3">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder="Paste your YC verification link..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="flex-1"
        />
        <Button type="submit" disabled={loading} className="gap-2 shrink-0">
          {loading ? "Verifying..." : "Get Started"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Find your verification link on your YC founder profile
      </p>
    </form>
  );
}
