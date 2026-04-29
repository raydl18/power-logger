"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { filterExercises } from "@/lib/exercises";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LiftDraft {
  tempId: string;
  dbId?: string;
  name: string;
  sets: string;
  reps: string;
  weight: string;
  rpe: string;
  notes: string;
}

interface DayDraft {
  tempId: string;
  dbId?: string;
  dayNumber: number;
  label: string;
  lifts: LiftDraft[];
}

interface WeekDraft {
  tempId: string;
  dbId?: string;
  weekNumber: number;
  label: string;
  days: DayDraft[];
}

export interface ExistingProgram {
  id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  share_slug: string | null;
  weeks: Array<{
    id: string;
    week_number: number;
    label: string | null;
    days: Array<{
      id: string;
      day_number: number;
      label: string | null;
      lifts: Array<{
        id: string;
        name: string;
        prescribed_sets: number | null;
        prescribed_reps: number | null;
        prescribed_weight: number | null;
        prescribed_rpe: number | null;
        notes: string | null;
        order_index: number;
      }>;
    }>;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid() { return crypto.randomUUID(); }

function makeSlug(title: string) {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}

function n(v: number | null | undefined): string { return v == null ? "" : String(v); }

// ── Exercise Search Sheet ─────────────────────────────────────────────────────

function ExerciseSheet({ onSelect, onClose }: {
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const results = filterExercises(q, []);
  const showCustom = q.trim() && !results.some(r => r.toLowerCase() === q.trim().toLowerCase());

  return (
    <div className="fixed inset-0 z-[80] flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.7)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-2xl flex flex-col" style={{ maxHeight: "80dvh" }}>
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800 flex gap-3">
          <input type="text" value={q} onChange={e => setQ(e.target.value)} autoFocus
            placeholder="Search exercises…"
            className="flex-1 h-11 px-4 bg-zinc-900 rounded-xl border border-zinc-700 focus:border-zinc-400 outline-none text-base" />
          <button onClick={onClose} className="text-zinc-400 text-xl w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 py-2">
          {showCustom && (
            <button onClick={() => onSelect(q.trim())}
              className="w-full text-left px-4 py-4 flex items-center gap-3 hover:bg-zinc-900 active:bg-zinc-800 border-b border-zinc-800">
              <span className="text-green-400 text-xl font-bold">+</span>
              <span className="font-semibold">Add "{q.trim()}"</span>
            </button>
          )}
          {results.map(name => (
            <button key={name} onClick={() => onSelect(name)}
              className="w-full text-left px-4 py-3.5 hover:bg-zinc-900 active:bg-zinc-800">
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Lift Card ─────────────────────────────────────────────────────────────────

function LiftCard({ lift, onUpdate, onDelete }: {
  lift: LiftDraft;
  onUpdate: (u: LiftDraft) => void;
  onDelete: () => void;
}) {
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <div className="mb-2 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
        <div className="flex items-center justify-between mb-2.5">
          <button onClick={() => setShowSearch(true)} className="flex-1 text-left text-sm font-semibold truncate">
            {lift.name || <span className="text-zinc-500 italic font-normal">tap to choose exercise</span>}
          </button>
          <button onClick={onDelete}
            className="ml-2 w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-red-400 text-lg shrink-0">×</button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-2">
          {(["sets", "reps", "weight", "rpe"] as const).map((field, i) => (
            <div key={field}>
              <label className="block text-[10px] text-zinc-600 mb-1">
                {["Sets", "Reps", "Wt(lb)", "RPE"][i]}
              </label>
              <input
                type="number"
                inputMode={field === "weight" ? "decimal" : "numeric"}
                value={lift[field]}
                onChange={e => onUpdate({ ...lift, [field]: e.target.value })}
                onFocus={e => e.target.select()}
                placeholder="—"
                min="0"
                className="w-full h-9 text-center text-sm font-bold bg-zinc-800 rounded-lg border border-zinc-700 focus:border-zinc-400 outline-none"
              />
            </div>
          ))}
        </div>

        <input type="text" value={lift.notes}
          onChange={e => onUpdate({ ...lift, notes: e.target.value })}
          placeholder="Notes (optional)"
          className="w-full h-8 px-2.5 text-xs bg-zinc-800 rounded-lg border border-zinc-700 focus:border-zinc-400 outline-none placeholder-zinc-600" />
      </div>

      {showSearch && (
        <ExerciseSheet
          onSelect={name => { onUpdate({ ...lift, name }); setShowSearch(false); }}
          onClose={() => setShowSearch(false)}
        />
      )}
    </>
  );
}

// ── Day Editor Sheet ──────────────────────────────────────────────────────────

function DayEditor({ day, onUpdate, onClose }: {
  day: DayDraft;
  onUpdate: (d: DayDraft) => void;
  onClose: () => void;
}) {
  function addLift() {
    onUpdate({
      ...day,
      lifts: [...day.lifts, { tempId: uid(), name: "", sets: "", reps: "", weight: "", rpe: "", notes: "" }],
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end" style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full bg-zinc-950 border-t border-zinc-800 rounded-t-2xl flex flex-col" style={{ maxHeight: "88dvh" }}>
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-zinc-800 shrink-0">
          <input type="text" value={day.label}
            onChange={e => onUpdate({ ...day, label: e.target.value })}
            placeholder={`Day ${day.dayNumber}`}
            className="flex-1 h-10 px-3 bg-zinc-900 rounded-xl border border-zinc-700 focus:border-zinc-400 outline-none font-semibold" />
          <button onClick={onClose} className="h-10 px-5 bg-white text-black text-sm font-bold rounded-xl shrink-0">
            Done
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 py-3">
          {day.lifts.length === 0 && (
            <p className="text-center text-zinc-600 text-sm py-8">No exercises yet — add one below</p>
          )}
          {day.lifts.map((lift, i) => (
            <LiftCard
              key={lift.tempId}
              lift={lift}
              onUpdate={u => {
                const lifts = [...day.lifts];
                lifts[i] = u;
                onUpdate({ ...day, lifts });
              }}
              onDelete={() => onUpdate({ ...day, lifts: day.lifts.filter((_, j) => j !== i) })}
            />
          ))}

          <button onClick={addLift}
            className="w-full h-12 rounded-xl border-2 border-dashed border-zinc-700 text-zinc-400 font-semibold text-sm
              hover:border-zinc-500 hover:text-zinc-300 transition-colors">
            + Add Exercise
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Day Cell ──────────────────────────────────────────────────────────────────

function DayCell({ day, onClick }: { day: DayDraft; onClick: () => void }) {
  const names = day.lifts.map(l => l.name).filter(Boolean);
  return (
    <button onClick={onClick}
      className="w-full h-full min-h-[88px] text-left p-2 bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-700
        rounded-xl border border-zinc-800 transition-colors flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide truncate w-full">
        {day.label || `Day ${day.dayNumber}`}
      </span>
      {names.slice(0, 3).map((nm, i) => (
        <span key={i} className="text-[11px] text-zinc-300 truncate w-full leading-snug">{nm}</span>
      ))}
      {names.length > 3 && <span className="text-[10px] text-zinc-500">+{names.length - 3} more</span>}
      {names.length === 0 && <span className="text-[11px] text-zinc-700 italic">empty</span>}
    </button>
  );
}

// ── Stepper ───────────────────────────────────────────────────────────────────

function Stepper({ label, value, onChange, min, max }: {
  label: string; value: number; onChange: (v: number) => void; min: number; max: number;
}) {
  return (
    <div>
      <label className="block text-xs text-zinc-500 uppercase tracking-wide mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <button onClick={() => onChange(Math.max(min, value - 1))}
          className="w-11 h-11 bg-zinc-900 border border-zinc-700 rounded-xl text-xl font-bold active:bg-zinc-800">−</button>
        <span className="flex-1 text-center text-2xl font-bold mono">{value}</span>
        <button onClick={() => onChange(Math.min(max, value + 1))}
          className="w-11 h-11 bg-zinc-900 border border-zinc-700 rounded-xl text-xl font-bold active:bg-zinc-800">+</button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ProgramBuilder({ userId, existing }: {
  userId: string;
  existing?: ExistingProgram;
}) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!existing;

  // Track original DB IDs so we can delete removed items on save
  const origWeekIds = useRef(new Set(existing?.weeks.map(w => w.id) ?? []));
  const origDayIds  = useRef(new Set(existing?.weeks.flatMap(w => w.days.map(d => d.id)) ?? []));
  const origLiftIds = useRef(new Set(
    existing?.weeks.flatMap(w => w.days.flatMap(d => d.lifts.map(l => l.id))) ?? []
  ));

  const initWeeks = (): WeekDraft[] => {
    if (!existing) return [];
    return [...existing.weeks]
      .sort((a, b) => a.week_number - b.week_number)
      .map(w => ({
        tempId: uid(), dbId: w.id, weekNumber: w.week_number,
        label: w.label ?? `Week ${w.week_number}`,
        days: [...w.days]
          .sort((a, b) => a.day_number - b.day_number)
          .map(d => ({
            tempId: uid(), dbId: d.id, dayNumber: d.day_number,
            label: d.label ?? `Day ${d.day_number}`,
            lifts: [...d.lifts]
              .sort((a, b) => a.order_index - b.order_index)
              .map(l => ({
                tempId: uid(), dbId: l.id, name: l.name,
                sets: n(l.prescribed_sets), reps: n(l.prescribed_reps),
                weight: n(l.prescribed_weight), rpe: n(l.prescribed_rpe),
                notes: l.notes ?? "",
              })),
          })),
      }));
  };

  const [step, setStep]       = useState<"setup" | "grid">(existing ? "grid" : "setup");
  const [title, setTitle]     = useState(existing?.title ?? "");
  const [desc, setDesc]       = useState(existing?.description ?? "");
  const [pub, setPub]         = useState(existing?.is_public ?? false);
  const [numWeeks, setNumWeeks] = useState(existing?.weeks.length ?? 4);
  const [numDays, setNumDays]   = useState(existing?.weeks[0]?.days.length ?? 4);
  const [weeks, setWeeks]     = useState<WeekDraft[]>(initWeeks);
  const [cell, setCell]       = useState<{ wi: number; di: number } | null>(null);
  const [saving, setSaving]   = useState(false);
  const [err, setErr]         = useState<string | null>(null);

  // ── Grid mutations ──────────────────────────────────────────────────────────

  function buildGrid() {
    if (!title.trim()) { setErr("Program name is required"); return; }
    setErr(null);
    setWeeks(prev => Array.from({ length: numWeeks }, (_, wi) => {
      const ew = prev[wi];
      const days: DayDraft[] = Array.from({ length: numDays }, (_, di) =>
        ew?.days[di] ?? { tempId: uid(), dayNumber: di + 1, label: `Day ${di + 1}`, lifts: [] }
      );
      return ew
        ? { ...ew, weekNumber: wi + 1, days }
        : { tempId: uid(), weekNumber: wi + 1, label: `Week ${wi + 1}`, days };
    }));
    setStep("grid");
  }

  function addWeek() {
    const wn = weeks.length + 1;
    const dayCount = weeks[0]?.days.length ?? numDays;
    setWeeks(prev => [...prev, {
      tempId: uid(), weekNumber: wn, label: `Week ${wn}`,
      days: Array.from({ length: dayCount }, (_, di) => ({
        tempId: uid(), dayNumber: di + 1, label: prev[0]?.days[di]?.label ?? `Day ${di + 1}`, lifts: [],
      })),
    }]);
  }

  function removeLastWeek() {
    if (weeks.length <= 1) return;
    setWeeks(prev => prev.slice(0, -1));
  }

  function addDay() {
    const dn = (weeks[0]?.days.length ?? 0) + 1;
    setWeeks(prev => prev.map(w => ({
      ...w, days: [...w.days, { tempId: uid(), dayNumber: dn, label: `Day ${dn}`, lifts: [] }],
    })));
    setNumDays(dn);
  }

  function removeLastDay() {
    const cur = weeks[0]?.days.length ?? 0;
    if (cur <= 1) return;
    setWeeks(prev => prev.map(w => ({ ...w, days: w.days.slice(0, -1) })));
    setNumDays(c => Math.max(1, c - 1));
  }

  function updateDay(wi: number, di: number, d: DayDraft) {
    setWeeks(prev => {
      const ws = [...prev];
      const ds = [...ws[wi].days];
      ds[di] = d;
      ws[wi] = { ...ws[wi], days: ds };
      return ws;
    });
  }

  // ── Save ────────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!title.trim()) { setErr("Program name is required"); return; }
    setSaving(true);
    setErr(null);
    let pid = existing?.id ?? null;

    try {
      if (!isEdit) {
        const { data: prog, error: pe } = await supabase.from("programs").insert({
          user_id: userId,
          title: title.trim(),
          description: desc.trim() || null,
          is_public: pub,
          share_slug: pub ? makeSlug(title) : null,
        }).select("id").single();
        if (pe || !prog) throw new Error(pe?.message ?? "Failed to create program");
        pid = prog.id;
        await supabase.from("program_follows").insert({ user_id: userId, program_id: pid });
      } else {
        const upd: Record<string, unknown> = {
          title: title.trim(),
          description: desc.trim() || null,
          is_public: pub,
        };
        if (pub && !existing!.share_slug) upd.share_slug = makeSlug(title);
        const { error: ue } = await supabase.from("programs").update(upd).eq("id", pid!);
        if (ue) throw new Error(ue.message);
      }

      const curWeekIds = new Set<string>();
      const curDayIds  = new Set<string>();
      const curLiftIds = new Set<string>();

      for (const wk of weeks) {
        let wid = wk.dbId;
        if (wid) {
          await supabase.from("weeks").update({ week_number: wk.weekNumber, label: wk.label }).eq("id", wid);
        } else {
          const { data: w, error: we } = await supabase.from("weeks")
            .insert({ program_id: pid!, week_number: wk.weekNumber, label: wk.label }).select("id").single();
          if (we || !w) continue;
          wid = w.id;
        }
        curWeekIds.add(wid!);

        for (const dy of wk.days) {
          let did = dy.dbId;
          if (did) {
            await supabase.from("days").update({ day_number: dy.dayNumber, label: dy.label }).eq("id", did);
          } else {
            const { data: d, error: de } = await supabase.from("days")
              .insert({ week_id: wid!, day_number: dy.dayNumber, label: dy.label }).select("id").single();
            if (de || !d) continue;
            did = d.id;
          }
          curDayIds.add(did!);

          for (let li = 0; li < dy.lifts.length; li++) {
            const lf = dy.lifts[li];
            const ldata = {
              name: lf.name || "Untitled",
              prescribed_sets:   lf.sets   ? parseInt(lf.sets)      : null,
              prescribed_reps:   lf.reps   ? parseInt(lf.reps)      : null,
              prescribed_weight: lf.weight ? parseFloat(lf.weight)  : null,
              prescribed_rpe:    lf.rpe    ? parseInt(lf.rpe)       : null,
              notes: lf.notes || null,
              order_index: li,
            };
            if (lf.dbId) {
              await supabase.from("lifts").update(ldata).eq("id", lf.dbId);
              curLiftIds.add(lf.dbId);
            } else {
              const { data: l } = await supabase.from("lifts")
                .insert({ ...ldata, day_id: did! }).select("id").single();
              if (l) curLiftIds.add(l.id);
            }
          }
        }
      }

      // Delete items that were removed during editing
      if (isEdit) {
        const dl = [...origLiftIds.current].filter(id => !curLiftIds.has(id));
        const dd = [...origDayIds.current].filter(id => !curDayIds.has(id));
        const dw = [...origWeekIds.current].filter(id => !curWeekIds.has(id));
        if (dl.length) await supabase.from("lifts").delete().in("id", dl);
        if (dd.length) await supabase.from("days").delete().in("id", dd);
        if (dw.length) await supabase.from("weeks").delete().in("id", dw);
      }

      router.push("/program");
      router.refresh();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setSaving(false);
    }
  }

  // ── Setup View ──────────────────────────────────────────────────────────────

  if (step === "setup") {
    return (
      <div className="min-h-screen bg-bg">
        <header className="px-4 pt-12 pb-4 border-b border-border flex items-center gap-3">
          <button onClick={() => router.back()} className="text-zinc-400 text-xl w-8 shrink-0">‹</button>
          <h1 className="text-lg font-bold">New Program</h1>
        </header>

        <main className="px-4 py-6 space-y-5 max-w-md mx-auto">
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Program Name</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} autoFocus
              placeholder="e.g. 4-Week Strength Block" className="input-field" />
          </div>

          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wide mb-1.5">Description</label>
            <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Optional" className="input-field" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Stepper label="Weeks"       value={numWeeks} onChange={setNumWeeks} min={1} max={16} />
            <Stepper label="Days / Week" value={numDays}  onChange={setNumDays}  min={1} max={7}  />
          </div>

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <button onClick={buildGrid}
            className="w-full h-14 bg-white text-black font-bold text-base rounded-xl active:bg-zinc-200">
            Build Program →
          </button>
        </main>
      </div>
    );
  }

  // ── Grid View ───────────────────────────────────────────────────────────────

  const activeDay = cell ? weeks[cell.wi]?.days[cell.di] : null;

  return (
    <div className="min-h-screen bg-bg pb-28">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 bg-bg px-4 pt-10 pb-3 border-b border-border">
        <div className="flex items-center gap-3 mb-2.5">
          <button onClick={() => (isEdit ? router.back() : setStep("setup"))}
            className="text-zinc-400 text-xl w-8 shrink-0">‹</button>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Program name"
            className="flex-1 min-w-0 bg-transparent font-bold text-lg outline-none border-b border-zinc-700 focus:border-zinc-400 pb-0.5" />
        </div>

        <div className="flex items-center gap-2">
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Description (optional)"
            className="flex-1 min-w-0 h-8 px-3 text-xs bg-zinc-900 rounded-lg border border-zinc-800 focus:border-zinc-600 outline-none placeholder-zinc-600" />
          <button onClick={() => setPub(p => !p)}
            className={`flex items-center gap-1 text-xs px-3 h-8 rounded-full border transition-colors shrink-0
              ${pub ? "border-green-600 text-green-400 bg-green-950/40" : "border-zinc-700 text-zinc-500"}`}>
            {pub ? "◉ Public" : "○ Private"}
          </button>
          <button onClick={handleSave} disabled={saving}
            className="h-8 px-4 bg-white text-black text-sm font-bold rounded-xl disabled:opacity-50 shrink-0">
            {saving ? "…" : "Save"}
          </button>
        </div>

        {err && <p className="text-red-400 text-xs mt-1.5">{err}</p>}
      </header>

      {/* Grid */}
      <div className="overflow-x-auto px-3 pt-4">
        <div className="inline-block min-w-full">

          {/* Column headers (day labels) */}
          <div className="flex gap-1.5 mb-1.5 pl-[44px]">
            {weeks[0]?.days.map((d, di) => (
              <div key={di} className="w-[82px] shrink-0 text-center text-[11px] text-zinc-500 font-medium truncate px-1">
                {d.label || `D${di + 1}`}
              </div>
            ))}
            <div className="flex gap-1 ml-1">
              <button onClick={addDay} title="Add day"
                className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white text-sm font-bold">+</button>
              {(weeks[0]?.days.length ?? 0) > 1 && (
                <button onClick={removeLastDay} title="Remove last day"
                  className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-400 text-sm font-bold">−</button>
              )}
            </div>
          </div>

          {/* Rows */}
          <div className="flex flex-col gap-1.5">
            {weeks.map((wk, wi) => (
              <div key={wk.tempId} className="flex items-stretch gap-1.5">
                {/* Week label */}
                <div className="w-[44px] shrink-0 flex items-center justify-center">
                  <span className="text-[11px] text-zinc-500 font-medium">W{wk.weekNumber}</span>
                </div>
                {/* Day cells */}
                {wk.days.map((dy, di) => (
                  <div key={dy.tempId} className="w-[82px] shrink-0">
                    <DayCell day={dy} onClick={() => setCell({ wi, di })} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Add / remove week */}
          <div className="flex gap-1.5 mt-2 pl-[44px]">
            <button onClick={addWeek}
              className="h-7 px-3 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white font-medium transition-colors">
              + Week
            </button>
            {weeks.length > 1 && (
              <button onClick={removeLastWeek}
                className="h-7 px-3 text-xs rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-600 hover:text-red-400 font-medium transition-colors">
                − Week
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Day editor bottom sheet */}
      {cell && activeDay && (
        <DayEditor
          day={activeDay}
          onUpdate={d => updateDay(cell.wi, cell.di, d)}
          onClose={() => setCell(null)}
        />
      )}
    </div>
  );
}
