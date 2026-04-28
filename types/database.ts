export interface Profile {
  id: string;
  username: string | null;
  display_name: string | null;
  created_at: string;
}

export interface Program {
  id: string;
  user_id: string | null;
  title: string;
  description: string | null;
  is_public: boolean;
  share_slug: string | null;
  created_at: string;
}

export interface Week {
  id: string;
  program_id: string;
  week_number: number;
  label: string | null;
  notes: string | null;
}

export interface Day {
  id: string;
  week_id: string;
  day_number: number;
  label: string | null;
}

export interface Lift {
  id: string;
  day_id: string;
  name: string;
  prescribed_sets: number | null;
  prescribed_reps: number | null;
  prescribed_weight: number | null;
  prescribed_rpe: number | null;
  notes: string | null;
  order_index: number;
}

export interface Log {
  id: string;
  user_id: string;
  lift_id: string;
  actual_weight: number | null;
  actual_rpe: number | null;
  actual_reps: number | null;
  logged_at: string;
  week_number: number | null;
  day_number: number | null;
}

export interface ProgramFollow {
  id: string;
  user_id: string;
  program_id: string;
  start_date: string;
  created_at: string;
}

// Joined / expanded types used in UI
export interface DayWithLifts extends Day {
  lifts: Lift[];
}

export interface WeekWithDays extends Week {
  days: DayWithLifts[];
}

export interface ProgramWithWeeks extends Program {
  weeks: WeekWithDays[];
}
