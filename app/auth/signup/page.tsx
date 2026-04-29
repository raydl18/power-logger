"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/login` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/program");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-bg">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-2">🏋️</div>
          <h1 className="text-2xl font-bold tracking-tight">CREATE ACCOUNT</h1>
          <p className="text-muted text-sm mt-1">start tracking your lifts</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs text-muted mb-1 uppercase tracking-widest">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-xs text-muted mb-1 uppercase tracking-widest">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="min. 6 characters"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm border border-red-900 bg-red-900/20 rounded px-3 py-2">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "creating account..." : "SIGN UP"}
          </button>
        </form>

        <p className="text-center text-muted text-sm mt-6">
          have an account?{" "}
          <Link href="/auth/login" className="text-fg underline">
            log in
          </Link>
        </p>

        <div className="mt-4 text-center">
          <Link href="/log" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
            continue as guest →
          </Link>
        </div>
      </div>
    </div>
  );
}
