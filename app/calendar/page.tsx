"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { getAllGuestWorkoutDates } from "@/lib/guestWorkout";

interface WorkoutDay {
  date: string;
  weekNumber: number; // 0 = guest (no RPE info)
  dayLabel: string;
}

const WEEK_RPE: Record<number, { color: string; bg: string; label: string }> = {
  1: { color: "#4ade80", bg: "rgba(74,222,128,0.25)",  label: "RPE 6" },
  2: { color: "#facc15", bg: "rgba(250,204,21,0.25)",  label: "RPE 7" },
  3: { color: "#fb923c", bg: "rgba(251,146,60,0.25)",  label: "RPE 8" },
  4: { color: "#f87171", bg: "rgba(248,113,113,0.25)", label: "RPE 9" },
};

const GUEST_STYLE = { color: "#71717a", bg: "rgba(113,113,122,0.25)" };

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
  const supabase = createClient();

  const [workoutMap, setWorkoutMap] = useState<Map<string, WorkoutDay>>(new Map());
  const [months, setMonths]         = useState<Date[]>([]);
  const [startDate, setStartDate]   = useState<Date | null>(null);
  const [loading, setLoading]       = useState(true);
  const [isGuest, setIsGuest]       = useState(false);
  const today = toDateStr(new Date());

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        const dates = getAllGuestWorkoutDates();
        const map = new Map<string, WorkoutDay>();
        dates.forEach((date) => {
          map.set(date, { date, weekNumber: 0, dayLabel: "workout" });
        });
        setWorkoutMap(map);

        const sortedDates = [...dates].sort();
        const start = sortedDates.length > 0
          ? new Date(sortedDates[0])
          : (() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return d; })();
        setStartDate(start);
        setMonths(monthsBetween(start, new Date()));
        setLoading(false);
        return;
      }

      // Logged-in: fetch from Supabase
      const { data: follow } = await supabase
        .from("program_follows")
        .select("start_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();

      const start = follow
        ? new Date(follow.start_date)
        : (() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return d; })();
      setStartDate(start);
      setMonths(monthsBetween(start, new Date()));

      const { data: completed } = await supabase
        .from("completed_days")
        .select("week_number, day_number, completed_at")
        .eq("user_id", user.id);

      const { data: logs } = await supabase
        .from("logs")
        .select("week_number, day_number, logged_at")
        .eq("user_id", user.id);

      const { data: customLogs } = await supabase
        .from("custom_logs")
        .select("log_date, logged_at")
        .eq("user_id", user.id);

      const map = new Map<string, WorkoutDay>();

      (logs ?? []).forEach((l: { week_number: number; day_number: number; logged_at: string }) => {
        if (!l.logged_at) return;
        const date = toDateStr(new Date(l.logged_at));
        if (!map.has(date)) {
          map.set(date, { date, weekNumber: l.week_number ?? 1, dayLabel: `W${l.week_number} D${l.day_number}` });
        }
      });

      (customLogs ?? []).forEach((c: { log_date: string; logged_at: string }) => {
        const date = c.log_date ?? toDateStr(new Date(c.logged_at));
        if (!map.has(date)) {
          map.set(date, { date, weekNumber: 0, dayLabel: "custom workout" });
        }
      });

      (completed ?? []).forEach((c: { week_number: number; day_number: number; completed_at: string }) => {
        if (!c.completed_at) return;
        const date = toDateStr(new Date(c.completed_at));
        map.set(date, { date, weekNumber: c.week_number ?? 1, dayLabel: `W${c.week_number} D${c.day_number}` });
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
        <h1 className="display text-3xl">Calendar</h1>
        {startDate && (
          <p className="text-sm text-muted mt-1">
            {isGuest ? "guest mode · " : ""}
            {workoutMap.size} workout{workoutMap.size !== 1 ? "s" : ""} logged
          </p>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted text-sm">loading…</div>
      ) : (
        <main className="px-4 py-4 space-y-8">
          {isGuest && (
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3">
              <p className="text-sm text-muted">tracking as guest</p>
              <Link href="/auth/signup" className="text-sm text-white underline">
                create account →
              </Link>
            </div>
          )}

          {/* Legend */}
          <div className="flex gap-3 flex-wrap">
            {legend.map((l) => (
              <div key={l.week} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                <span className="text-xs text-muted">Week {l.week} · {l.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: GUEST_STYLE.color }} />
              <span className="text-xs text-muted">custom / guest</span>
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

                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map((d) => (
                    <div key={d} className="text-center text-xs text-zinc-600 py-1">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                  {grid.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;

                    const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const workout = workoutMap.get(dateStr);
                    const rpeInfo = workout
                      ? (workout.weekNumber > 0 ? WEEK_RPE[workout.weekNumber] : null)
                      : null;
                    const dotColor = workout
                      ? (rpeInfo?.color ?? GUEST_STYLE.color)
                      : null;
                    const bgColor = workout
                      ? (rpeInfo?.bg ?? GUEST_STYLE.bg)
                      : undefined;
                    const isToday  = dateStr === today;
                    const isFuture = dateStr > today;

                    return (
                      <Link
                        key={dateStr}
                        href={`/log?date=${dateStr}`}
                        className="flex flex-col items-center py-1 rounded active:opacity-60 transition-opacity"
                        title={workout?.dayLabel ?? dateStr}
                      >
                        <span
                          className={`text-sm w-8 h-8 flex items-center justify-center rounded-full font-medium
                            ${isToday ? "ring-2 ring-white" : ""}
                            ${isFuture ? "text-zinc-700" : workout ? "text-white font-bold" : "text-zinc-400"}`}
                          style={bgColor ? { backgroundColor: bgColor } : {}}
                        >
                          {day}
                        </span>
                        {dotColor && (
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-0.5"
                            style={{ backgroundColor: dotColor }}
                          />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {workoutMap.size === 0 && (
            <div className="text-center py-8">
              <p className="text-muted text-sm">no workouts logged yet.</p>
              <Link href="/log" className="text-sm text-white underline mt-2 inline-block">
                log a workout →
              </Link>
            </div>
          )}
        </main>
      )}

      <BottomNav />
    </div>
  );
}
