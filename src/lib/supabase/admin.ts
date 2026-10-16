import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * RLS を迂回する service role クライアント。
 * フィードバックの保存や管理者メールの取得など、サーバー側で権限を確認した後にだけ使う。
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
