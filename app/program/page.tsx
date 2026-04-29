import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BottomNav from "@/components/BottomNav";
import type { Program } from "@/types/database";

export default async function ProgramListPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: publicPrograms } = await supabase
    .from("programs")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (!user) {
    return (
      <div className="min-h-screen bg-bg pb-20">
        <header className="px-4 pt-12 pb-4 border-b border-border">
          <h1 className="text-xl font-bold uppercase tracking-tight">Programs</h1>
        </header>
        <main className="px-4 py-6 space-y-6">
          <div className="text-center py-4">
            <p className="text-muted text-sm mb-4">Sign in to create and follow programs.</p>
            <Link href="/auth/login" className="btn-primary inline-block px-8">Sign in</Link>
          </div>
          {(publicPrograms ?? []).length > 0 && (
            <section>
              <h2 className="text-xs text-muted uppercase tracking-widest mb-3">Discover</h2>
              <div className="space-y-2">
                {(publicPrograms ?? []).map((p) => (
                  <Link key={p.id}
                    href={p.share_slug ? `/program/${p.share_slug}` : `/program/${p.id}`}
                    className="block border border-zinc-700 rounded-lg px-4 py-3 hover:border-zinc-500 transition-colors bg-zinc-900/40">
                    <p className="font-bold text-sm">{p.title}</p>
                    {p.description && <p className="text-xs text-muted mt-0.5">{p.description}</p>}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </main>
        <BottomNav />
      </div>
    );
  }

  // Programs this user owns (created or copied via follow)
  const { data: myPrograms } = await supabase
    .from("programs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const myIds = new Set((myPrograms ?? []).map((p: Program) => p.id));

  // Public programs from other users not already owned
  const discover = (publicPrograms ?? []).filter(
    (p) => p.user_id !== user.id && !myIds.has(p.id)
  );

  return (
    <div className="min-h-screen bg-bg pb-20">
      <header className="px-4 pt-12 pb-4 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-bold uppercase tracking-tight">Programs</h1>
        <Link href="/program/new"
          className="h-9 px-4 bg-white text-black text-sm font-bold rounded-xl flex items-center">
          + New
        </Link>
      </header>

      <main className="px-4 py-4 space-y-6">

        {/* My programs */}
        {(myPrograms ?? []).length > 0 ? (
          <section>
            <h2 className="text-xs text-muted uppercase tracking-widest mb-3">My Programs</h2>
            <div className="space-y-2">
              {(myPrograms ?? []).map((p: Program) => (
                <div key={p.id} className="border border-border rounded-lg px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={p.share_slug ? `/program/${p.share_slug}` : `/program/${p.id}`}
                        className="font-bold text-sm hover:text-zinc-300">
                        {p.title}
                      </Link>
                      {p.is_public && (
                        <span className="text-[10px] text-green-400 border border-green-900 rounded px-1.5 py-0.5 leading-none">
                          public
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-muted mt-0.5 line-clamp-1">{p.description}</p>
                    )}
                  </div>
                  <Link href={`/program/${p.id}/edit`}
                    className="text-xs text-zinc-500 border border-zinc-700 rounded-lg px-3 py-1.5
                      hover:border-zinc-500 hover:text-zinc-300 transition-colors shrink-0">
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="text-center py-10">
            <p className="text-muted text-sm">No programs yet.</p>
            <p className="text-zinc-600 text-xs mt-1">Tap "+ New" to create one, or follow one from Discover below.</p>
          </div>
        )}

        {/* Discover */}
        {discover.length > 0 && (
          <section>
            <h2 className="text-xs text-muted uppercase tracking-widest mb-3">Discover</h2>
            <div className="space-y-2">
              {discover.map((p) => (
                <Link key={p.id}
                  href={p.share_slug ? `/program/${p.share_slug}` : `/program/${p.id}`}
                  className="block border border-zinc-700 rounded-lg px-4 py-3 hover:border-zinc-500 transition-colors bg-zinc-900/40">
                  <p className="font-bold text-sm">{p.title}</p>
                  {p.description && <p className="text-xs text-muted mt-0.5 line-clamp-1">{p.description}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}

      </main>
      <BottomNav />
    </div>
  );
}
