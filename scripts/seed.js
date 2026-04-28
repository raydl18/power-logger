// scripts/seed.js
// Run: node scripts/seed.js
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local

require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars. Check .env.local has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ============================================================
// Program data: 4-Week Powerlifting Block
// Baseline: 275lb bench / 315lb squat
// RPE wave: W1=6, W2=7, W3=8, W4=9 (Day 1 W4 is recovery @4)
// ============================================================

const WEEKS = [
  { weekNumber: 1, label: "Week 1 — RPE 6", rpe: 6 },
  { weekNumber: 2, label: "Week 2 — RPE 7", rpe: 7 },
  { weekNumber: 3, label: "Week 3 — RPE 8", rpe: 8 },
  { weekNumber: 4, label: "Week 4 — RPE 9", rpe: 9 },
];

// Per-week top set / back-off / volume weights
const DAY1_DATA = [
  { topWeight: 210, backoffWeight: 185, rpe: 6 },
  { topWeight: 220, backoffWeight: 195, rpe: 7 },
  { topWeight: 230, backoffWeight: 205, rpe: 8 },
  { topWeight: 215, backoffWeight: 185, rpe: 4 }, // recovery
];

const DAY2_DATA = [
  { topWeight: 205, backoffWeight: 190, volWeight: 175, rpe: 6 },
  { topWeight: 225, backoffWeight: 205, volWeight: 185, rpe: 7 },
  { topWeight: 240, backoffWeight: 220, volWeight: 195, rpe: 8 },
  { topWeight: 255, backoffWeight: 230, volWeight: 195, rpe: 9 },
];

const DAY3_SQUAT_DATA = [
  { topWeight: 255, backoffWeight: 225, volWeight: 200, rpe: 6 },
  { topWeight: 270, backoffWeight: 240, volWeight: 215, rpe: 7 },
  { topWeight: 285, backoffWeight: 250, volWeight: 225, rpe: 8 },
  { topWeight: 300, backoffWeight: 265, volWeight: 235, rpe: 9 },
];

const DAY3_BENCH_DATA = [
  { topWeight: 195, volWeight: 170, rpe: 6 },
  { topWeight: 210, volWeight: 180, rpe: 7 },
  { topWeight: 225, volWeight: 185, rpe: 8 },
  { topWeight: 235, volWeight: 190, rpe: 9 },
];

const DAY5_OHP_DATA = [
  { topWeight: 105, backoffWeight: 80, rpe: 6 },
  { topWeight: 110, backoffWeight: 85, rpe: 7 },
  { topWeight: 115, backoffWeight: 90, rpe: 8 },
  { topWeight: 120, backoffWeight: 95, rpe: 9 },
];

const DAY5_PAUSE_BENCH_DATA = [
  { weight: 185, rpe: 6 },
  { weight: 195, rpe: 7 },
  { weight: 205, rpe: 8 },
  { weight: 215, rpe: 9 },
];

function day1Lifts(wIdx) {
  const d = DAY1_DATA[wIdx];
  return [
    { name: "Pause Squat", prescribed_sets: 1, prescribed_reps: 4, prescribed_weight: d.topWeight, prescribed_rpe: d.rpe, notes: "2-second pause at bottom", order_index: 0 },
    { name: "Pause Squat (back-off)", prescribed_sets: 2, prescribed_reps: 5, prescribed_weight: d.backoffWeight, prescribed_rpe: null, notes: null, order_index: 1 },
    { name: "Back Extensions", prescribed_sets: 3, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 2 },
    { name: "Leg Extensions", prescribed_sets: 2, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 3 },
    { name: "Hamstring Curls", prescribed_sets: 3, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 4 },
    { name: "Hip Abduction", prescribed_sets: 2, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 5 },
    { name: "Face Pulls", prescribed_sets: 3, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 6 },
  ];
}

function day2Lifts(wIdx) {
  const d = DAY2_DATA[wIdx];
  return [
    { name: "Bench Press", prescribed_sets: 1, prescribed_reps: 3, prescribed_weight: d.topWeight, prescribed_rpe: d.rpe, notes: "Competition grip", order_index: 0 },
    { name: "Bench Press (back-off)", prescribed_sets: 1, prescribed_reps: 3, prescribed_weight: d.backoffWeight, prescribed_rpe: null, notes: null, order_index: 1 },
    { name: "Bench Press (volume)", prescribed_sets: 2, prescribed_reps: 5, prescribed_weight: d.volWeight, prescribed_rpe: null, notes: null, order_index: 2 },
    { name: "Weighted Pullups", prescribed_sets: 3, prescribed_reps: 5, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 3 },
    { name: "Incline Bench", prescribed_sets: 2, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 4 },
    { name: "Barbell Row", prescribed_sets: 2, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 5 },
    { name: "Machine Laterals", prescribed_sets: 3, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 6 },
    { name: "Cable Curl", prescribed_sets: 2, prescribed_reps: 6, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 7 },
    { name: "Forearm Curl", prescribed_sets: 2, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 8 },
  ];
}

function day3Lifts(wIdx) {
  const s = DAY3_SQUAT_DATA[wIdx];
  const b = DAY3_BENCH_DATA[wIdx];
  return [
    { name: "Squat", prescribed_sets: 1, prescribed_reps: 3, prescribed_weight: s.topWeight, prescribed_rpe: s.rpe, notes: "Competition depth", order_index: 0 },
    { name: "Squat (back-off)", prescribed_sets: 1, prescribed_reps: 3, prescribed_weight: s.backoffWeight, prescribed_rpe: null, notes: null, order_index: 1 },
    { name: "Squat (volume)", prescribed_sets: 2, prescribed_reps: 5, prescribed_weight: s.volWeight, prescribed_rpe: null, notes: null, order_index: 2 },
    { name: "Bench Press", prescribed_sets: 1, prescribed_reps: 4, prescribed_weight: b.topWeight, prescribed_rpe: b.rpe, notes: "Secondary bench — touch and go", order_index: 3 },
    { name: "Bench Press (volume)", prescribed_sets: 2, prescribed_reps: 6, prescribed_weight: b.volWeight, prescribed_rpe: null, notes: null, order_index: 4 },
    { name: "Leg Press", prescribed_sets: 2, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 5 },
    { name: "Leg Raises", prescribed_sets: 2, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 6 },
    { name: "DB Lateral Raise", prescribed_sets: 2, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 7 },
  ];
}

