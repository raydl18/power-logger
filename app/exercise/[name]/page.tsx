"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { estimatedOneRM } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

function normalizeExerciseName(name: string): string {
  const dashIdx = name.indexOf(' - ');
  if (dashIdx > 0) return name.slice(0, dashIdx).trim();
  return name
    .replace(/\s+(?:back[\s-]?off|backoff|volume|heavy|light|top[\s-]?set|work[\s-]?set|opener|comp(?:etition)?|accessory)\s*$/i, '')
    .trim();
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "long", day: "numeric", year: "numeric",
  });
}

interface SetRecord {
  id: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  date: string;
  logged_at: string;
}

export default function ExercisePage({ params }: { params: { name: string } }) {
  const exerciseName = decodeURIComponent(params.name);
  const supabase = createClient();
  const router = useRouter();

  const [sets, setSets]     = useState<SetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const [{ data: customData }, { data: programData }] = await Promise.all([
        supabase
          .from("custom_logs")
          .select("id, actual_weight, actual_reps, actual_rpe, logged_at, log_date")
          .eq("user_id", user.id)
          .eq("exercise_name", exerciseName)
          .order("logged_at", { ascending: true }),
        supabase
          .from("logs")
          .select("id, actual_weight, actual_reps, actual_rpe, logged_at, lifts(name)")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: true }),
      ]);

      const all: SetRecord[] = [];

      (programData ?? []).forEach((r: any) => {
        if (!r.lifts?.name) return;
        if (normalizeExerciseName(r.lifts.name) !== exerciseName) return;
        all.push({
          id: r.id,
          weight: r.actual_weight,
          reps: r.actual_reps,
          rpe: r.actual_rpe,
          date: r.logged_at.slice(0, 10),
          logged_at: r.logged_at,
        });
      });

      (customData ?? []).forEach((r: any) => {
        all.push({
          id: r.id,
          weight: r.actual_weight,
          reps: r.actual_reps,
          rpe: r.actual_rpe,
          date: r.log_date ?? r.logged_at.slice(0, 10),
          logged_at: r.logged_at,
        });
      });

      all.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
      setSets(all);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseName]);

  // Group by date, newest first
  const byDate = new Map<string, SetRecord[]>();
  sets.forEach(s => {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  });
  const dateGroups = [...byDate.entries()].reverse();

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-4 pt-12 pb-4 border-b border-border">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => router.back()}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13L5 8l5-5" />
            </svg>
          </button>
          <h1 className="display text-2xl flex-1 min-w-0 truncate">{exerciseName}</h1>
        </div>
        {!loading && (
          <p className="text-xs text-muted ml-12">
            {sets.length} set{sets.length !== 1 ? "s" : ""} · {byDate.size} session{byDate.size !== 1 ? "s" : ""}
          </p>
        )}
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted text-sm">loading…</div>
      ) : sets.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-muted text-sm">no sets logged for this exercise yet.</p>
        </div>
      ) : (
        <main className="px-4 py-4 space-y-5">
          {dateGroups.map(([date, dateSets]) => (
            <section key={date}>
              <p className="label mb-2">{fmtDate(date)}</p>
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                {dateSets.map((s, i) => (
                  <div key={s.id}
                    className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-zinc-800" : ""}`}>
                    <span className="text-xs text-zinc-600 w-10 shrink-0">Set {i + 1}</span>
                    <span className="font-semibold mono text-sm flex-1">
                      {s.weight != null ? `${s.weight}lb` : "BW"} × {s.reps ?? "—"}
                    </span>
                    {s.rpe != null && (
                      <span className="text-xs text-zinc-400 mono">@{s.rpe}</span>
                    )}
                    {s.weight && s.reps && (
                      <span className="text-xs text-zinc-600 mono">
                        ~{Math.round(estimatedOneRM(s.weight, s.reps))}lb
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </main>
      )}

      <BottomNav />
    </div>
  );
}
