"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getGuestDay, addGuestSet } from "@/lib/guestWorkout";
import { filterExercises } from "@/lib/exercises";
import { rpeColor } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13L5 8l5-5" />
    </svg>
  );
}
function ChevronRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3l5 5-5 5" />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor" className="text-yellow-400 shrink-0">
      <path d="M8.5 1L3 8h4.5L5.5 13 11 6H6.5L8.5 1z" />
    </svg>
  );
}
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M2 7L5 10 11 4" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface LoggedSet {
  id: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  logged_at: string;
}

interface LoggedExercise {
  name: string;
  sets: LoggedSet[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function offsetDate(dateStr: string, days: number) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric",
  });
}

function normalizeExerciseName(name: string): string {
  // Strip program descriptor after " - " (e.g. "Bench Press - Back-off" → "Bench Press")
  const dashIdx = name.indexOf(' - ');
  if (dashIdx > 0) return name.slice(0, dashIdx).trim();
  // Strip common standalone training-intent suffixes
  return name
    .replace(/\s+(?:back[\s-]?off|backoff|volume|heavy|light|top[\s-]?set|work[\s-]?set|opener|comp(?:etition)?|accessory)\s*$/i, '')
    .trim();
}

function rpeQuickStyle(r: number) {
  if (r === 6)  return "bg-green-900/60 border-green-600 text-green-300";
  if (r === 7)  return "bg-yellow-900/60 border-yellow-600 text-yellow-300";
  if (r === 8)  return "bg-orange-900/60 border-orange-600 text-orange-300";
  return "bg-red-900/60 border-red-600 text-red-300";
}

// ── Set Input (inline) ────────────────────────────────────────────────────────

