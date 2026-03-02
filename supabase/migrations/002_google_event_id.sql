-- Add google_event_id to time_slots for calendar sync
ALTER TABLE public.time_slots
  ADD COLUMN IF NOT EXISTS google_event_id TEXT DEFAULT NULL;
