"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSlug } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import type { Profile, Program } from "@/types/database";

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/auth/login"); return; }
      setUserId(user.id);

      const { data: prof } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (prof) {
        setProfile(prof);
        setUsername(prof.username ?? "");
        setDisplayName(prof.display_name ?? "");
      }

      const { data: myPrograms } = await supabase
        .from("programs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setPrograms(myPrograms ?? []);
      setLoading(false);
    }
    load();
  }, [router, supabase]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    setProfileMsg(null);

    const { error } = await supabase
      .from("profiles")
      .upsert({ id: userId, username, display_name: displayName });

    setProfileMsg(error ? `error: ${error.message}` : "saved!");
    setSavingProfile(false);
  }

  async function togglePublic(program: Program) {
    const newSlug = !program.is_public && !program.share_slug
      ? generateSlug(program.title)
      : program.share_slug;

    const { data } = await supabase
      .from("programs")
      .update({ is_public: !program.is_public, share_slug: newSlug })
      .eq("id", program.id)
      .select()
      .single();

    if (data) {
      setPrograms((prev) => prev.map((p) => (p.id === program.id ? data : p)));
    }
  }

  function copyShareLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/program/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function searchUsers() {
    if (!searchQuery.trim()) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", `%${searchQuery}%`)
      .neq("id", userId)
      .limit(10);
    setSearchResults(data ?? []);
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center text-muted text-sm">
        loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      <header className="px-4 pt-12 pb-4 border-b border-border flex items-center justify-between">
        <h1 className="text-xl font-bold uppercase tracking-tight">Profile</h1>
        <button onClick={signOut} className="text-xs text-muted hover:text-fg">sign out</button>
      </header>

      <main className="px-4 py-4 space-y-8">
        {/* Profile form */}
        <section>
          <h2 className="text-xs text-muted uppercase tracking-widest mb-3">Account</h2>
          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className="block text-xs text-muted mb-1 uppercase tracking-widest">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                className="input-field"
                placeholder="your_handle"
                maxLength={30}
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1 uppercase tracking-widest">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="Raymond"
                maxLength={50}
              />
            </div>
            {profileMsg && (
              <p className={`text-xs ${profileMsg.startsWith("error") ? "text-red-400" : "text-green-400"}`}>
                {profileMsg}
              </p>
            )}
            <button type="submit" disabled={savingProfile} className="btn-primary w-full">
              {savingProfile ? "saving..." : "SAVE PROFILE"}
            </button>
          </form>
        </section>

        {/* My programs */}
        <section>
          <h2 className="text-xs text-muted uppercase tracking-widest mb-3">My Programs</h2>
          {programs.length === 0 ? (
            <p className="text-muted text-sm">no programs yet — follow one from the Program tab.</p>
          ) : (
            <div className="space-y-2">
              {programs.map((p) => (
                <div key={p.id} className="border border-border rounded-lg p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate">{p.title}</p>
                      {p.is_public && p.share_slug && (
                        <p className="text-xs text-muted mt-0.5 truncate">
                          /program/{p.share_slug}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.is_public && p.share_slug && (
                        <button
                          onClick={() => copyShareLink(p.share_slug!)}
                          className="text-xs text-zinc-400 hover:text-fg"
                        >
                          {copiedSlug === p.share_slug ? "✓ copied" : "copy link"}
                        </button>
                      )}
                      <button
                        onClick={() => togglePublic(p)}
                        className={`text-xs border rounded px-2 py-1 transition-colors ${
                          p.is_public
                            ? "border-green-800 text-green-400 hover:bg-green-900/20"
                            : "border-zinc-700 text-muted hover:border-zinc-500"
                        }`}
                      >
                        {p.is_public ? "public" : "private"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Find friends */}
        <section>
          <h2 className="text-xs text-muted uppercase tracking-widest mb-3">Find Users</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUsers()}
              className="input-field flex-1"
              placeholder="search by username"
            />
            <button onClick={searchUsers} className="btn-ghost px-4">
              search
            </button>
          </div>
          {searchResults.length > 0 && (
            <div className="mt-3 space-y-2">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between border border-border rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-bold">@{u.username}</p>
                    {u.display_name && <p className="text-xs text-muted">{u.display_name}</p>}
                  </div>
                  <a
                    href={`/program?user=${u.id}`}
                    className="text-xs text-zinc-400 hover:text-fg"
                  >
                    view programs →
                  </a>
                </div>
              ))}
            </div>
          )}
          {searchQuery && searchResults.length === 0 && (
            <p className="text-xs text-muted mt-2">no users found</p>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
