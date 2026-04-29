"use client";

import { useState } from "react";
import DayAccordion from "./DayAccordion";
import type { WeekWithDays, Lift } from "@/types/database";

interface Props {
  week: WeekWithDays;
  loggedIds: Set<string>;
  onLiftTap: (lift: Lift) => void;
  defaultOpen?: boolean;
}

// Derive RPE from week label text or fall back to week number
function weekRpe(week: WeekWithDays): number | null {
  const match = (week.label ?? "").match(/RPE\s*(\d+)/i);
  if (match) return parseInt(match[1]);
  // Default mapping for the standard 4-week block
  const map: Record<number, number> = { 1: 6, 2: 7, 3: 8, 4: 9 };
  return map[week.week_number] ?? null;
}

function rpeStyle(rpe: number | null): { border: string; badge: string; label: string } {
  switch (rpe) {
    case 6:  return { border: "border-l-4 border-l-green-500",  badge: "bg-green-900/50 text-green-300",  label: "RPE 6" };
    case 7:  return { border: "border-l-4 border-l-yellow-500", badge: "bg-yellow-900/50 text-yellow-300", label: "RPE 7" };
    case 8:  return { border: "border-l-4 border-l-orange-500", badge: "bg-orange-900/50 text-orange-300", label: "RPE 8" };
    case 9:  return { border: "border-l-4 border-l-red-500",    badge: "bg-red-900/50 text-red-300",       label: "RPE 9" };
    case 10: return { border: "border-l-4 border-l-red-700",    badge: "bg-red-950/60 text-red-400",       label: "RPE 10" };
    default: return { border: "",                                 badge: "bg-zinc-800 text-zinc-400",        label: "" };
  }
}

export default function WeekAccordion({ week, loggedIds, onLiftTap, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const allLiftIds  = week.days.flatMap((d) => d.lifts.map((l) => l.id));
  const loggedCount = allLiftIds.filter((id) => loggedIds.has(id)).length;
  const rpe         = weekRpe(week);
  const style       = rpeStyle(rpe);

  return (
    <div className={`mb-3 rounded-lg overflow-hidden ${style.border}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 min-h-[54px]
          bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="font-semibold text-sm">
            {week.label ?? `Week ${week.week_number}`}
          </span>
          {style.label && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>
              {style.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {loggedCount > 0 && (
            <span className="text-xs text-muted">
              {loggedCount}/{allLiftIds.length}
            </span>
          )}
          <span className="text-muted text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="mt-0 pl-2 bg-zinc-950/50">
          {week.days.map((day, i) => (
            <DayAccordion
              key={day.id}
              day={day}
              loggedIds={loggedIds}
              onLiftTap={onLiftTap}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
