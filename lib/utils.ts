export function rpeColor(rpe: number | null): string {
  if (!rpe) return "text-muted";
  if (rpe <= 5) return "text-blue-400";
  if (rpe === 6) return "text-rpe6";
  if (rpe === 7) return "text-rpe7";
  if (rpe === 8) return "text-rpe8";
  return "text-rpe9";
}

export function rpeBg(rpe: number | null): string {
  if (!rpe) return "bg-zinc-800";
  if (rpe <= 5) return "bg-blue-900/40";
  if (rpe === 6) return "bg-green-900/40";
  if (rpe === 7) return "bg-yellow-900/40";
  if (rpe === 8) return "bg-orange-900/40";
  return "bg-red-900/40";
}

export function formatWeight(weight: number | null): string {
  if (!weight) return "BW";
  return `${weight}`;
}

export function prescriptionLabel(sets: number | null, reps: number | null, weight: number | null): string {
  const s = sets ?? "?";
  const r = reps ?? "?";
  const w = weight ? `@ ${weight}lb` : "";
  return `${s}×${r} ${w}`.trim();
}

export function currentWeekFromStartDate(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  return Math.min(Math.max(diffWeeks + 1, 1), 4);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function generateSlug(title: string): string {
  const base = slugify(title);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base}-${rand}`;
}

// Epley formula — standard powerlifting convention
// For reps=1 returns weight directly; accuracy degrades past ~10 reps
export function estimatedOneRM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}
