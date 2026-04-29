export const COMMON_EXERCISES = [
  // Main lifts
  "Squat", "Pause Squat", "Box Squat",
  "Bench Press", "2ct Pause Bench", "Close Grip Bench", "Incline Bench",
  "Deadlift", "Sumo Deadlift", "Trap Bar Deadlift",
  "OHP", "Push Press",
  "Romanian Deadlift", "RDL", "Stiff Leg Deadlift",
  // Back
  "Barbell Row", "Dumbbell Row", "Cable Row", "Chest-Supported Row",
  "Lat Pulldown", "Pull-up", "Chin-up", "Weighted Pull-up",
  "Face Pull", "Rear Delt Fly",
  // Legs
  "Leg Press", "Hack Squat", "Leg Extension", "Leg Curl", "Hamstring Curl",
  "Back Extension", "Hip Thrust", "Hip Abduction", "Calf Raise",
  // Shoulders
  "DB Lateral Raise", "Machine Lateral Raise", "Cable Lateral Raise",
  "Arnold Press", "DB Shoulder Press",
  // Arms
  "Barbell Curl", "Cable Curl", "Hammer Curl", "Incline DB Curl",
  "Tricep Pushdown", "OH Tricep Extension", "Skull Crusher", "Forearm Curl",
  // Chest
  "DB Bench Press", "Cable Fly", "Pec Deck", "Dips",
  // Core
  "Leg Raise", "Ab Wheel", "Plank", "Cable Crunch",
].sort();

export function filterExercises(query: string, extra: string[] = []): string[] {
  const all = Array.from(new Set([...extra, ...COMMON_EXERCISES]));
  if (!query.trim()) return all;
  const q = query.toLowerCase();
  return all.filter((e) => e.toLowerCase().includes(q));
}
