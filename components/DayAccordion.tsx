"use client";

import { useState } from "react";
import LiftRow from "./LiftRow";
import type { DayWithLifts, Lift } from "@/types/database";

interface Props {
  day: DayWithLifts;
  loggedIds: Set<string>;
  onLiftTap: (lift: Lift) => void;
  defaultOpen?: boolean;
}

export default function DayAccordion({ day, loggedIds, onLiftTap, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const loggedCount = day.lifts.filter((l) => loggedIds.has(l.id)).length;
  const allLogged = loggedCount === day.lifts.length && day.lifts.length > 0;

  return (
    <div className="border border-border rounded-lg overflow-hidden mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 min-h-[52px]
          bg-zinc-950 hover:bg-zinc-900 active:bg-zinc-900 transition-colors"
      >
        <div className="flex items-center gap-2">
          {allLogged && <span className="text-green-400 text-sm">✓</span>}
          <span className="font-bold text-sm">{day.label ?? `Day ${day.day_number}`}</span>
        </div>
        <div className="flex items-center gap-3">
          {loggedCount > 0 && (
            <span className="text-xs text-muted">
              {loggedCount}/{day.lifts.length}
            </span>
          )}
          <span className="text-muted text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="bg-zinc-950/50">
          {day.lifts.length === 0 ? (
            <p className="px-4 py-3 text-xs text-muted">no lifts</p>
          ) : (
            day.lifts.map((lift) => (
              <LiftRow
                key={lift.id}
                lift={lift}
                logged={loggedIds.has(lift.id)}
                onTap={onLiftTap}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
