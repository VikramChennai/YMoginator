-- Allow authenticated users to update google_event_id on time_slots
CREATE POLICY "Authenticated users can update time_slots google_event_id" ON public.time_slots
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);
