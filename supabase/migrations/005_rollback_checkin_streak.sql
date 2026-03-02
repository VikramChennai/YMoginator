-- Rollback streak when a check-in is removed (booking cancelled)
-- Deletes the check-in, then recalculates streak from remaining verified check-ins
CREATE OR REPLACE FUNCTION public.rollback_checkin_for_booking(p_booking_id UUID, p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_streak INTEGER := 0;
  v_total INTEGER;
  v_last_date DATE;
  rec RECORD;
BEGIN
  -- Delete check-ins linked to this booking
  DELETE FROM public.gym_checkins
  WHERE booking_id = p_booking_id AND user_id = p_user_id;

  -- Count total verified check-in days
  SELECT COUNT(DISTINCT checkin_date)
  INTO v_total
  FROM public.gym_checkins
  WHERE user_id = p_user_id AND verified = true;

  -- Find the most recent verified check-in date
  SELECT MAX(checkin_date)
  INTO v_last_date
  FROM public.gym_checkins
  WHERE user_id = p_user_id AND verified = true;

  -- Recalculate current streak by walking backwards from last verified date
  IF v_last_date IS NOT NULL THEN
    v_streak := 0;
    FOR rec IN
      SELECT DISTINCT checkin_date
      FROM public.gym_checkins
      WHERE user_id = p_user_id AND verified = true
      ORDER BY checkin_date DESC
    LOOP
      IF rec.checkin_date = v_last_date - (v_streak * INTERVAL '1 day') THEN
        v_streak := v_streak + 1;
      ELSE
        EXIT;
      END IF;
    END LOOP;
  END IF;

  UPDATE public.profiles
  SET
    current_streak = v_streak,
    total_days = v_total,
    last_verified_date = v_last_date,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
