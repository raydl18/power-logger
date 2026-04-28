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

export default function WeekAccordion({ week, loggedIds, onLiftTap, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const allLiftIds = week.days.flatMap((d) => d.lifts.map((l) => l.id));
  const loggedCount = allLiftIds.filter((id) => loggedIds.has(id)).length;

  return (
    <div className="mb-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[52px]
          bg-zinc-900 rounded-lg hover:bg-zinc-800 active:bg-zinc-800 transition-colors"
      >
        <span className="font-bold uppercase tracking-wide text-sm">
          {week.label ?? `Week ${week.week_number}`}
        </span>
        <div className="flex items-center gap-3">
          {loggedCount > 0 && (
            <span className="text-xs text-muted">
              {loggedCount}/{allLiftIds.length} logged
            </span>
          )}
          <span className="text-muted text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="mt-2 pl-2">
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
