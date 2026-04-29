import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProgramBuilder, { ExistingProgram } from "@/components/ProgramBuilder";
import BottomNav from "@/components/BottomNav";

export default async function EditProgramPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const isUuid = /^[0-9a-f-]{36}$/i.test(params.slug);
  const query = supabase.from("programs").select(`
    id, title, description, is_public, share_slug,
    weeks (
      id, week_number, label,
      days (
        id, day_number, label,
        lifts ( id, name, prescribed_sets, prescribed_reps, prescribed_weight, prescribed_rpe, notes, order_index )
      )
    )
  `).eq("user_id", user.id);

  const { data: program } = isUuid
    ? await query.eq("id", params.slug).single()
    : await query.eq("share_slug", params.slug).single();

  if (!program) notFound();

  const sorted: ExistingProgram = {
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

  return (
    <>
      <ProgramBuilder userId={user.id} existing={sorted} />
      <BottomNav />
    </>
  );
}
