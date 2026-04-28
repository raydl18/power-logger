-- Run this in the Supabase SQL editor to add day-completion tracking.

CREATE TABLE IF NOT EXISTS public.completed_days (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  program_id   uuid NOT NULL REFERENCES public.programs ON DELETE CASCADE,
  week_number  int NOT NULL,
  day_number   int NOT NULL,
  completed_at timestamptz DEFAULT now(),
  UNIQUE (user_id, program_id, week_number, day_number)
);

ALTER TABLE public.completed_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completed_days_select" ON public.completed_days
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "completed_days_insert" ON public.completed_days
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "completed_days_delete" ON public.completed_days
  FOR DELETE USING (user_id = auth.uid());