function SetInput({ defaultWeight, defaultReps, defaultRpe, onLog, onCancel }: {
  defaultWeight?: string;
  defaultReps?: string;
  defaultRpe?: string;
  onLog: (w: number | null, r: number | null, rpe: number | null) => void;
  onCancel: () => void;
}) {
  const [weight, setWeight] = useState(defaultWeight ?? "");
  const [reps,   setReps]   = useState(defaultReps   ?? "");
  const [rpe,    setRpe]    = useState(defaultRpe    ?? "");
  const [saved,  setSaved]  = useState(false);
  const weightRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => weightRef.current?.focus(), 80); }, []);

  function handleLog() {
    if (saved) return;
    setSaved(true);
    onLog(
      weight ? parseFloat(weight) : null,
      reps   ? parseInt(reps)     : null,
      rpe    ? parseInt(rpe)      : null,
    );
  }

  return (
    <div className="mx-4 mb-3 p-4 bg-zinc-900 rounded-2xl border border-zinc-700">
      <div className="grid grid-cols-3 gap-3 mb-3">
        {[
          { label: "Weight (lb)", val: weight, set: setWeight, ref: weightRef, mode: "decimal" as const, step: "2.5" },
          { label: "Reps",        val: reps,   set: setReps,   ref: null,      mode: "numeric" as const, step: "1"   },
          { label: "RPE",         val: rpe,    set: setRpe,    ref: null,      mode: "numeric" as const, step: "1"   },
        ].map(({ label, val, set, ref, mode, step }) => (
          <div key={label}>
            <label className="block text-xs text-zinc-500 mb-1.5 font-medium">{label}</label>
            <input
              ref={ref ?? undefined}
              type="number"
              inputMode={mode}
              value={val}
              onChange={(e) => set(e.target.value)}
              onFocus={(e) => e.target.select()}
              className="w-full h-16 text-center text-3xl font-display font-extrabold bg-zinc-800 rounded-xl border border-zinc-700 focus:border-zinc-400 outline-none"
              placeholder="—"
              min="0"
              step={step}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-3">
        {[6,7,8,9,10].map((r) => (
          <button key={r} type="button" onClick={() => setRpe(r.toString())}
            className={`flex-1 h-9 rounded-lg text-sm font-bold border transition-colors
              ${rpe === r.toString() ? rpeQuickStyle(r) : "bg-zinc-800 border-zinc-700 text-zinc-500"}`}>
            {r}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button onClick={onCancel}
          className="h-14 px-5 rounded-xl border border-zinc-700 text-zinc-400 font-semibold text-sm">
          Cancel
        </button>
        <button onClick={handleLog} disabled={saved}
          className={`flex-1 h-14 rounded-xl display text-base transition-colors
            ${saved ? "bg-green-700 text-white" : "bg-white text-black active:bg-zinc-200"}`}>
          {saved ? "LOGGED" : "LOG SET"}
        </button>
      </div>
    </div>
  );
}

// ── Exercise Card ─────────────────────────────────────────────────────────────

function ExerciseCard({ exercise, openSet, onToggleSet, onLog }: {
  exercise: LoggedExercise;
  openSet: boolean;
  onToggleSet: () => void;
  onLog: (w: number | null, r: number | null, rpe: number | null) => void;
}) {
  const last = exercise.sets.at(-1);
  return (
    <div className="mb-3">
      <div className="mx-4 bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <h3 className="font-semibold text-base">{exercise.name}</h3>
          <span className="text-xs text-zinc-500 mono">{exercise.sets.length} sets</span>
        </div>

        {exercise.sets.length > 0 && (
          <div className="px-4 py-2 space-y-1">
            {exercise.sets.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3 py-1">
                <span className="text-xs text-zinc-600 w-12 shrink-0">Set {i+1}</span>
                <span className="font-semibold mono text-sm">
                  {s.weight != null ? `${s.weight}lb` : "BW"} × {s.reps ?? "—"}
                </span>
                {s.rpe != null && (
                  <span className={`text-xs font-semibold ${rpeColor(s.rpe)}`}>@{s.rpe}</span>
                )}
                <CheckIcon className="ml-auto text-green-500" />
              </div>
            ))}
          </div>
        )}

        {!openSet && (
          <button onClick={onToggleSet}
            className="w-full flex items-center justify-center gap-2 py-3.5 text-sm font-semibold text-zinc-300
              hover:bg-zinc-800 active:bg-zinc-700 transition-colors border-t border-zinc-800">
            + Add Set
            {last && (
              <span className="text-xs text-zinc-600 mono">
                (last: {last.weight ?? "BW"}×{last.reps ?? "—"}{last.rpe ? ` @${last.rpe}` : ""})
              </span>
            )}
          </button>
        )}
      </div>

      {openSet && (
        <SetInput
          defaultWeight={last?.weight?.toString()}
          defaultReps={last?.reps?.toString()}
          defaultRpe={last?.rpe?.toString()}
          onLog={onLog}
          onCancel={onToggleSet}
        />
      )}
    </div>
  );
}

// ── Exercise Search Sheet ─────────────────────────────────────────────────────

function ExerciseSearchSheet({ existing, programExercises, onSelect, onClose }: {
  existing: string[];
  programExercises: string[];
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = filterExercises(query, programExercises);
  const showCustom = query.trim() &&
    !filtered.some((e) => e.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 100); }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-2xl flex flex-col" style={{ maxHeight: "85dvh" }}>
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800 flex items-center gap-3">
          <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises…"
            className="flex-1 h-11 px-4 bg-zinc-900 rounded-xl border border-zinc-700 focus:border-zinc-400 outline-none text-base"
          />
          <button onClick={onClose} className="text-zinc-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 py-2">
          {showCustom && (
            <button onClick={() => onSelect(query.trim())}
              className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-zinc-900 active:bg-zinc-800 border-b border-zinc-800">
              <span className="text-green-400 text-xl font-bold">+</span>
              <div>
                <p className="font-semibold">Add "{query.trim()}"</p>
                <p className="text-xs text-zinc-500">Custom exercise</p>
              </div>
            </button>
          )}

          {!query && programExercises.length > 0 && (
            <>
              <p className="px-4 py-2 label">From your program</p>
              {programExercises.map((name) => (
                <button key={name} onClick={() => onSelect(name)}
                  className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-zinc-900 active:bg-zinc-800">
                  <span className={existing.includes(name) ? "text-zinc-600" : ""}>{name}</span>
                  {existing.includes(name) && <span className="text-xs text-zinc-600">✓</span>}
                </button>
              ))}
              <div className="border-t border-zinc-800 my-1" />
              <p className="px-4 py-2 label">All exercises</p>
            </>
          )}

          {filtered.map((name) => {
            if (!query && programExercises.includes(name)) return null;
            const added = existing.includes(name);
            return (
              <button key={name} onClick={() => onSelect(name)}
                className="w-full text-left px-4 py-3.5 flex items-center justify-between hover:bg-zinc-900 active:bg-zinc-800">
                <span className={added ? "text-zinc-600" : ""}>{name}</span>
                {added && <span className="text-xs text-zinc-600">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Log Content (inner, needs Suspense) ───────────────────────────────────────

function LogContent() {
  const supabase     = createClient();
  const searchParams = useSearchParams();
  const today        = todayStr();

  const [date, setDate]             = useState(searchParams.get("date") ?? today);
  const [userId, setUserId]         = useState<string | null | undefined>(undefined);
  const [exercises, setExercises]   = useState<LoggedExercise[]>([]);
  const [programExs, setProgramExs] = useState<string[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [openSetFor, setOpenSetFor] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Program suggestions
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("program_follows")
      .select("program_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data: follow }) => {
        if (!follow) return;
        return supabase
          .from("lifts")
          .select("name, days(weeks(program_id))")
          .then(({ data: lifts }) => {
            if (!lifts) return;
            const names = Array.from(new Set(
              lifts
                .filter((l: any) => l.days?.weeks?.program_id === follow.program_id)
                .map((l: any) => normalizeExerciseName(l.name as string))
            ));
            setProgramExs(names);
          });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Load exercises for date
  const loadExercises = useCallback(async (d: string) => {
    setLoading(true);
    if (userId === undefined) return;

    if (!userId) {
      const guest = getGuestDay(d);
      setExercises(guest.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ ...s })) })));
      setLoading(false);
      return;
    }

    // Compute local-day boundaries as UTC ISO strings so the filter matches
    // the same day the calendar highlights (both use JS local-time date).
    const dayStart = new Date(d + "T00:00:00").toISOString();
    const dayEnd   = new Date(d + "T23:59:59.999").toISOString();

    const [{ data: customData }, { data: programData }] = await Promise.all([
      supabase
        .from("custom_logs")
        .select("id, exercise_name, actual_weight, actual_reps, actual_rpe, logged_at")
        .eq("user_id", userId)
        .eq("log_date", d)
        .order("logged_at", { ascending: true }),
      supabase
        .from("logs")
        .select("id, actual_weight, actual_reps, actual_rpe, logged_at, lifts(name)")
        .eq("user_id", userId)
        .gte("logged_at", dayStart)
        .lte("logged_at", dayEnd)
        .order("logged_at", { ascending: true }),
    ]);

    const map = new Map<string, LoggedSet[]>();

    (programData ?? []).forEach((row: any) => {
      if (!row.lifts?.name) return;
      const name = normalizeExerciseName(row.lifts.name as string);
      const arr = map.get(name) ?? [];
      arr.push({ id: row.id, weight: row.actual_weight, reps: row.actual_reps, rpe: row.actual_rpe, logged_at: row.logged_at });
      map.set(name, arr);
    });

    (customData ?? []).forEach((row: any) => {
      const arr = map.get(row.exercise_name) ?? [];
      arr.push({ id: row.id, weight: row.actual_weight, reps: row.actual_reps, rpe: row.actual_rpe, logged_at: row.logged_at });
      map.set(row.exercise_name, arr);
    });

    setExercises(Array.from(map.entries()).map(([name, sets]) => ({ name, sets })));
    setLoading(false);
  }, [userId, supabase]);

  useEffect(() => {
    if (userId !== undefined) loadExercises(date);
  }, [date, userId, loadExercises]);

  async function handleAddSet(exerciseName: string, weight: number | null, reps: number | null, rpe: number | null) {
    const now = new Date().toISOString();
    if (!userId) {
      const updated = addGuestSet(date, exerciseName, { weight, reps, rpe, logged_at: now });
      setExercises(updated.map((e) => ({ name: e.name, sets: e.sets.map((s) => ({ ...s })) })));
    } else {
      await supabase.from("custom_logs").insert({
        user_id: userId, exercise_name: exerciseName,
        actual_weight: weight, actual_reps: reps, actual_rpe: rpe,
        logged_at: now, log_date: date,
      });
      await loadExercises(date);
    }
    setOpenSetFor(null);
  }

  function handleSelectExercise(name: string) {
    setShowSearch(false);
    if (!exercises.find((e) => e.name === name)) {
      setExercises((prev) => [...prev, { name, sets: [] }]);
    }
    setOpenSetFor(name);
  }

  const isToday = date === today;

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
      <header className="px-4 pt-12 pb-3 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h1 className="display text-3xl">Workout Log</h1>
          {userId === null && (
            <Link href="/auth/signup"
              className="text-xs bg-white text-black px-3 py-1.5 rounded-full font-semibold">
              Create account →
            </Link>
          )}
        </div>

        {/* Date nav */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setDate(offsetDate(date,-1)); setOpenSetFor(null); }}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700">
            <ChevronLeft />
          </button>
          <div className="flex-1 text-center">
            <p className="font-semibold text-sm">{formatDate(date)}</p>
            {isToday && <p className="text-xs text-zinc-500">Today</p>}
          </div>
          <button onClick={() => { setDate(offsetDate(date,1)); setOpenSetFor(null); }}
            disabled={isToday}
            className="w-11 h-11 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 disabled:opacity-30">
            <ChevronRight />
          </button>
        </div>
      </header>

      {/* Guest banner */}
      {userId === null && (
        <div className="mx-4 mt-3 px-4 py-3 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center gap-3">
          <BoltIcon />
          <p className="text-xs text-zinc-400 flex-1">
            Saved locally.{" "}
            <Link href="/auth/signup" className="text-white underline">Create account</Link>{" "}
            to sync across devices.
          </p>
        </div>
      )}

      <main className="py-4">
        {loading ? (
          <p className="text-center text-zinc-500 text-sm py-10">loading…</p>
        ) : (
          <>
            {exercises.length === 0 && (
              <div className="text-center py-10 px-4">
                <svg width="52" height="28" viewBox="0 0 52 28" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-700 mx-auto mb-4">
                  <rect x="1" y="9" width="6" height="10" rx="2" />
                  <rect x="7" y="6" width="5" height="16" rx="2" />
                  <line x1="12" y1="14" x2="40" y2="14" />
                  <rect x="40" y="6" width="5" height="16" rx="2" />
                  <rect x="45" y="9" width="6" height="10" rx="2" />
                </svg>
                <p className="text-zinc-400 font-medium mb-1">No exercises yet</p>
                <p className="text-zinc-600 text-sm">Tap "Add Exercise" below to start</p>
              </div>
            )}

            {exercises.map((ex) => (
              <ExerciseCard
                key={ex.name}
                exercise={ex}
                openSet={openSetFor === ex.name}
                onToggleSet={() => setOpenSetFor(openSetFor === ex.name ? null : ex.name)}
                onLog={(w, r, rpe) => handleAddSet(ex.name, w, r, rpe)}
              />
            ))}

            {/* Add exercise CTA */}
            <div className="px-4 pt-2">
              <button onClick={() => setShowSearch(true)}
                className="w-full h-14 rounded-2xl border-2 border-dashed border-zinc-700 text-zinc-400 font-semibold text-sm
                  hover:border-zinc-500 hover:text-zinc-300 transition-colors">
                + Add Exercise
              </button>
            </div>

            {/* Program quick-add chips */}
            {programExs.length > 0 && (
              <div className="px-4 pt-5">
                <p className="label mb-2">Quick-add from program</p>
                <div className="flex flex-wrap gap-2">
                  {programExs
                    .filter((n) => !exercises.find((e) => e.name === n))
                    .slice(0, 12)
                    .map((name) => (
                      <button key={name} onClick={() => handleSelectExercise(name)}
                        className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-medium
                          hover:border-zinc-600 active:bg-zinc-800 transition-colors">
                        {name}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {showSearch && (
        <ExerciseSearchSheet
          existing={exercises.map((e) => e.name)}
          programExercises={programExs}
          onSelect={handleSelectExercise}
          onClose={() => setShowSearch(false)}
        />
      )}

      <BottomNav />
    </div>
  );
}

export default function LogPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-bg flex items-center justify-center text-zinc-500 text-sm">
        loading…
      </div>
    }>
      <LogContent />
    </Suspense>
  );
}
