"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueLog } from "@/lib/offline";
import { rpeColor, rpeBg } from "@/lib/utils";
import type { Lift } from "@/types/database";

interface Props {
  lift: Lift;
  userId: string;
  weekNumber: number;
  dayNumber: number;
  onClose: () => void;
  onLogged: (liftId: string) => void;
}

export default function LogModal({ lift, userId, weekNumber, dayNumber, onClose, onLogged }: Props) {
  const supabase = createClient();
  const [weight, setWeight] = useState(lift.prescribed_weight?.toString() ?? "");
  const [reps, setReps] = useState(lift.prescribed_reps?.toString() ?? "");
  const [rpe, setRpe] = useState(lift.prescribed_rpe?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "queued" | "error">("idle");

  // Close on backdrop tap
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const logEntry = {
      user_id: userId,
      lift_id: lift.id,
      actual_weight: weight ? parseFloat(weight) : null,
      actual_reps: reps ? parseInt(reps) : null,
      actual_rpe: rpe ? parseInt(rpe) : null,
      logged_at: new Date().toISOString(),
      week_number: weekNumber,
      day_number: dayNumber,
    };

    if (!navigator.onLine) {
      queueLog(logEntry);
      setStatus("queued");
      setSaving(false);
      setTimeout(() => { onLogged(lift.id); onClose(); }, 800);
      return;
    }

    const { error } = await supabase.from("logs").insert(logEntry);
    if (error) {
      // Fallback to offline queue
      queueLog(logEntry);
      setStatus("queued");
    } else {
      setStatus("saved");
    }
    setSaving(false);
    setTimeout(() => { onLogged(lift.id); onClose(); }, 600);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full bg-zinc-950 border-t border-border rounded-t-2xl p-6 pb-safe">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold uppercase tracking-tight">{lift.name}</h2>
            <p className="text-xs text-muted mt-0.5">
              prescribed: {lift.prescribed_sets}×{lift.prescribed_reps}
              {lift.prescribed_weight ? ` @ ${lift.prescribed_weight}lb` : ""}
              {lift.prescribed_rpe ? (
                <span className={`ml-1 ${rpeColor(lift.prescribed_rpe)}`}>
                  RPE {lift.prescribed_rpe}
                </span>
              ) : null}
            </p>
            {lift.notes && <p className="text-xs text-zinc-500 mt-0.5 italic">{lift.notes}</p>}
          </div>
          <button onClick={onClose} className="text-muted text-xl leading-none p-1">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted mb-1 uppercase tracking-widest">
                Weight (lb)
              </label>
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="input-field text-center text-lg"
                placeholder="0"
                step="2.5"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 uppercase tracking-widest">
                Reps
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="input-field text-center text-lg"
                placeholder="0"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 uppercase tracking-widest">
                RPE
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                className={`input-field text-center text-lg ${rpeColor(rpe ? parseInt(rpe) : null)}`}
                placeholder="0"
                min="1"
                max="10"
              />
            </div>
          </div>

          {/* RPE quick-select */}
          <div className="flex gap-2">
            {[6, 7, 8, 9, 10].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRpe(r.toString())}
                className={`flex-1 min-h-[36px] rounded text-sm font-bold border transition-colors
                  ${rpe === r.toString()
                    ? `${rpeBg(r)} border-current ${rpeColor(r)}`
                    : "bg-zinc-900 border-zinc-700 text-muted"}`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={saving}
            className={`btn-primary w-full text-base ${
              status === "saved" ? "bg-green-700 hover:bg-green-700" :
              status === "queued" ? "bg-yellow-700 hover:bg-yellow-700" : ""
            }`}
          >
            {saving ? "saving..." :
             status === "saved" ? "✓ saved" :
             status === "queued" ? "⏳ queued offline" :
             navigator.onLine ? "LOG SET" : "QUEUE (offline)"}
          </button>
        </form>
      </div>
    </div>
  );
}
