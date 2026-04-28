-- ============================================================
-- Workout Tracker Schema
-- Run this in your Supabase SQL editor to set up the database.
-- ============================================================

-- Profiles (extends auth.users with username/display name)
CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  username    text UNIQUE,
  display_name text,
  created_at  timestamptz DEFAULT now()
);

-- Programs
CREATE TABLE IF NOT EXISTS public.programs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  is_public   boolean DEFAULT false,
  share_slug  text UNIQUE,
  created_at  timestamptz DEFAULT now()
);

-- Weeks
CREATE TABLE IF NOT EXISTS public.weeks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid NOT NULL REFERENCES public.programs ON DELETE CASCADE,
  week_number int NOT NULL,
  label       text,
  notes       text
);

-- Days
CREATE TABLE IF NOT EXISTS public.days (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_id     uuid NOT NULL REFERENCES public.weeks ON DELETE CASCADE,
  day_number  int NOT NULL,
  label       text
);

-- Lifts
CREATE TABLE IF NOT EXISTS public.lifts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id            uuid NOT NULL REFERENCES public.days ON DELETE CASCADE,
  name              text NOT NULL,
  prescribed_sets   int,
  prescribed_reps   int,
  prescribed_weight numeric,
  prescribed_rpe    int,
  notes             text,
  order_index       int DEFAULT 0
);

-- Logs
CREATE TABLE IF NOT EXISTS public.logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  lift_id       uuid NOT NULL REFERENCES public.lifts ON DELETE CASCADE,
  actual_weight numeric,
  actual_rpe    int,
  actual_reps   int,
  logged_at     timestamptz DEFAULT now(),
  week_number   int,
  day_number    int
);

-- Program follows
CREATE TABLE IF NOT EXISTS public.program_follows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  program_id  uuid NOT NULL REFERENCES public.programs ON DELETE CASCADE,
  start_date  date DEFAULT CURRENT_DATE,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, program_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_programs_user_id     ON public.programs (user_id);
CREATE INDEX IF NOT EXISTS idx_programs_share_slug  ON public.programs (share_slug);
CREATE INDEX IF NOT EXISTS idx_weeks_program_id     ON public.weeks (program_id);
CREATE INDEX IF NOT EXISTS idx_days_week_id         ON public.days (week_id);
CREATE INDEX IF NOT EXISTS idx_lifts_day_id         ON public.lifts (day_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id         ON public.logs (user_id);
CREATE INDEX IF NOT EXISTS idx_logs_lift_id         ON public.logs (lift_id);
CREATE INDEX IF NOT EXISTS idx_follows_user_id      ON public.program_follows (user_id);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    LOWER(SPLIT_PART(NEW.email, '@', 1)),
    SPLIT_PART(NEW.email, '@', 1)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RPC: copy a program to a new user (for following)
-- ============================================================
CREATE OR REPLACE FUNCTION public.copy_program_for_user(
  source_program_id uuid,
  target_user_id    uuid
)
RETURNS uuid AS $$
DECLARE
  new_program_id uuid;
  new_week_id    uuid;
  new_day_id     uuid;
  old_week       RECORD;
  old_day        RECORD;
  old_lift       RECORD;
  src            RECORD;
BEGIN
  SELECT * INTO src FROM public.programs WHERE id = source_program_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source program not found';
  END IF;

  -- Copy program (strip slug so no collision)
  INSERT INTO public.programs (user_id, title, description, is_public, share_slug, created_at)
  VALUES (target_user_id, src.title, src.description, false, NULL, NOW())
  RETURNING id INTO new_program_id;

  FOR old_week IN SELECT * FROM public.weeks WHERE program_id = source_program_id ORDER BY week_number LOOP
    INSERT INTO public.weeks (program_id, week_number, label, notes)
    VALUES (new_program_id, old_week.week_number, old_week.label, old_week.notes)
    RETURNING id INTO new_week_id;

    FOR old_day IN SELECT * FROM public.days WHERE week_id = old_week.id ORDER BY day_number LOOP
      INSERT INTO public.days (week_id, day_number, label)
      VALUES (new_week_id, old_day.day_number, old_day.label)
      RETURNING id INTO new_day_id;

      FOR old_lift IN SELECT * FROM public.lifts WHERE day_id = old_day.id ORDER BY order_index LOOP
        INSERT INTO public.lifts (
          day_id, name, prescribed_sets, prescribed_reps,
          prescribed_weight, prescribed_rpe, notes, order_index
        ) VALUES (
          new_day_id, old_lift.name, old_lift.prescribed_sets, old_lift.prescribed_reps,
          old_lift.prescribed_weight, old_lift.prescribed_rpe, old_lift.notes, old_lift.order_index
        );
      END LOOP;
    END LOOP;
  END LOOP;

  INSERT INTO public.program_follows (user_id, program_id, start_date)
  VALUES (target_user_id, new_program_id, CURRENT_DATE)
  ON CONFLICT (user_id, program_id) DO NOTHING;

  RETURN new_program_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.days            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lifts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_follows ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Programs: own + public + system (null user_id)
CREATE POLICY "programs_select" ON public.programs FOR SELECT
  USING (user_id = auth.uid() OR is_public = true OR user_id IS NULL);
CREATE POLICY "programs_insert" ON public.programs FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "programs_update" ON public.programs FOR UPDATE
  USING (user_id = auth.uid());
CREATE POLICY "programs_delete" ON public.programs FOR DELETE
  USING (user_id = auth.uid());

-- Weeks (readable if program is readable)
CREATE POLICY "weeks_select" ON public.weeks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.programs p
    WHERE p.id = program_id
      AND (p.user_id = auth.uid() OR p.is_public = true OR p.user_id IS NULL)
  ));
