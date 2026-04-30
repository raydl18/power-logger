"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BottomNav from "@/components/BottomNav";

// ── CSV parser ────────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

interface ParsedSet {
  date: string;       // YYYY-MM-DD
  exercise: string;
  weight: number | null;
  reps: number;
}

function parseFitNotesCSV(text: string): ParsedSet[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map(h => h.trim());
  const col = (name: string) => header.indexOf(name);

  const dateIdx     = col("Date");
  const exerciseIdx = col("Exercise");
  const weightIdx   = col("Weight");
  const unitIdx     = col("Weight Unit");
  const repsIdx     = col("Reps");

  if (dateIdx === -1 || exerciseIdx === -1) return [];

  const sets: ParsedSet[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const cols = parseCSVLine(line);
    const date     = cols[dateIdx]?.trim();
    const exercise = cols[exerciseIdx]?.trim();
    const reps     = repsIdx >= 0 ? parseInt(cols[repsIdx]) : NaN;

    if (!date || !exercise || isNaN(reps) || reps <= 0) continue;

    const rawWeight = weightIdx >= 0 ? parseFloat(cols[weightIdx]) : NaN;
    const unit      = unitIdx >= 0 ? (cols[unitIdx] ?? "lbs").toLowerCase() : "lbs";

    let weight: number | null = null;
    if (!isNaN(rawWeight) && rawWeight > 0) {
      const lbs = unit === "kg" ? rawWeight * 2.20462 : rawWeight;
      weight = Math.round(lbs * 10) / 10;
    }

    sets.push({ date, exercise, weight, reps });
  }

  return sets;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed,   setParsed]   = useState<ParsedSet[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  function handleFile(file: File) {
    setFileName(file.name);
    setParsed(null);
    setDone(false);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const sets = parseFitNotesCSV(e.target?.result as string);
      setParsed(sets);
    };
    reader.readAsText(file);
  }

  async function runImport() {
    if (!parsed?.length) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/auth/login"); return; }

    const BATCH = 500;
    setProgress({ done: 0, total: parsed.length });
    setError(null);

    for (let i = 0; i < parsed.length; i += BATCH) {
      const rows = parsed.slice(i, i + BATCH).map(s => ({
        user_id:       user.id,
        exercise_name: s.exercise,
        actual_weight: s.weight,
        actual_reps:   s.reps,
        actual_rpe:    null,
        log_date:      s.date,
        logged_at:     new Date(s.date + "T12:00:00").toISOString(),
      }));

      const { error: err } = await supabase.from("custom_logs").insert(rows);
      if (err) {
        setError(`Failed at row ${i + 1}: ${err.message}`);
        setProgress(null);
        return;
      }

      setProgress({ done: Math.min(i + BATCH, parsed.length), total: parsed.length });
    }

    setProgress(null);
    setDone(true);
  }

  const summary = parsed ? (() => {
    const dates = [...new Set(parsed.map(s => s.date))].sort();
    const exercises = new Set(parsed.map(s => s.exercise));
    return { count: parsed.length, from: dates[0], to: dates[dates.length - 1], exercises: exercises.size };
  })() : null;

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-4 pt-12 pb-4 border-b border-border flex items-center gap-3">
        <button onClick={() => router.back()}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700 shrink-0">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13L5 8l5-5" />
          </svg>
        </button>
        <h1 className="display text-2xl">Import Data</h1>
      </header>

      <main className="px-4 py-6 space-y-6">

        {/* File picker */}
        {!done && !progress && (
          <section>
            <p className="label mb-3">FitNotes CSV export</p>
            <button onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-zinc-700 rounded-2xl px-4 py-10 flex flex-col items-center gap-3
                hover:border-zinc-500 active:bg-zinc-900 transition-colors">
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
                <path d="M22 4H9a2 2 0 0 0-2 2v24a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V11L22 4z" />
                <path d="M22 4v7h7M18 16v10M14 22l4-4 4 4" />
              </svg>
              <div className="text-center">
                <p className="text-sm text-zinc-300">{fileName || "Tap to choose file"}</p>
                {fileName
                  ? <p className="text-xs text-zinc-600 mt-0.5">tap to change</p>
                  : <p className="text-xs text-zinc-600 mt-0.5">FitNotes_Export.csv</p>}
              </div>
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
          </section>
        )}

        {/* Preview */}
        {summary && !done && !progress && (
          <section className="space-y-4">
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-400">Sets found</span>
                <span className="display text-xl">{summary.count.toLocaleString()}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-400">Exercises</span>
                <span className="display text-xl">{summary.exercises}</span>
              </div>
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-400">Date range</span>
                <span className="text-xs mono text-zinc-300">{summary.from} → {summary.to}</span>
              </div>
            </div>

            <p className="text-xs text-zinc-600 text-center">
              importing twice will create duplicates — only do this once.
            </p>

            <button onClick={runImport} className="btn-primary w-full">
              Import {summary.count.toLocaleString()} sets
            </button>
          </section>
        )}

        {/* Progress bar */}
        {progress && (
          <section className="space-y-3 py-4">
            <p className="text-sm text-center text-zinc-400">
              Importing… {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
            </p>
            <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-white h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          </section>
        )}

        {/* Done */}
        {done && (
          <section className="text-center space-y-5 py-4">
            <div className="flex items-center justify-center gap-2 text-green-400">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10L8.5 14.5 16 6" />
              </svg>
              <p className="font-semibold">{parsed?.length.toLocaleString()} sets imported</p>
            </div>
            <button onClick={() => router.push("/calendar")} className="btn-primary w-full">
              View calendar →
            </button>
          </section>
        )}

        {/* Error */}
        {error && <p className="text-xs text-red-400 text-center">{error}</p>}

      </main>

      <BottomNav />
    </div>
  );
}
