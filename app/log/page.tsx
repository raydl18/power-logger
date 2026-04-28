"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncPendingLogs, getPendingLogs } from "@/lib/offline";
import { currentWeekFromStartDate } from "@/lib/utils";
import LiftRow from "@/components/LiftRow";
import LogModal from "@/components/LogModal";
import BottomNav from "@/components/BottomNav";
import type { Lift, DayWithLifts } from "@/types/database";

export default function LogPage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId]             = useState<string | null>(null);
  const [programId, setProgramId]       = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [selectedDay, setSelectedDay]   = useState(1);
  const [dayLifts, setDayLifts]         = useState<DayWithLifts | null>(null);
  const [loggedIds, setLoggedIds]       = useState<Set<string>>(new Set());
  const [completedDays, setCompletedDays] = useState<Set<string>>(new Set());
  const [activeLift, setActiveLift]     = useState<Lift | null>(null);
  const [loading, setLoading]           = useState(true);
  const [finishing, setFinishing]       = useState(false);
  const [justFinished, setJustFinished] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const dayKey = (w: number, d: number) => `${w}-${d}`;
  const isComplete = completedDays.has(dayKey(selectedWeek, selectedDay));
  const loggedThisDay = dayLifts?.lifts.some((l) => loggedIds.has(l.id)) ?? false;

  // ── Initial load ─────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data: follow } = await supabase
        .from("program_follows")
        .select("program_id, start_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!follow) { setLoading(false); return; }
      setProgramId(follow.program_id);
      setSelectedWeek(currentWeekFromStartDate(follow.start_date));
      setPendingCount(getPendingLogs().length);

      await Promise.all([
        loadLogs(user.id),
        loadCompletedDays(user.id, follow.program_id),
      ]);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLogs(uid: string) {
    const { data } = await supabase.from("logs").select("lift_id").eq("user_id", uid);
    if (data) setLoggedIds(new Set(data.map((l: { lift_id: string }) => l.lift_id)));
  }

  async function loadCompletedDays(uid: string, pid: string) {
    const { data } = await supabase
      .from("completed_days")
      .select("week_number, day_number")
      .eq("user_id", uid)
      .eq("program_id", pid);
    if (data) setCompletedDays(new Set(data.map((r: { week_number: number; day_number: number }) => dayKey(r.week_number, r.day_number))));
  }

  // ── Fetch lifts for selected week / day ───────────────────────────────────
  useEffect(() => {
    if (!programId) return;
    setJustFinished(false);

    async function fetchDay() {
      const { data: week } = await supabase
        .from("weeks")
        .select("id")
        .eq("program_id", programId)
        .eq("week_number", selectedWeek)
        .single();

      if (!week) { setDayLifts(null); return; }

      const { data: day } = await supabase
        .from("days")
        .select("*, lifts(*)")
        .eq("week_id", week.id)
        .eq("day_number", selectedDay)
        .single();

      setDayLifts(day
        ? { ...day, lifts: (day.lifts ?? []).sort((a: Lift, b: Lift) => a.order_index - b.order_index) }
        : null);
    }
    fetchDay();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programId, selectedWeek, selectedDay]);

  // ── Sync offline logs on reconnect ────────────────────────────────────────
  useEffect(() => {
    const handleOnline = async () => {
      if (!userId) return;
      const { synced } = await syncPendingLogs(supabase);
      if (synced > 0) { setPendingCount(0); await loadLogs(userId); }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleLogged = useCallback((liftId: string) => {
    setLoggedIds((prev) => new Set([...prev, liftId]));
  }, []);

  // ── Finish day ────────────────────────────────────────────────────────────
  async function finishDay() {
    if (!userId || !programId) return;
    setFinishing(true);

    await supabase.from("completed_days").upsert({
      user_id: userId,
      program_id: programId,
      week_number: selectedWeek,
      day_number: selectedDay,
    });

    setCompletedDays((prev) => new Set([...prev, dayKey(selectedWeek, selectedDay)]));
    setJustFinished(true);
    setFinishing(false);
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-muted text-sm">
        loading...
      </div>
    );
  }

  if (!programId) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        <header className="px-4 pt-12 pb-4 border-b border-border">
          <h1 className="text-xl font-bold uppercase tracking-tight">Today's Log</h1>
        </header>
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <p className="text-muted text-sm">you're not following any program.</p>
          <a href="/program" className="mt-3 text-sm underline text-fg">browse programs →</a>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-4 pt-12 pb-4 border-b border-border">
        <h1 className="text-xl font-bold uppercase tracking-tight">Today's Log</h1>
        {pendingCount > 0 && (
          <p className="text-xs text-yellow-400 mt-1">{pendingCount} queued offline</p>
        )}
      </header>

      {/* Week / Day picker */}
      <div className="px-4 py-3 border-b border-border space-y-3">
        <div>
          <label className="block text-xs text-muted uppercase tracking-widest mb-1.5">Week</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4].map((w) => {
              const hasComplete = [1,2,3,4,5].some((d) => completedDays.has(dayKey(w, d)));
              return (
                <button
                  key={w}
                  onClick={() => setSelectedWeek(w)}
                  className={`flex-1 min-h-[40px] rounded text-sm font-bold border relative transition-colors
                    ${selectedWeek === w
                      ? "bg-fg text-bg border-fg"
                      : "bg-zinc-900 border-zinc-700 text-muted hover:border-zinc-500"}`}
                >
                  {w}
                  {hasComplete && selectedWeek !== w && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs text-muted uppercase tracking-widest mb-1.5">Day</label>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5].map((d) => {
              const done = completedDays.has(dayKey(selectedWeek, d));
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className={`flex-1 min-h-[40px] rounded text-sm font-bold border relative transition-colors
                    ${selectedDay === d
                      ? "bg-fg text-bg border-fg"
                      : done
                        ? "bg-green-950 border-green-800 text-green-400"
                        : "bg-zinc-900 border-zinc-700 text-muted hover:border-zinc-500"}`}
                >
                  {done && selectedDay !== d ? "✓" : d}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lift list */}
      <main className="px-4 py-4 space-y-3">
        {!dayLifts ? (
          <p className="text-muted text-sm text-center py-8">no lifts for W{selectedWeek} D{selectedDay}</p>
        ) : (
          <>
            {/* Day completed banner */}
            {(isComplete || justFinished) && (
              <div className="border border-green-800 bg-green-950/40 rounded-lg px-4 py-3 flex items-center gap-3">
                <span className="text-green-400 text-xl">✓</span>
                <div>
                  <p className="text-green-400 font-bold text-sm">Day complete!</p>
                  <p className="text-green-700 text-xs">W{selectedWeek} D{selectedDay} — {dayLifts.label ?? `Day ${selectedDay}`}</p>
                </div>
              </div>
            )}

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-zinc-900 border-b border-border flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide">
                  {dayLifts.label ?? `Day ${dayLifts.day_number}`}
                </p>
                <p className="text-xs text-muted">
                  {dayLifts.lifts.filter((l) => loggedIds.has(l.id)).length}/{dayLifts.lifts.length} logged
                </p>
              </div>
              {dayLifts.lifts.map((lift) => (
                <LiftRow
                  key={lift.id}
                  lift={lift}
                  logged={loggedIds.has(lift.id)}
                  onTap={setActiveLift}
                />
              ))}
            </div>

            {/* Finish Day button */}
            {!isComplete && !justFinished ? (
              <button
                onClick={finishDay}
                disabled={finishing || !loggedThisDay}
                className={`w-full min-h-[52px] rounded-lg font-bold text-base border-2 transition-colors
                  ${loggedThisDay
                    ? "border-green-700 text-green-400 bg-green-950/30 hover:bg-green-950/60 active:bg-green-950"
                    : "border-zinc-800 text-zinc-700 cursor-not-allowed"}`}
              >
                {finishing ? "saving..." : loggedThisDay ? "✓  FINISH DAY" : "log at least one lift to finish"}
              </button>
            ) : (
              <button
                onClick={() => {
                  setCompletedDays((prev) => {
                    const next = new Set(prev);
                    next.delete(dayKey(selectedWeek, selectedDay));
                    return next;
                  });
                  setJustFinished(false);
                  supabase.from("completed_days")
                    .delete()
                    .eq("user_id", userId!)
                    .eq("program_id", programId)
                    .eq("week_number", selectedWeek)
                    .eq("day_number", selectedDay)
                    .then(() => {});
                }}
                className="w-full min-h-[44px] text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                mark as incomplete
              </button>
            )}
          </>
        )}
      </main>

      {activeLift && userId && (
        <LogModal
          lift={activeLift}
          userId={userId}
          weekNumber={selectedWeek}
          dayNumber={selectedDay}
          onClose={() => setActiveLift(null)}
          onLogged={handleLogged}
        />
      )}

      <BottomNav />
    </div>
  );
}