CREATE POLICY "weeks_insert" ON public.weeks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "weeks_update" ON public.weeks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "weeks_delete" ON public.weeks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.programs p WHERE p.id = program_id AND p.user_id = auth.uid()
  ));

-- Days
CREATE POLICY "days_select" ON public.days FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.weeks w
    JOIN public.programs p ON p.id = w.program_id
    WHERE w.id = week_id
      AND (p.user_id = auth.uid() OR p.is_public = true OR p.user_id IS NULL)
  ));
CREATE POLICY "days_insert" ON public.days FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.weeks w
    JOIN public.programs p ON p.id = w.program_id
    WHERE w.id = week_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "days_update" ON public.days FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.weeks w
    JOIN public.programs p ON p.id = w.program_id
    WHERE w.id = week_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "days_delete" ON public.days FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.weeks w
    JOIN public.programs p ON p.id = w.program_id
    WHERE w.id = week_id AND p.user_id = auth.uid()
  ));

-- Lifts
CREATE POLICY "lifts_select" ON public.lifts FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.days d
    JOIN public.weeks w ON w.id = d.week_id
    JOIN public.programs p ON p.id = w.program_id
    WHERE d.id = day_id
      AND (p.user_id = auth.uid() OR p.is_public = true OR p.user_id IS NULL)
  ));
CREATE POLICY "lifts_insert" ON public.lifts FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.days d
    JOIN public.weeks w ON w.id = d.week_id
    JOIN public.programs p ON p.id = w.program_id
    WHERE d.id = day_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "lifts_update" ON public.lifts FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.days d
    JOIN public.weeks w ON w.id = d.week_id
    JOIN public.programs p ON p.id = w.program_id
    WHERE d.id = day_id AND p.user_id = auth.uid()
  ));
CREATE POLICY "lifts_delete" ON public.lifts FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.days d
    JOIN public.weeks w ON w.id = d.week_id
    JOIN public.programs p ON p.id = w.program_id
    WHERE d.id = day_id AND p.user_id = auth.uid()
  ));

-- Logs (own only)
CREATE POLICY "logs_select" ON public.logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "logs_insert" ON public.logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "logs_update" ON public.logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "logs_delete" ON public.logs FOR DELETE USING (user_id = auth.uid());

-- Program follows (own only)
CREATE POLICY "follows_select" ON public.program_follows FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "follows_insert" ON public.program_follows FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "follows_delete" ON public.program_follows FOR DELETE USING (user_id = auth.uid());
