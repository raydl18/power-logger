"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";
import { getAllGuestWorkoutDates } from "@/lib/guestWorkout";

// ── Types ─────────────────────────────────────────────────────────────────────

type FilterMode = "rpe" | "muscle";
type MuscleGroup = "chest" | "back" | "legs" | "shoulders" | "arms";

interface DayData {
  date: string;
  maxRpe: number | null;
  exercises: string[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MUSCLE_COLORS: Record<MuscleGroup, { color: string; label: string }> = {
  legs:      { color: "#3b82f6", label: "Legs"      },
  chest:     { color: "#ef4444", label: "Chest"     },
  arms:      { color: "#22c55e", label: "Arms"      },
  shoulders: { color: "#a855f7", label: "Shoulders" },
  back:      { color: "#eab308", label: "Back"      },
};

const MUSCLE_ORDER: MuscleGroup[] = ["legs", "chest", "back", "shoulders", "arms"];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_NAMES = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ── Helpers ───────────────────────────────────────────────────────────────────

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

function rpeColor(rpe: number | null): string {
  if (rpe === null) return "#52525b";   // gray — logged but no RPE stored
  if (rpe <= 6)     return "#4ade80";
  if (rpe === 7)    return "#facc15";
  if (rpe === 8)    return "#fb923c";
  if (rpe === 9)    return "#f87171";
  return "#dc2626";                      // RPE 10
}

function rpeBg(rpe: number | null): string {
  if (rpe === null) return "rgba(82,82,91,0.3)";
  if (rpe <= 6)     return "rgba(74,222,128,0.2)";
  if (rpe === 7)    return "rgba(250,204,21,0.2)";
  if (rpe === 8)    return "rgba(251,146,60,0.2)";
  if (rpe === 9)    return "rgba(248,113,113,0.2)";
  return "rgba(220,38,38,0.2)";
}

function getMuscleGroup(name: string): MuscleGroup | null {
  const n = name.toLowerCase();
  // Legs — check before arm "curl" to catch "leg curl"
  if (/squat|leg press|leg curl|leg extension|hamstring|rdl|romanian|stiff.?leg|hack squat|calf|lunge|hip thrust|hip abduction|glute|deadlift/i.test(n)) return "legs";
  // Arms — close grip bench is tricep-focused
  if (/close.?grip|tricep|skull crusher|pushdown|\bbicep\b|\bcurl\b|forearm|\bdip\b/i.test(n)) return "arms";
  // Shoulders — before back to catch "upright row", "face pull"
  if (/\bohp\b|push press|overhead press|shoulder press|lateral raise|front raise|arnold|military press|upright row|face pull|rear delt/i.test(n)) return "shoulders";
  // Chest
  if (/bench|chest|pec|cable fly|incline press|decline/i.test(n)) return "chest";
  // Back
  if (/\brow\b|pull.?up|chin.?up|pulldown|back extension|good morning/i.test(n)) return "back";
  // Catch-alls
  if (/press/i.test(n)) return "chest";
  if (/pull|lat\b/i.test(n)) return "back";
  return null;
}

function getMuscleGroups(exercises: string[]): MuscleGroup[] {
  const groups = new Set<MuscleGroup>();
  exercises.forEach(e => {
    const g = getMuscleGroup(e);
    if (g) groups.add(g);
  });
  return MUSCLE_ORDER.filter(g => groups.has(g));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const supabase = createClient();

  const [dayMap, setDayMap]     = useState<Map<string, DayData>>(new Map());
  const [months, setMonths]     = useState<Date[]>([]);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [loading, setLoading]   = useState(true);
  const [isGuest, setIsGuest]   = useState(false);
  const [mode, setMode]         = useState<FilterMode>("rpe");
  const today = toDateStr(new Date());

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setIsGuest(true);
        const dates = getAllGuestWorkoutDates();
        const map = new Map<string, DayData>();
        dates.forEach(date => map.set(date, { date, maxRpe: null, exercises: [] }));
        const sorted = [...dates].sort();
        const start = sorted.length > 0
          ? new Date(sorted[0])
          : (() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return d; })();
        setStartDate(start);
        setMonths(monthsBetween(start, new Date()));
        setDayMap(map);
        setLoading(false);
        return;
      }

      const [{ data: follow }, { data: logs }, { data: customLogs }] = await Promise.all([
        supabase
          .from("program_follows")
          .select("start_date")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .single(),
        supabase
          .from("logs")
          .select("actual_rpe, logged_at, lifts(name)")
          .eq("user_id", user.id),
        supabase
          .from("custom_logs")
          .select("actual_rpe, log_date, logged_at, exercise_name")
          .eq("user_id", user.id),
      ]);

      const map = new Map<string, DayData>();

      (logs ?? []).forEach((l: any) => {
        if (!l.logged_at) return;
        const date = toDateStr(new Date(l.logged_at));
        const d = map.get(date) ?? { date, maxRpe: null, exercises: [] as string[] };
        if (l.actual_rpe != null && (d.maxRpe === null || l.actual_rpe > d.maxRpe)) d.maxRpe = l.actual_rpe;
        const name = l.lifts?.name;
        if (name && !d.exercises.includes(name)) d.exercises.push(name);
        map.set(date, d);
      });

