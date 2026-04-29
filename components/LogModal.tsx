"use client";

import { useState, useEffect, useRef } from "react";
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
  const [reps,   setReps]   = useState(lift.prescribed_reps?.toString() ?? "");
  const [rpe,    setRpe]    = useState(lift.prescribed_rpe?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online",  up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online",  up);
      window.removeEventListener("offline", down);
    };
  }, []);

  // Auto-focus first input after sheet animates in
  useEffect(() => {
    const t = setTimeout(() => firstInputRef.current?.focus(), 150);
    return () => clearTimeout(t);
  }, []);

  // Close on Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  // Lift the sheet above the soft keyboard on iOS (visualViewport shrinks, layout viewport doesn't)
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const kb = window.innerHeight - vv.height;
      if (sheetRef.current) {
        sheetRef.current.style.transform = kb > 0 ? `translateY(-${kb}px)` : "";
      }
    };
    vv.addEventListener("resize", update);
    return () => vv.removeEventListener("resize", update);
  }, []);

  async function handleDone() {
    if (saving || saved) return;
    setSaving(true);

    const logEntry = {
      user_id:       userId,
      lift_id:       lift.id,
      actual_weight: weight ? parseFloat(weight) : null,
      actual_reps:   reps   ? parseInt(reps)     : null,
      actual_rpe:    rpe    ? parseInt(rpe)       : null,
      logged_at:     new Date().toISOString(),
      week_number:   weekNumber,
      day_number:    dayNumber,
    };

    if (!isOnline) {
      queueLog(logEntry);
    } else {
      const { error } = await supabase.from("logs").insert(logEntry);
      if (error) queueLog(logEntry);
    }

    setSaved(true);
    setSaving(false);
    onLogged(lift.id);
    setTimeout(onClose, 500);
  }

  const rpeNum = rpe ? parseInt(rpe) : null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end"
      style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={sheetRef}
        className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-2xl flex flex-col"
        style={{ maxHeight: "92dvh" }}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-zinc-800">
          <div className="flex-1 min-w-0 pr-3">
            <h2 className="text-lg font-bold leading-tight">{lift.name}</h2>
            {(lift.prescribed_sets || lift.prescribed_reps || lift.prescribed_weight) && (
              <p className="text-sm text-muted mt-0.5">
                <span className="mono">
                  {lift.prescribed_sets}×{lift.prescribed_reps}
                  {lift.prescribed_weight ? ` @ ${lift.prescribed_weight}lb` : ""}
                </span>
                {lift.prescribed_rpe && (
                  <span className={`ml-2 text-xs font-semibold ${rpeColor(lift.prescribed_rpe)}`}>
                    RPE {lift.prescribed_rpe}
                  </span>
                )}
              </p>
            )}
            {lift.notes && (
              <p className="text-xs text-zinc-500 mt-0.5 italic">{lift.notes}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-muted text-2xl leading-none w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        {/* Inputs */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto flex-1">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Weight (lb)", val: weight, set: setWeight, ref: firstInputRef, mode: "decimal" as const, step: "2.5", placeholder: "0" },
              { label: "Reps",        val: reps,   set: setReps,   ref: null,          mode: "numeric" as const, step: "1",   placeholder: "0" },
            ].map(({ label, val, set, ref, mode, step, placeholder }) => (
              <div key={label} className="col-span-1">
                <label className="block text-xs text-muted mb-1.5 uppercase tracking-wide font-medium">
                  {label}
                </label>
                <input
                  ref={ref ?? undefined}
                  type="number"
                  inputMode={mode}
                  value={val}
                  onChange={(e) => set(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className="input-field text-center text-xl font-bold mono"
                  placeholder={placeholder}
                  step={step}
                  min="0"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs text-muted mb-1.5 uppercase tracking-wide font-medium">
                RPE
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={rpe}
                onChange={(e) => setRpe(e.target.value)}
                onFocus={(e) => e.target.select()}
                className={`input-field text-center text-xl font-bold mono ${rpeColor(rpeNum)}`}
                placeholder="—"
                min="1"
                max="10"
              />
            </div>
          </div>

          {/* RPE quick-tap */}
          <div>
            <p className="text-xs text-muted mb-2 uppercase tracking-wide font-medium">Quick RPE</p>
            <div className="flex gap-2">
              {[6, 7, 8, 9, 10].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRpe(r.toString())}
                  className={`flex-1 h-10 rounded-lg text-sm font-bold border transition-colors
                    ${rpe === r.toString()
                      ? `${rpeBg(r)} border-current ${rpeColor(r)}`
                      : "bg-zinc-900 border-zinc-700 text-muted"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sticky Done button — always visible, never hidden by keyboard */}
        <div className="px-5 pt-3 pb-6 pb-safe border-t border-zinc-800 bg-zinc-950 shrink-0">
          {!isOnline && (
            <p className="text-xs text-yellow-500 text-center mb-2">
              offline — will sync when connected
            </p>
          )}
          <button
            type="button"
            onClick={handleDone}
            disabled={saving || saved}
            className={`w-full h-14 rounded-xl text-base font-bold transition-all select-none
              ${saved
                ? "bg-green-600 text-white"
                : saving
                  ? "bg-zinc-700 text-muted"
                  : "bg-white text-black active:bg-zinc-200"}`}
          >
            {saved ? "✓  Logged!" : saving ? "Saving…" : "Done — Log Set"}
          </button>
        </div>
      </div>
    </div>
  );
}
