"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { estimatedOneRM } from "@/lib/utils";
import ProgressChart from "@/components/ProgressChart";
import BottomNav from "@/components/BottomNav";

interface LogRow {
  actual_weight: number;
  actual_reps: number;
  week_number: number;
  lift_name: string;
}

interface DataPoint {
  week: number;
  topSet: number;
  e1rm: number;
}

// ChartPoint matches what ProgressChart expects
interface ChartPoint {
  week: number;
  weight: number;
}

interface Series {
  name: string;
  color: string;
  data: ChartPoint[];
}

const COLORS = [
  "#4ade80", "#60a5fa", "#f97316", "#a78bfa",
  "#f472b6", "#34d399", "#fbbf24", "#fb7185",
];

export default function ProgressPage() {
  const router = useRouter();
  const supabase = createClient();

  const [allLogs, setAllLogs]           = useState<LogRow[]>([]);
  const [liftNames, setLiftNames]       = useState<string[]>([]);
  const [selectedLift, setSelectedLift] = useState<string | null>(null);
  const [series, setSeries]             = useState<Series[]>([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }

      const { data } = await supabase
        .from("logs")
        .select(`
          actual_weight,
          actual_reps,
          week_number,
          lifts ( name )
        `)
        .eq("user_id", user.id)
        .not("actual_weight", "is", null)
        .not("actual_reps", "is", null)
        .order("logged_at", { ascending: true });

      if (!data) { setLoading(false); return; }

      const rows: LogRow[] = data
        .filter((r: any) => r.lifts?.name && r.actual_weight > 0 && r.actual_reps > 0)
        .map((r: any) => ({
          actual_weight: r.actual_weight,
          actual_reps: r.actual_reps,
          week_number: r.week_number ?? 1,
          lift_name: r.lifts.name,
        }));

      setAllLogs(rows);

      // Unique lift names, ordered by frequency descending
      const freq: Record<string, number> = {};
      rows.forEach((r) => { freq[r.lift_name] = (freq[r.lift_name] ?? 0) + 1; });
      const names = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
      setLiftNames(names);
      if (names.length > 0) setSelectedLift(names[0]);

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild chart data whenever selection changes
  useEffect(() => {
    if (!selectedLift) { setSeries([]); return; }

    const relevant = allLogs.filter((r) => r.lift_name === selectedLift);

    // Per week: find the log with highest e1RM (best effort)
    const weekMap: Record<number, { topSet: number; e1rm: number }> = {};
    relevant.forEach((r) => {
      const e = estimatedOneRM(r.actual_weight, r.actual_reps);
      const w = r.week_number;
      if (!weekMap[w] || e > weekMap[w].e1rm) {
        weekMap[w] = { topSet: r.actual_weight, e1rm: e };
      }
    });

    const data: DataPoint[] = Object.entries(weekMap)
      .map(([week, vals]) => ({ week: parseInt(week), ...vals }))
      .sort((a, b) => a.week - b.week);

    const colorIdx = liftNames.indexOf(selectedLift) % COLORS.length;

    setSeries([
      { name: "Est. 1RM",   color: COLORS[colorIdx],        data: data.map((d) => ({ ...d, weight: d.e1rm })) },
      { name: "Top Set",    color: COLORS[colorIdx] + "88",  data: data.map((d) => ({ ...d, weight: d.topSet })) },
    ]);
  }, [selectedLift, allLogs, liftNames]);

  // ── Stats for selected lift ───────────────────────────────────────────────
  const e1rmSeries = series.find((s) => s.name === "Est. 1RM");
  const currentE1rm   = e1rmSeries?.data.at(-1)?.weight ?? 0;
  const bestE1rm      = e1rmSeries ? Math.max(...e1rmSeries.data.map((d) => d.weight)) : 0;
  const firstE1rm     = e1rmSeries?.data[0]?.weight ?? 0;
  const totalGain     = currentE1rm - firstE1rm;

  return (
    <div className="min-h-screen bg-bg pb-20">
      <header className="px-4 pt-12 pb-4 border-b border-border">
        <h1 className="display text-3xl">Progress</h1>
        {!loading && allLogs.length > 0 && (
          <p className="text-xs text-muted mt-1">{allLogs.length} sets logged across {liftNames.length} lifts</p>
        )}
      </header>

      <main className="px-4 py-4 space-y-6">
        {loading ? (
          <p className="text-muted text-sm text-center py-8">loading...</p>
        ) : liftNames.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted text-sm">no logs yet.</p>
            <p className="text-xs text-zinc-600 mt-1">go to the Log tab and record your sets.</p>
          </div>
        ) : (
          <>
            {/* Lift selector */}
            <section>
              <p className="text-xs text-muted uppercase tracking-widest mb-2">Select lift</p>
              <div className="flex gap-2 overflow-x-auto scroll-hidden pb-1">
                {liftNames.map((name, i) => (
                  <button
                    key={name}
                    onClick={() => setSelectedLift(name)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap
                      ${selectedLift === name
                        ? "border-transparent text-bg"
                        : "border-zinc-700 text-muted hover:border-zinc-500"}`}
                    style={selectedLift === name ? { backgroundColor: COLORS[i % COLORS.length] } : {}}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </section>

            {/* Chart */}
            {selectedLift && (
              <section>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-sm font-bold uppercase tracking-wide">{selectedLift}</h2>
                  <p className="text-xs text-muted">Epley e1RM formula</p>
                </div>

                <ProgressChart series={series} />

                {/* Stats row */}
                {currentE1rm > 0 && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="border border-border rounded-lg px-3 py-3 text-center">
                      <p className="display text-2xl">{currentE1rm}</p>
                      <p className="label mt-1">e1RM</p>
                    </div>
                    <div className="border border-border rounded-lg px-3 py-3 text-center">
                      <p className="display text-2xl">{bestE1rm}</p>
                      <p className="label mt-1">best</p>
                    </div>
                    <div className="border border-border rounded-lg px-3 py-3 text-center">
                      <p className={`display text-2xl ${totalGain >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {totalGain >= 0 ? "+" : ""}{totalGain}
                      </p>
                      <p className="label mt-1">gain</p>
                    </div>
                  </div>
                )}

                {/* Per-week breakdown table */}
                {e1rmSeries && e1rmSeries.data.length > 0 && (
                  <div className="mt-4 border border-border rounded-lg overflow-hidden">
                    <div className="grid grid-cols-3 px-4 py-2 bg-zinc-900">
                      <span className="label">Week</span>
                      <span className="label text-center">Top Set</span>
                      <span className="label text-right">Est. 1RM</span>
                    </div>
                    {e1rmSeries.data.map((d, i) => {
                      const topSet = series.find((s) => s.name === "Top Set")?.data[i]?.weight ?? 0;
                      return (
                        <div key={d.week} className="grid grid-cols-3 px-4 py-2.5 border-t border-border text-sm">
                          <span className="label self-center">W{d.week}</span>
                          <span className="text-center mono">{topSet}lb</span>
                          <span className="text-right font-display font-bold">{d.weight}lb</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
