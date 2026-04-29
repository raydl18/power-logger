-- Run in Supabase SQL editor.
-- Stores freeform exercise logs not tied to a program lift.

CREATE TABLE IF NOT EXISTS public.custom_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users ON DELETE CASCADE,
  exercise_name text NOT NULL,
  actual_weight numeric,
  actual_reps   int,
  actual_rpe    int,
  logged_at     timestamptz DEFAULT now(),
  log_date      date DEFAULT CURRENT_DATE,
  notes         text
);

ALTER TABLE public.custom_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_logs_select" ON public.custom_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "custom_logs_insert" ON public.custom_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "custom_logs_delete" ON public.custom_logs FOR DELETE USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_custom_logs_user_date ON public.custom_logs (user_id, log_date);
