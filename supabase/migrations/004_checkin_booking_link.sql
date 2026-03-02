-- Link check-ins to booked sessions
ALTER TABLE public.gym_checkins
  ADD COLUMN booking_id UUID DEFAULT NULL REFERENCES public.bookings(id) ON DELETE SET NULL;

CREATE INDEX idx_checkins_booking ON public.gym_checkins(booking_id);
