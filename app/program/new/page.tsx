import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProgramBuilder from "@/components/ProgramBuilder";
import BottomNav from "@/components/BottomNav";

export default async function NewProgramPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  return (
    <>
      <ProgramBuilder userId={user.id} />
      <BottomNav />
    </>
  );
}
