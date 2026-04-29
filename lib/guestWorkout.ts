"use client";

const PREFIX = "pl_workout_";

export interface GuestSet {
  id: string;
  weight: number | null;
  reps: number | null;
  rpe: number | null;
  logged_at: string;
}

export interface GuestExercise {
  name: string;
  sets: GuestSet[];
}

export function getGuestDay(date: string): GuestExercise[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PREFIX + date) ?? "[]");
  } catch {
    return [];
  }
}

export function saveGuestDay(date: string, exercises: GuestExercise[]): void {
  localStorage.setItem(PREFIX + date, JSON.stringify(exercises));
}

export function addGuestSet(
  date: string,
  exerciseName: string,
  set: Omit<GuestSet, "id">
): GuestExercise[] {
  const exercises = getGuestDay(date);
  const ex = exercises.find((e) => e.name === exerciseName);
  const newSet: GuestSet = { ...set, id: crypto.randomUUID() };
  if (ex) {
    ex.sets.push(newSet);
  } else {
    exercises.push({ name: exerciseName, sets: [newSet] });
  }
  saveGuestDay(date, exercises);
  return exercises;
}

export function getAllGuestWorkoutDates(): string[] {
  if (typeof window === "undefined") return [];
  const dates: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) dates.push(key.slice(PREFIX.length));
  }
  return dates;
}
