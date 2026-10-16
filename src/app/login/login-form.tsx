"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

export function LoginForm({ next, initialError }: { next: string; initialError: string | null }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState(initialError);

  const redirectTo = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  async function signInWithGoogle() {
    setError(null);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo() },
    });
    if (error) setError("Googleログインを開始できませんでした。");
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus("sending");
    const { error } = await createClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo() },
    });
    if (error) {
      setStatus("idle");
      setError("メールを送信できませんでした。時間をおいてお試しください。");
    } else {
      setStatus("sent");
    }
  }

  return (
    <div className="card space-y-5 p-5">
      <button type="button" onClick={signInWithGoogle} className="btn-ghost w-full py-2.5 font-semibold">
        Googleでログイン
      </button>
      <div className="flex items-center gap-3 text-xs text-muted">
        <span className="h-px flex-1 bg-border" />
        または
        <span className="h-px flex-1 bg-border" />
      </div>
      {status === "sent" ? (
        <p className="text-sm">
          <strong>{email}</strong> にログイン用のリンクを送りました。メールを開いてリンクを押してください。
        </p>
      ) : (
        <form onSubmit={sendMagicLink} className="space-y-3">
          <div>
            <label htmlFor="email" className="label">
              メールアドレス
            </label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" autoComplete="email" />
          </div>
          <button className="btn w-full" disabled={status === "sending"}>
            {status === "sending" ? "送信中…" : "ログインリンクを送る"}
          </button>
        </form>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