      (customLogs ?? []).forEach((c: any) => {
        const date = c.log_date ?? toDateStr(new Date(c.logged_at));
        const d = map.get(date) ?? { date, maxRpe: null, exercises: [] as string[] };
        if (c.actual_rpe != null && (d.maxRpe === null || c.actual_rpe > d.maxRpe)) d.maxRpe = c.actual_rpe;
        if (c.exercise_name && !d.exercises.includes(c.exercise_name)) d.exercises.push(c.exercise_name);
        map.set(date, d);
      });

      // Start from the earliest of: first log date, program follow date, or 2 months ago
      const allDates = [...map.keys()].sort();
      const logStart    = allDates.length > 0 ? new Date(allDates[0] + "T12:00:00") : null;
      const followStart = follow?.start_date ? new Date(follow.start_date) : null;
      const fallback    = (() => { const d = new Date(); d.setMonth(d.getMonth() - 2); return d; })();

      const start = [logStart, followStart, fallback]
        .filter(Boolean)
        .reduce((earliest, d) => d! < earliest! ? d : earliest) as Date;

      setStartDate(start);
      setMonths(monthsBetween(start, new Date()));
      setDayMap(map);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-4 pt-12 pb-4 border-b border-border">
        <h1 className="display text-3xl">Calendar</h1>
        {startDate && (
          <p className="text-xs text-muted mt-1">
            {isGuest ? "guest · " : ""}{dayMap.size} workout{dayMap.size !== 1 ? "s" : ""} logged
          </p>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted text-sm">loading…</div>
      ) : (
        <main className="px-4 py-4 space-y-5">
          {isGuest && (
            <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
              <p className="text-xs text-muted">tracking as guest</p>
              <Link href="/auth/signup" className="text-xs text-white underline">create account →</Link>
            </div>
          )}

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
            {(["rpe", "muscle"] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide uppercase transition-colors
                  ${mode === m ? "bg-white text-black" : "text-zinc-500 hover:text-zinc-300"}`}>
                {m === "rpe" ? "RPE" : "Muscle"}
              </button>
            ))}
          </div>

          {/* Legend */}
          {mode === "rpe" ? (
            <div className="flex gap-x-3 gap-y-1.5 flex-wrap">
              {[
                { label: "≤ 6", rpe: 6 },
                { label: "7",   rpe: 7 },
                { label: "8",   rpe: 8 },
                { label: "9",   rpe: 9 },
                { label: "10",  rpe: 10 },
              ].map(({ label, rpe }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: rpeColor(rpe) }} />
                  <span className="text-xs text-muted">RPE {label}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-zinc-600" />
                <span className="text-xs text-muted">no RPE</span>
              </div>
            </div>
          ) : (
            <div className="flex gap-x-3 gap-y-1.5 flex-wrap">
              {MUSCLE_ORDER.map(g => (
                <div key={g} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: MUSCLE_COLORS[g].color }} />
                  <span className="text-xs text-muted">{MUSCLE_COLORS[g].label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Month grids */}
          {[...months].reverse().map((monthDate) => {
            const year  = monthDate.getFullYear();
            const month = monthDate.getMonth();
            const grid  = calendarGrid(year, month);

            return (
              <section key={`${year}-${month}`}>
                <h2 className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-3">
                  {MONTH_NAMES[month]} {year}
                </h2>

                <div className="grid grid-cols-7 mb-1">
                  {DAY_NAMES.map(d => (
                    <div key={d} className="text-center text-[11px] text-zinc-700 py-1">{d}</div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-y-1">
                  {grid.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} />;

                    const dateStr = `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                    const data    = dayMap.get(dateStr);
                    const isToday  = dateStr === today;
                    const isFuture = dateStr > today;

                    // What to show in the dots row
                    let dots: { color: string; key: string }[] = [];
                    let circleBg: string | undefined;

                    if (data) {
                      if (mode === "rpe") {
                        const c = rpeColor(data.maxRpe);
                        dots = [{ color: c, key: "rpe" }];
                        circleBg = rpeBg(data.maxRpe);
                      } else {
                        const groups = getMuscleGroups(data.exercises);
                        dots = groups.map(g => ({ color: MUSCLE_COLORS[g].color, key: g }));
                        circleBg = groups.length > 0
                          ? `${MUSCLE_COLORS[groups[0]].color}22`
                          : "rgba(82,82,91,0.2)";
                        if (dots.length === 0) {
                          dots = [{ color: "#52525b", key: "none" }];
                        }
                      }
                    }

                    return (
                      <Link
                        key={dateStr}
                        href={`/log?date=${dateStr}`}
                        className="flex flex-col items-center py-1 rounded active:opacity-60 transition-opacity"
                      >
                        <span
                          className={`text-sm w-8 h-8 flex items-center justify-center rounded-full font-medium transition-colors
                            ${isToday ? "ring-2 ring-white ring-offset-1 ring-offset-bg" : ""}
                            ${isFuture ? "text-zinc-700" : data ? "text-white" : "text-zinc-500"}`}
                          style={circleBg ? { backgroundColor: circleBg } : {}}
                        >
                          {day}
                        </span>
                        {dots.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5 justify-center">
                            {dots.map(dot => (
                              <span key={dot.key} className="w-1.5 h-1.5 rounded-full shrink-0"
                                style={{ backgroundColor: dot.color }} />
                            ))}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {dayMap.size === 0 && (
            <div className="text-center py-8">
              <p className="text-muted text-sm">no workouts logged yet.</p>
              <Link href="/log" className="text-sm text-white underline mt-2 inline-block">log a workout →</Link>
            </div>
          )}
        </main>
      )}

      <BottomNav />
    </div>
  );
}
