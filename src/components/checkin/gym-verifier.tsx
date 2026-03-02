"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhotoUpload } from "./photo-upload";
import { BookingSelector } from "./booking-selector";
import { useGymVerifier } from "@/hooks/use-gym-verifier";
import { useTodaysBookings } from "@/hooks/use-todays-bookings";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/auth/auth-provider";
import { toast } from "sonner";
import {
  Brain,
  CheckCircle2,
  XCircle,
  Loader2,
  Dumbbell,
} from "lucide-react";

export function GymVerifier() {
  const { status, progress, result, error, loadModel, verify, reset } =
    useGymVerifier();
  const {
    bookings,
    loading: bookingsLoading,
    selectedBookingId,
    setSelectedBookingId,
  } = useTodaysBookings();
  const { user, refreshProfile } = useAuth();
  const supabase = createClient();
  const [imageData, setImageData] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const hasBooking = bookings.length > 0;

  // Auto-load model on mount (only if user has a booking)
  useEffect(() => {
    if (status === "idle" && hasBooking) {
      loadModel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBooking]);

  const handleCapture = (data: string) => {
    setImageData(data);
  };

  const handleVerify = () => {
    if (imageData) {
      verify(imageData);
    }
  };

  const handleCheckin = async () => {
    console.log("[checkin] handleCheckin called", {
      user: !!user,
      imageData: !!imageData,
      verified: result?.verified,
      selectedBookingId,
    });
    if (!user || !imageData || !result?.verified || !selectedBookingId) return;
    setSubmitting(true);

    try {
      // Convert base64 to blob for upload
      const response = await fetch(imageData);
      const blob = await response.blob();
      const fileName = `${user.id}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("gym-photos")
        .upload(fileName, blob, { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("gym-photos").getPublicUrl(fileName);

      // Create check-in
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photo_url: publicUrl,
          verified: true,
          verification_result: result.result,
          booking_id: selectedBookingId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      toast.success("Check-in recorded! Your streak has been updated.");
      await refreshProfile();
      reset();
      setImageData(null);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to submit check-in"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    reset();
    setImageData(null);
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-xl">
          <Dumbbell className="h-5 w-5" />
          Gym Check-in
        </CardTitle>
        <CardDescription>
          Take a gym selfie and our in-browser CLIP model will verify
          you&apos;re actually there. No cheating!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Booking selector — always shown first */}
        <BookingSelector
          bookings={bookings}
          loading={bookingsLoading}
          selectedBookingId={selectedBookingId}
          onSelect={setSelectedBookingId}
        />

        {/* Only show photo/verify flow if user has a booking */}
        {hasBooking && !bookingsLoading && (
          <>
            {/* Loading progress */}
            {(status === "idle" || status === "loading") && (
              <div className="space-y-2 text-center">
                <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading CLIP model... {Math.round(progress)}%
                </p>
                <div className="mx-auto h-2 w-48 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Capture photo */}
            {(status === "ready" || status === "verifying") && (
              <>
                <PhotoUpload
                  onCapture={handleCapture}
                  disabled={status === "verifying" || submitting}
                />

                {/* Verify button */}
                {imageData && status === "ready" && (
                  <Button
                    onClick={handleVerify}
                    className="w-full gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    Verify Photo
                  </Button>
                )}

                {/* Verifying spinner */}
                {status === "verifying" && (
                  <div className="flex items-center justify-center gap-2 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">
                      Analyzing your photo...
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Result */}
            {status === "done" && result && (
              <div className="space-y-3 text-center">
                {result.verified ? (
                  <>
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="h-6 w-6" />
                      <span className="text-lg font-semibold">
                        Gym verified!
                      </span>
                    </div>
                    <Button
                      onClick={handleCheckin}
                      disabled={submitting || !selectedBookingId}
                      className="w-full"
                    >
                      {submitting
                        ? "Submitting check-in..."
                        : "Submit Check-in & Update Streak"}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center gap-2 text-destructive">
                      <XCircle className="h-6 w-6" />
                      <span className="text-lg font-semibold">
                        Not a gym photo
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Our AI didn&apos;t detect a gym. Try a clearer photo.
                    </p>
                    <Button variant="outline" onClick={handleReset} className="w-full">
                      Try Again
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Error state */}
            {status === "error" && (
              <div className="space-y-2 text-center">
                <p className="text-sm text-destructive">{error}</p>
                <Button variant="outline" onClick={handleReset}>
                  Try Again
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
