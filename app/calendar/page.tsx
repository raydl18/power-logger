"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";

interface WorkoutDay {
  date: string;        // YYYY-MM-DD
  weekNumber: number;
  dayLabel: string;
}

const WEEK_RPE: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: "#4ade80", bg: "rgba(74,222,128,0.25)",  label: "RPE 6" },
  2: { color: "#facc15", bg: "rgba(250,204,21,0.25)",  label: "RPE 7" },
  3: { color: "#fb923c", bg: "rgba(251,146,60,0.25)",  label: "RPE 8" },
  4: { color: "#f87171", bg: "rgba(248,113,113,0.25)", label: "RPE 9" },
};

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function monthsBetween(start: Date, end: Date): Date[] {
  const months: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }
  return months;
}

function calendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const grid: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);
  return grid;
}

export default function CalendarPage() {
  const router = useRouter();
  const supabase = createClient();

  const [workoutMap, setWorkoutMap] = useState<Map<string, WorkoutDay>>(new Map());
  const [months, setMonths]         = useState<Date[]>([]);
  const [startDate, setStartDate]   = useState<Date | null>(null);
  const [loading, setLoading]       = useState(true);
  const today = toDateStr(new Date());

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      // Get program follow for start date
      const { data: follow } = await supabase
        .from("program_follows")
        .select("start_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      const start = follow ? new Date(follow.start_date) : new Date();
      setStartDate(start);
      setMonths(monthsBetween(start, new Date()));

      // Get completed days with timestamps
      const { data: completed } = await supabase
        .from("completed_days")
        .select("week_number, day_number, completed_at")
        .eq("user_id", user.id);

      // Get logs with timestamps as fallback (days where sets were logged)
      const { data: logs } = await supabase
        .from("logs")
        .select("week_number, day_number, logged_at")
        .eq("user_id", user.id);

      const map = new Map<string, WorkoutDay>();

      // First populate from logs (any logged set = activity)
      (logs ?? []).forEach((l: { week_number: number; day_number: number; logged_at: string }) => {
        if (!l.logged_at) return;
        const date = toDateStr(new Date(l.logged_at));
        if (!map.has(date)) {
          map.set(date, {
            date,
            weekNumber: l.week_number ?? 1,
            dayLabel: `W${l.week_number} D${l.day_number}`,
          });
        }
      });

      // Then overlay with completed_days (more authoritative, same date key)
      (completed ?? []).forEach((c: { week_number: number; day_number: number; completed_at: string }) => {
        if (!c.completed_at) return;
        const date = toDateStr(new Date(c.completed_at));
        map.set(date, {
          date,
          weekNumber: c.week_number ?? 1,
          dayLabel: `W${c.week_number} D${c.day_number}`,
        });
      });

      setWorkoutMap(map);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const legend = Object.entries(WEEK_RPE).map(([w, v]) => ({ week: parseInt(w), ...v }));

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-4 pt-12 pb-4 border-b border-border">
        <h1 className="text-xl font-bold">Calendar</h1>
        {startDate && (
          <p className="text-sm text-muted mt-1">
            started {MONTH_NAMES[startDate.getMonth()]} {startDate.getFullYear()}
          </p>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted text-sm">loading…</div>
      ) : (
        <main className="px-4 py-4 space-y-8">
          {/* Legend */}
          <div className="flex gap-3 flex-wrap">
            {legend.map((l) => (
              <div key={l.week} className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: l.color }}
                />
                <span className="text-xs text-muted">Week {l.week} · {l.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-zinc-600 shrink-0" />
              <span className="text-xs text-muted">rest day</span>
            </div>
          </div>

          {/* Month grids — most recent at top */}
          {[...months].reverse().map((monthDate) => {
            const year  = monthDate.getFullYear();
            const month = monthDate.getMonth();
            const grid  = calendarGrid(year, month);

            return (
              <section key={`${year}-${month}`}>
                <h2 className="text-sm font-semibold text-muted mb-3 uppercase tracking-wide">
                  {MONTH_NAMES[month]} {year}
                </h2>

                {/* Day-of-week header */}
                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-xs text-zinc-600 py-1">{d}</div>
                  ))}
                </div>

                {/* Day grid */}
                <div className="grid grid-cols-7 gap-y-1">
                  {grid.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;

                    const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const workout = workoutMap.get(dateStr);
                    const rpeInfo = workout ? WEEK_RPE[workout.weekNumber] : null;
                    const isToday = dateStr === today;
                    const isFuture = dateStr > today;

                    return (
                      <div
                        key={dateStr}
                        className="flex flex-col items-center py-1"
                        title={workout?.dayLabel}
                      >
                        {/* Day number */}
                        <span
                          className={`text-sm w-8 h-8 flex items-center justify-center rounded-full font-medium
                            ${isToday ? "ring-2 ring-white" : ""}
                            ${isFuture ? "text-zinc-700" : workout ? "text-white font-bold" : "text-zinc-400"}`}
                          style={workout ? { backgroundColor: rpeInfo?.bg } : {}}
                        >
                          {day}
                        </span>
                        {/* Colored dot for workout days */}
                        {workout && (
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-0.5"
                            style={{ backgroundColor: rpeInfo?.color }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {workoutMap.size === 0 && (
            <div className="text-center py-8">
              <p className="text-muted text-sm">no workouts logged yet.</p>
              <p className="text-xs text-zinc-600 mt-1">go to the Log tab and finish a set.</p>
            </div>
          )}
        </main>
      )}

      <BottomNav />
    </div>
  );
}
