"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { syncPendingLogs, getPendingLogs } from "@/lib/offline";
import WeekAccordion from "./WeekAccordion";
import LogModal from "./LogModal";
import type { ProgramWithWeeks, Lift } from "@/types/database";

interface Props {
  program: ProgramWithWeeks;
  userId: string | null;
  isFollowing: boolean;
}

export default function ProgramView({ program, userId, isFollowing }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [activeLift, setActiveLift] = useState<Lift | null>(null);
  const [activeWeek, setActiveWeek] = useState(1);
  const [activeDay, setActiveDay] = useState(1);
  const [loggedIds, setLoggedIds] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState(isFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setPendingCount(getPendingLogs().length);
  }, []);

  // Load existing logs for this user
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("logs")
      .select("lift_id")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) setLoggedIds(new Set(data.map((l) => l.lift_id)));
      });
  }, [userId, supabase]);

  // Sync offline logs when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      if (!userId) return;
      const { synced } = await syncPendingLogs(supabase);
      if (synced > 0) {
        setPendingCount(0);
        router.refresh();
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [userId, supabase, router]);

  const handleLiftTap = useCallback((lift: Lift) => {
    if (!userId) {
      router.push("/auth/login");
      return;
    }
    // Determine which week/day this lift belongs to
    for (const week of program.weeks) {
      for (const day of week.days) {
        if (day.lifts.some((l) => l.id === lift.id)) {
          setActiveWeek(week.week_number);
          setActiveDay(day.day_number);
        }
      }
    }
    setActiveLift(lift);
  }, [userId, program.weeks, router]);

  const handleLogged = useCallback((liftId: string) => {
    setLoggedIds((prev) => new Set([...prev, liftId]));
  }, []);

  async function handleFollow() {
    if (!userId) { router.push("/auth/login"); return; }
    setFollowLoading(true);

    const { data, error } = await supabase.rpc("copy_program_for_user", {
      source_program_id: program.id,
      target_user_id: userId,
    });

    if (!error && data) {
      setFollowing(true);
      router.push("/program");
    }
    setFollowLoading(false);
  }

  function handleShare() {
    if (!program.share_slug) return;
    const url = `${window.location.origin}/program/${program.share_slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div>
      {/* Program header */}
      <div className="px-4 py-4 border-b border-border">
        <h1 className="text-xl font-bold uppercase tracking-tight">{program.title}</h1>
        {program.description && (
          <p className="text-xs text-muted mt-1">{program.description}</p>
        )}
        <div className="flex gap-2 mt-3 flex-wrap">
          {!following && userId && (
            <button onClick={handleFollow} disabled={followLoading} className="btn-primary text-sm px-4">
              {followLoading ? "adding..." : "+ follow program"}
            </button>
          )}
          {following && (
            <span className="text-xs text-green-400 border border-green-900 rounded px-3 py-1.5">
              ✓ following
            </span>
          )}
          {program.share_slug && (
            <button onClick={handleShare} className="btn-ghost text-sm px-4">
              {copied ? "✓ copied!" : "share link"}
            </button>
          )}
        </div>

        {pendingCount > 0 && (
          <p className="mt-2 text-xs text-yellow-400">
            {pendingCount} log{pendingCount > 1 ? "s" : ""} queued offline — will sync when connected.
          </p>
        )}
      </div>

      {/* Weeks */}
      <div className="px-4 py-4 pb-32">
        {program.weeks
          .sort((a, b) => a.week_number - b.week_number)
          .map((week, i) => (
            <WeekAccordion
              key={week.id}
              week={week}
              loggedIds={loggedIds}
              onLiftTap={handleLiftTap}
              defaultOpen={i === 0}
            />
          ))}
      </div>

      {/* Log modal */}
      {activeLift && userId && (
        <LogModal
          lift={activeLift}
          userId={userId}
          weekNumber={activeWeek}
          dayNumber={activeDay}
          onClose={() => setActiveLift(null)}
          onLogged={handleLogged}
        />
      )}
    </div>
  );
}
