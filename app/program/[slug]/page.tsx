import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProgramView from "@/components/ProgramView";
import BottomNav from "@/components/BottomNav";
import type { ProgramWithWeeks } from "@/types/database";

interface Props {
  params: { slug: string };
}

export default async function ProgramDetailPage({ params }: Props) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Try by share_slug first, then by UUID
  const isUuid = /^[0-9a-f-]{36}$/i.test(params.slug);
  const query = supabase
    .from("programs")
    .select(`
      *,
      weeks (
        *,
        days (
          *,
          lifts ( * )
        )
      )
    `);

  const { data: program } = isUuid
    ? await query.eq("id", params.slug).single()
    : await query.eq("share_slug", params.slug).single();

  if (!program) notFound();

  // Sort weeks → days → lifts
  const sorted: ProgramWithWeeks = {
    ...program,
    weeks: (program.weeks ?? [])
      .sort((a: any, b: any) => a.week_number - b.week_number)
      .map((w: any) => ({
        ...w,
        days: (w.days ?? [])
          .sort((a: any, b: any) => a.day_number - b.day_number)
          .map((d: any) => ({
            ...d,
            lifts: (d.lifts ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
          })),
      })),
  };

  // Check if the current user is following this program
  let isFollowing = false;
  if (user) {
    const { data: follow } = await supabase
      .from("program_follows")
      .select("id")
      .eq("user_id", user.id)
      .eq("program_id", program.id)
      .single();
    isFollowing = !!follow;
  }

  return (
    <div className="min-h-screen bg-bg pb-20">
      <ProgramView
        program={sorted}
        userId={user?.id ?? null}
        isFollowing={isFollowing}
      />
      <BottomNav />
    </div>
  );
}
