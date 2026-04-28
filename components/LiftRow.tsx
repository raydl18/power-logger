"use client";

import { rpeColor, rpeBg } from "@/lib/utils";
import type { Lift } from "@/types/database";

interface Props {
  lift: Lift;
  logged: boolean;
  onTap: (lift: Lift) => void;
}

export default function LiftRow({ lift, logged, onTap }: Props) {
  const prescription =
    `${lift.prescribed_sets ?? "?"}×${lift.prescribed_reps ?? "?"}` +
    (lift.prescribed_weight ? ` @ ${lift.prescribed_weight}lb` : "");

  return (
    <button
      onClick={() => onTap(lift)}
      className={`w-full text-left flex items-center justify-between px-4 py-3 min-h-[52px]
        border-b border-border last:border-b-0 active:bg-zinc-900 transition-colors
        ${logged ? "opacity-60" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {logged && <span className="text-green-400 text-sm shrink-0">✓</span>}
          <span className="font-bold truncate text-sm">{lift.name}</span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted">{prescription}</span>
          {lift.notes && (
            <span className="text-xs text-zinc-600 italic truncate">{lift.notes}</span>
          )}
        </div>
      </div>

      {lift.prescribed_rpe && (
        <span
          className={`ml-3 shrink-0 text-xs font-bold px-2 py-1 rounded ${rpeBg(lift.prescribed_rpe)} ${rpeColor(lift.prescribed_rpe)}`}
        >
          RPE {lift.prescribed_rpe}
        </span>
      )}
    </button>
  );
}
