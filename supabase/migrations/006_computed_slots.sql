-- Migrate from pre-generated time_slots to computed slots.
-- Bookings now reference location + date + start_time directly.

-- 1. Add new columns to bookings
ALTER TABLE public.bookings
  ADD COLUMN location_id UUID REFERENCES public.locations(id),
  ADD COLUMN date DATE,
  ADD COLUMN start_time TIME,
  ADD COLUMN google_event_id TEXT;

-- 2. Backfill from time_slots
UPDATE public.bookings b
SET
  location_id = ts.location_id,
  date = ts.date,
  start_time = ts.start_time,
  google_event_id = ts.google_event_id
FROM public.time_slots ts
WHERE b.time_slot_id = ts.id;

-- 3. Make new columns NOT NULL
ALTER TABLE public.bookings
  ALTER COLUMN location_id SET NOT NULL,
  ALTER COLUMN date SET NOT NULL,
  ALTER COLUMN start_time SET NOT NULL;

-- 4. Drop old constraint and column
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_time_slot_id_key;
ALTER TABLE public.bookings DROP COLUMN time_slot_id;

-- 5. New unique constraint: one booking per user per slot
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_user_location_date_time_key
  UNIQUE(user_id, location_id, date, start_time);

-- 6. Drop time_slots triggers and functions
DROP TRIGGER IF EXISTS on_booking_change ON public.bookings;
DROP FUNCTION IF EXISTS public.increment_booking_count();

-- 7. Recreate booking limit trigger using new columns (no join needed)
DROP TRIGGER IF EXISTS enforce_booking_limit ON public.bookings;
CREATE OR REPLACE FUNCTION public.check_booking_limit()
RETURNS TRIGGER AS $$
DECLARE
  booking_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO booking_count
  FROM public.bookings
  WHERE user_id = NEW.user_id
    AND date = NEW.date
    AND status = 'confirmed';

  IF booking_count >= 2 THEN
    RAISE EXCEPTION 'Maximum 2 bookings per day allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_booking_limit
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_limit();

-- 8. Drop time_slots table and related objects
DROP POLICY IF EXISTS "Time slots are viewable by authenticated users" ON public.time_slots;
DROP POLICY IF EXISTS "Authenticated users can update time_slots google_event_id" ON public.time_slots;
DROP TABLE public.time_slots;
DROP FUNCTION IF EXISTS public.generate_time_slots(UUID, DATE, DATE);

-- 9. New indexes
CREATE INDEX idx_bookings_location_date ON public.bookings(location_id, date, start_time);
