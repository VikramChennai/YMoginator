-- ============================================
-- YMoginator Database Schema
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT '',
  batch TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  yc_verification_code TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_days INTEGER NOT NULL DEFAULT 0,
  last_verified_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Locations table
CREATE TABLE public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT 'San Francisco',
  max_capacity_per_slot INTEGER NOT NULL DEFAULT 8,
  opening_hour INTEGER NOT NULL DEFAULT 6,
  closing_hour INTEGER NOT NULL DEFAULT 22,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Time slots table
CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 8,
  current_bookings INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(location_id, date, start_time)
);

-- Bookings table
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, time_slot_id)
);

-- Gym check-ins table
CREATE TABLE public.gym_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_result TEXT NOT NULL DEFAULT '',
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_time_slots_location_date ON public.time_slots(location_id, date);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_slot ON public.bookings(time_slot_id);
CREATE INDEX idx_checkins_user_date ON public.gym_checkins(user_id, checkin_date);
CREATE INDEX idx_profiles_streak ON public.profiles(current_streak DESC);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gym_checkins ENABLE ROW LEVEL SECURITY;

-- Profiles: anyone authenticated can read, users can update own
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Locations: readable by authenticated
CREATE POLICY "Locations are viewable by authenticated users" ON public.locations
  FOR SELECT TO authenticated USING (true);

-- Time slots: readable by authenticated
CREATE POLICY "Time slots are viewable by authenticated users" ON public.time_slots
  FOR SELECT TO authenticated USING (true);

-- Bookings: readable by authenticated, writable by own user
CREATE POLICY "Bookings are viewable by authenticated users" ON public.bookings
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own bookings" ON public.bookings
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Gym check-ins: readable by authenticated, writable by own user
CREATE POLICY "Checkins are viewable by authenticated users" ON public.gym_checkins
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create own checkins" ON public.gym_checkins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================
-- Functions & Triggers
-- ============================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Increment booking count on new booking
CREATE OR REPLACE FUNCTION public.increment_booking_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE public.time_slots
    SET current_bookings = current_bookings + 1
    WHERE id = NEW.time_slot_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
    UPDATE public.time_slots
    SET current_bookings = current_bookings - 1
    WHERE id = NEW.time_slot_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_change
  AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.increment_booking_count();

-- Enforce max 2 bookings per day per user
CREATE OR REPLACE FUNCTION public.check_booking_limit()
RETURNS TRIGGER AS $$
DECLARE
  booking_count INTEGER;
  slot_date DATE;
BEGIN
  SELECT date INTO slot_date FROM public.time_slots WHERE id = NEW.time_slot_id;

  SELECT COUNT(*) INTO booking_count
  FROM public.bookings b
  JOIN public.time_slots ts ON b.time_slot_id = ts.id
  WHERE b.user_id = NEW.user_id
    AND ts.date = slot_date
    AND b.status = 'confirmed';

  IF booking_count >= 2 THEN
    RAISE EXCEPTION 'Maximum 2 bookings per day allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_booking_limit
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_booking_limit();

-- Enforce max 2 check-ins per day per user
CREATE OR REPLACE FUNCTION public.check_checkin_limit()
RETURNS TRIGGER AS $$
DECLARE
  checkin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO checkin_count
  FROM public.gym_checkins
  WHERE user_id = NEW.user_id
    AND checkin_date = CURRENT_DATE
    AND verified = true;

  IF checkin_count >= 2 THEN
    RAISE EXCEPTION 'Maximum 2 verified check-ins per day allowed';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_checkin_limit
  BEFORE INSERT ON public.gym_checkins
  FOR EACH ROW EXECUTE FUNCTION public.check_checkin_limit();

-- Generate time slots for a location
CREATE OR REPLACE FUNCTION public.generate_time_slots(
  p_location_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS void AS $$
DECLARE
  curr_date DATE;
  curr_hour INTEGER;
  loc RECORD;
BEGIN
  SELECT * INTO loc FROM public.locations WHERE id = p_location_id;

  curr_date := p_start_date;
  WHILE curr_date <= p_end_date LOOP
    curr_hour := loc.opening_hour;
    WHILE curr_hour < loc.closing_hour LOOP
      INSERT INTO public.time_slots (location_id, date, start_time, end_time, max_capacity)
      VALUES (
        p_location_id,
        curr_date,
        make_time(curr_hour, 0, 0),
        make_time(curr_hour + 1, 0, 0),
        loc.max_capacity_per_slot
      )
      ON CONFLICT (location_id, date, start_time) DO NOTHING;
      curr_hour := curr_hour + 1;
    END LOOP;
    curr_date := curr_date + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update streak RPC
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  last_date DATE;
  new_streak INTEGER;
  new_total INTEGER;
BEGIN
  SELECT last_verified_date, current_streak, total_days
  INTO last_date, new_streak, new_total
  FROM public.profiles
  WHERE id = p_user_id;

  -- Don't count if already verified today
  IF last_date = CURRENT_DATE THEN
    RETURN;
  END IF;

  new_total := new_total + 1;

  IF last_date = CURRENT_DATE - 1 THEN
    -- Consecutive day: extend streak
    new_streak := new_streak + 1;
  ELSE
    -- Streak broken: restart
    new_streak := 1;
  END IF;

  UPDATE public.profiles
  SET
    current_streak = new_streak,
    longest_streak = GREATEST(longest_streak, new_streak),
    total_days = new_total,
    last_verified_date = CURRENT_DATE,
    updated_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Seed Data: SF Gym Locations
-- ============================================

INSERT INTO public.locations (name, address, city, max_capacity_per_slot, opening_hour, closing_hour) VALUES
  ('Fitness SF - SoMa', '1001 Brannan St, San Francisco, CA 94103', 'San Francisco', 8, 6, 22),
  ('Equinox - Pine Street', '301 Pine St, San Francisco, CA 94104', 'San Francisco', 6, 5, 23),
  ('Bay Club SF Tennis', '150 Folsom St, San Francisco, CA 94105', 'San Francisco', 10, 6, 21),
  ('Koret Health & Recreation', '2 Parker Ave, San Francisco, CA 94118', 'San Francisco', 12, 7, 22);

-- Generate time slots for next 14 days for all locations
DO $$
DECLARE
  loc RECORD;
BEGIN
  FOR loc IN SELECT id FROM public.locations LOOP
    PERFORM public.generate_time_slots(loc.id, CURRENT_DATE, CURRENT_DATE + 14);
  END LOOP;
END;
$$;

-- ============================================
-- Storage: gym-photos bucket
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('gym-photos', 'gym-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload own gym photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'gym-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Gym photos are publicly readable" ON storage.objects
  FOR SELECT USING (bucket_id = 'gym-photos');
