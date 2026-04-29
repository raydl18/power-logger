import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import type { Program } from "@/types/database";

export default async function ProgramListPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Always show the default system program as a "discover" option
  const { data: defaultProgram } = await supabase
    .from("programs")
    .select("*")
    .eq("share_slug", "raymond-winter-arc")
    .single();

  if (!user) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        <header className="px-4 pt-12 pb-4 border-b border-border">
          <h1 className="text-xl font-bold uppercase tracking-tight">Programs</h1>
        </header>
        <main className="px-4 py-8 space-y-6">
          <div className="text-center py-4">
            <p className="text-muted text-sm mb-4">sign in to follow programs and track progress.</p>
            <Link href="/auth/login" className="btn-primary inline-block px-8">
              Sign in
            </Link>
          </div>

          {defaultProgram && (
            <section>
              <h2 className="text-xs text-muted uppercase tracking-widest mb-3">Discover</h2>
              <Link
                href={`/program/${defaultProgram.share_slug}`}
                className="block border border-zinc-700 rounded-lg px-4 py-3 hover:border-zinc-500 transition-colors bg-zinc-900/40"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">DEFAULT</span>
                  <p className="font-bold text-sm">{defaultProgram.title}</p>
                </div>
                {defaultProgram.description && (
                  <p className="text-xs text-muted mt-0.5">{defaultProgram.description}</p>
                )}
                <p className="text-xs text-zinc-500 mt-2">tap to view program</p>
              </Link>
            </section>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  // Fetch programs the user follows (their own copies)
  const { data: follows } = await supabase
    .from("program_follows")
    .select("program_id, start_date, programs(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const myPrograms: Program[] = (follows ?? [])
    .map((f: any) => f.programs)
    .filter(Boolean);

  const isFollowingDefault = myPrograms.some((p) => p.title === defaultProgram?.title);

  return (
    <div className="min-h-screen bg-bg pb-20">
      <header className="px-4 pt-12 pb-4 border-b border-border">
        <h1 className="text-xl font-bold uppercase tracking-tight">My Programs</h1>
      </header>

      <main className="px-4 py-4 space-y-6">
        {/* User's programs */}
        {myPrograms.length > 0 ? (
          <section>
            <h2 className="text-xs text-muted uppercase tracking-widest mb-3">Following</h2>
            <div className="space-y-2">
              {myPrograms.map((p) => (
                <Link
                  key={p.id}
                  href={p.share_slug ? `/program/${p.share_slug}` : `/program/${p.id}`}
                  className="block border border-border rounded-lg px-4 py-3 hover:border-zinc-600 transition-colors"
                >
                  <p className="font-bold text-sm">{p.title}</p>
                  {p.description && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">{p.description}</p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted text-sm">no programs yet.</p>
            <p className="text-muted text-xs mt-1">follow a program below to get started.</p>
          </div>
        )}

        {/* Default program discover */}
        {defaultProgram && !isFollowingDefault && (
          <section>
            <h2 className="text-xs text-muted uppercase tracking-widest mb-3">Discover</h2>
            <Link
              href={`/program/${defaultProgram.share_slug}`}
              className="block border border-zinc-700 rounded-lg px-4 py-3 hover:border-zinc-500 transition-colors bg-zinc-900/40"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">DEFAULT</span>
                <p className="font-bold text-sm">{defaultProgram.title}</p>
              </div>
              {defaultProgram.description && (
                <p className="text-xs text-muted mt-0.5">{defaultProgram.description}</p>
              )}
              <p className="text-xs text-zinc-500 mt-2">tap to view → follow to add to your programs</p>
            </Link>
          </section>
        )}

        {/* Create new program (stub) */}
        <section>
          <h2 className="text-xs text-muted uppercase tracking-widest mb-3">Create</h2>
          <Link
            href="/profile"
            className="block border border-dashed border-zinc-700 rounded-lg px-4 py-3 text-center hover:border-zinc-500 transition-colors"
          >
            <span className="text-muted text-sm">+ new program (via profile)</span>
          </Link>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
