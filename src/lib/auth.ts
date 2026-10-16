import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { UserFlavorLog } from "./types";

export type CurrentUser = {
  id: string;
  email: string | null;
  isAdmin: boolean;
};

/** ログイン中のユーザー。未ログインなら null（1リクエスト内ではキャッシュされる） */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", claims.sub).maybeSingle();
  return {
    id: claims.sub,
    email: (claims.email as string | undefined) ?? null,
    isAdmin: profile?.role === "admin",
  };
});

export async function requireUser(next = "/"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (!user.isAdmin) redirect("/");
  return user;
}

/** ログイン中のユーザーの食べた記録（flavor_id → 記録）。未ログインなら null */
export async function getMyLogs(): Promise<Map<string, UserFlavorLog> | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_flavor_logs")
    .select("flavor_id, eaten, memo, updated_at")
    .eq("user_id", user.id);
  if (error) throw error;
  return new Map((data as UserFlavorLog[]).map((l) => [l.flavor_id, l]));
}
