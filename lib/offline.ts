"use client";

import type { Log } from "@/types/database";

const PENDING_KEY = "pending_logs";

export type PendingLog = Omit<Log, "id">;

export function queueLog(log: PendingLog): void {
  const pending = getPendingLogs();
  pending.push(log);
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export function getPendingLogs(): PendingLog[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function clearPendingLogs(): void {
  localStorage.setItem(PENDING_KEY, JSON.stringify([]));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncPendingLogs(
  supabase: { from: (table: string) => any }
): Promise<{ synced: number; error: string | null }> {
  const pending = getPendingLogs();
  if (pending.length === 0) return { synced: 0, error: null };

  const { error } = await supabase.from("logs").insert(pending);
  if (error) return { synced: 0, error: error.message };

  clearPendingLogs();
  return { synced: pending.length, error: null };
}