function day4Lifts(wIdx) {
  const weekRpe = WEEKS[wIdx].rpe;
  return [
    { name: "RDL", prescribed_sets: 3, prescribed_reps: 6, prescribed_weight: null, prescribed_rpe: weekRpe, notes: "Full stretch at bottom", order_index: 0 },
    { name: "Weighted Pullups", prescribed_sets: 1, prescribed_reps: 3, prescribed_weight: null, prescribed_rpe: weekRpe, notes: "Heavy single back-off", order_index: 1 },
    { name: "Weighted Pullups (volume)", prescribed_sets: 2, prescribed_reps: 6, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 2 },
    { name: "Hamstring Curls", prescribed_sets: 2, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 3 },
    { name: "Barbell Row", prescribed_sets: 2, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 4 },
    { name: "Face Pulls", prescribed_sets: 3, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 5 },
  ];
}

function day5Lifts(wIdx) {
  const o = DAY5_OHP_DATA[wIdx];
  const pb = DAY5_PAUSE_BENCH_DATA[wIdx];
  return [
    { name: "OHP", prescribed_sets: 1, prescribed_reps: 4, prescribed_weight: o.topWeight, prescribed_rpe: o.rpe, notes: "Strict press", order_index: 0 },
    { name: "OHP (back-off)", prescribed_sets: 2, prescribed_reps: 6, prescribed_weight: o.backoffWeight, prescribed_rpe: null, notes: null, order_index: 1 },
    { name: "2ct Pause Bench", prescribed_sets: 3, prescribed_reps: 4, prescribed_weight: pb.weight, prescribed_rpe: pb.rpe, notes: "2-second pause on chest", order_index: 2 },
    { name: "Machine Laterals", prescribed_sets: 3, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 3 },
    { name: "Barbell Curl", prescribed_sets: 2, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 4 },
    { name: "OH Tricep Extension", prescribed_sets: 2, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 5 },
    { name: "Cable Curl", prescribed_sets: 2, prescribed_reps: 10, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 6 },
    { name: "Forearm Curl", prescribed_sets: 2, prescribed_reps: 8, prescribed_weight: null, prescribed_rpe: null, notes: null, order_index: 7 },
  ];
}

const DAY_TEMPLATES = [
  { dayNumber: 1, label: "Day 1 — Pause Squat",                 lifts: day1Lifts },
  { dayNumber: 2, label: "Day 2 — Primary Bench",               lifts: day2Lifts },
  { dayNumber: 3, label: "Day 3 — Comp Squat + Secondary Bench", lifts: day3Lifts },
  { dayNumber: 4, label: "Day 4 — RDL + Pullups",               lifts: day4Lifts },
  { dayNumber: 5, label: "Day 5 — OHP + Pause Bench",           lifts: day5Lifts },
];

async function seed() {
  console.log("🌱 Seeding default program...");

  // Check if default program already exists
  const { data: existing } = await supabase
    .from("programs")
    .select("id")
    .eq("share_slug", "raymond-winter-arc")
    .single();

  if (existing) {
    console.log("✅ Default program already exists. Skipping.");
    return;
  }

  // Create program (user_id = null → system/public program)
  const { data: program, error: progErr } = await supabase
    .from("programs")
    .insert({
      user_id: null,
      title: "Raymond's Winter Arc",
      description: "4-week powerlifting block. 275lb bench / 315lb squat baseline. Triples focus with RPE wave 6→7→8→9.",
      is_public: true,
      share_slug: "raymond-winter-arc",
    })
    .select()
    .single();

  if (progErr) {
    console.error("Error creating program:", progErr.message);
    process.exit(1);
  }
  console.log(`  ✓ Program: ${program.title} (${program.id})`);

  for (let wIdx = 0; wIdx < WEEKS.length; wIdx++) {
    const wk = WEEKS[wIdx];

    const { data: week, error: wkErr } = await supabase
      .from("weeks")
      .insert({ program_id: program.id, week_number: wk.weekNumber, label: wk.label })
      .select()
      .single();

    if (wkErr) { console.error("Week error:", wkErr.message); process.exit(1); }
    console.log(`  ✓ ${wk.label}`);

    for (const dayTpl of DAY_TEMPLATES) {
      const { data: day, error: dayErr } = await supabase
        .from("days")
        .insert({ week_id: week.id, day_number: dayTpl.dayNumber, label: dayTpl.label })
        .select()
        .single();

      if (dayErr) { console.error("Day error:", dayErr.message); process.exit(1); }

      const lifts = dayTpl.lifts(wIdx);
      const { error: liftErr } = await supabase
        .from("lifts")
        .insert(lifts.map((l) => ({ ...l, day_id: day.id })));

      if (liftErr) { console.error("Lifts error:", liftErr.message); process.exit(1); }
      console.log(`    ✓ ${dayTpl.label} (${lifts.length} lifts)`);
    }
  }

  console.log("\n✅ Seed complete!");
  console.log(`   Program slug: raymond-winter-arc`);
  console.log(`   Visit /program/raymond-winter-arc to view it.`);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
