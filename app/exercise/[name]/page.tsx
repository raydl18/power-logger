"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { estimatedOneRM } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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

function fmtShort(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
    month: "short", day: "numeric",
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

type Tab = "history" | "graph" | "records";

const TABS: { key: Tab; label: string }[] = [
  { key: "history", label: "History" },
  { key: "graph",   label: "Graph"   },
  { key: "records", label: "Records" },
];

export default function ExercisePage({ params }: { params: { name: string } }) {
  const exerciseName = decodeURIComponent(params.name);
  const supabase = createClient();
  const router = useRouter();

  const [sets, setSets]       = useState<SetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState<Tab>("history");

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
          .limit(10000)
          .order("logged_at", { ascending: true }),
        supabase
          .from("logs")
          .select("id, actual_weight, actual_reps, actual_rpe, logged_at, lifts(name)")
          .eq("user_id", user.id)
          .limit(50000)
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

  // ── Derived ──────────────────────────────────────────────────────────────────

  const byDate = new Map<string, SetRecord[]>();
  sets.forEach(s => {
    const arr = byDate.get(s.date) ?? [];
    arr.push(s);
    byDate.set(s.date, arr);
  });
  const dateGroups = [...byDate.entries()].reverse();

  // Per-rep max records
  const repRecords: Record<number, { weight: number; date: string }> = {};
  sets.forEach(s => {
    if (!s.weight || !s.reps) return;
    const existing = repRecords[s.reps];
    if (!existing || s.weight > existing.weight)
      repRecords[s.reps] = { weight: s.weight, date: s.date };
  });
  const repCounts = Object.keys(repRecords).map(Number).sort((a, b) => a - b);

  // Best e1RM per session, chronological — used for the graph
  const graphData = [...byDate.entries()].map(([date, dateSets]) => {
    const valid = dateSets.filter(s => s.weight && s.reps);
    if (!valid.length) return null;
    const bestE1rm = Math.max(...valid.map(s => estimatedOneRM(s.weight!, s.reps!)));
    const topSet   = Math.max(...valid.map(s => s.weight!));
    return { label: fmtShort(date), e1rm: Math.round(bestE1rm), topSet };
  }).filter(Boolean) as { label: string; e1rm: number; topSet: number }[];

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Header */}
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

      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-3 text-xs font-semibold uppercase tracking-widest transition-colors
              ${tab === key
                ? "text-white border-b-2 border-white -mb-px"
                : "text-zinc-600 hover:text-zinc-400"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted text-sm">loading…</div>
      ) : sets.length === 0 ? (
        <div className="text-center py-16 px-4">
          <p className="text-muted text-sm">no sets logged for this exercise yet.</p>
        </div>
      ) : (
        <main className="py-4">

          {/* ── History ──────────────────────────────────────────────────── */}
          {tab === "history" && (
            <div className="px-4 space-y-5">
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
            </div>
          )}

          {/* ── Graph ────────────────────────────────────────────────────── */}
          {tab === "graph" && (
            <div className="px-4">
              {graphData.length < 2 ? (
                <div className="text-center py-16">
                  <p className="text-muted text-sm">need at least 2 sessions to draw a graph.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline justify-between mb-4">
                    <p className="label">Est. 1RM over time</p>
                    <p className="text-xs text-zinc-600">Epley formula</p>
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={graphData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis
                        dataKey="label"
                        stroke="#444"
                        tick={{ fontFamily: "monospace", fontSize: 10, fill: "#666" }}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        stroke="#444"
                        tick={{ fontFamily: "monospace", fontSize: 10, fill: "#666" }}
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => `${v}`}
                      />
                      <Tooltip
                        content={({ active, payload, label }: any) => {
                          if (!active || !payload?.length) return null;
                          return (
                            <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs">
                              <p className="text-zinc-400 mb-1">{label}</p>
                              {payload.map((p: any) => (
                                <p key={p.name} style={{ color: p.color }}>{p.name}: {p.value}lb</p>
                              ))}
                            </div>
                          );
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="e1rm"
                        name="Est. 1RM"
                        stroke="#4ade80"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#4ade80", strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="topSet"
                        name="Top Set"
                        stroke="#4ade8055"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        dot={{ r: 3, fill: "#4ade8055", strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>
          )}

          {/* ── Records ──────────────────────────────────────────────── */}
          {tab === "records" && (
            <div className="px-4">
              {repCounts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-muted text-sm">no records yet — log some sets with weights and reps.</p>
                </div>
              ) : (
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                  <div className="grid grid-cols-3 px-4 py-2 border-b border-zinc-800">
                    <span className="label">Rep Max</span>
                    <span className="label text-center">Best Weight</span>
                    <span className="label text-right">Date</span>
                  </div>

                  {repCounts.map((n, idx) => {
                    const rec = repRecords[n];

                    // Find the single heaviest weight done for any higher rep count
                    const heavier = repCounts
                      .filter(r => r > n && repRecords[r].weight > rec.weight)
                      .reduce<{ weight: number; reps: number } | null>((best, r) => {
                        if (!best || repRecords[r].weight > best.weight)
                          return { weight: repRecords[r].weight, reps: r };
                        return best;
                      }, null);

                    return (
                      <div key={n}
                        className={`px-4 py-3 ${idx > 0 ? "border-t border-zinc-800" : ""}`}>
                        <div className="grid grid-cols-3 items-center">
                          <span className="display text-lg">{n}RM</span>
                          <span className="font-display font-bold text-base text-center">{rec.weight}lb</span>
                          <span className="text-xs text-zinc-400 mono text-right">{fmtShort(rec.date)}</span>
                        </div>
                        {heavier && (
                          <div className="grid grid-cols-3 items-center mt-0.5">
                            <span />
                            <span className="text-xs text-zinc-600 mono text-center">
                              {heavier.weight}lb × {heavier.reps}
                            </span>
                            <span className="text-xs text-zinc-700 text-right">heavier</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </main>
      )}

      <BottomNav />
    </div>
  );
}
