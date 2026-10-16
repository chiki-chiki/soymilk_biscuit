"use server";

import { createHash } from "node:crypto";
import { after } from "next/server";
import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { notifyAdminsOfFeedback } from "@/lib/notify";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";
import type { Feedback } from "@/lib/types";
import { FeedbackSchema } from "./schema";

export type FeedbackState = { ok: true } | { ok: false; message: string; fieldErrors?: Record<string, string> } | null;

/** 同じ IP から1時間に送れる件数 */
const HOURLY_LIMIT = 5;

function hashIp(ip: string) {
  return createHash("sha256")
    .update(`${process.env.IP_HASH_SALT ?? ""}:${ip}`)
    .digest("hex");
}

export async function submitFeedback(_prev: FeedbackState, formData: FormData): Promise<FeedbackState> {
  // ボット除け: 人間には見えない入力欄に値が入っていたら黙って成功扱いにする
  if (formData.get("website")) return { ok: true };

  const fields = ["kind", "body", "product_name", "store", "prefecture", "seen_on", "price", "pieces", "reply_email"];
  const parsed = FeedbackSchema.safeParse(
    Object.fromEntries(fields.map((k) => [k, String(formData.get(k) ?? "")])),
  );
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { ok: false, message: "入力内容を確認してください", fieldErrors };
  }

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  const token = formData.get("cf-turnstile-response");
  if (!(await verifyTurnstile(typeof token === "string" ? token : null, ip))) {
    return { ok: false, message: "ボット判定に失敗しました。ページを再読み込みしてお試しください。" };
  }

  const db = createAdminClient();
  const ipHash = ip ? hashIp(ip) : null;
  if (ipHash) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("feedbacks")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", since);
    if ((count ?? 0) >= HOURLY_LIMIT) {
      return { ok: false, message: "送信回数の上限に達しました。しばらく時間をおいてお試しください。" };
    }
  }

  const user = await getCurrentUser();
  const { data, error } = await db
    .from("feedbacks")
    .insert({ ...parsed.data, user_id: user?.id ?? null, ip_hash: ipHash })
    .select()
    .single();
  if (error) return { ok: false, message: "送信できませんでした。時間をおいてお試しください。" };

  after(async () => {
    try {
      await notifyAdminsOfFeedback(data as Feedback);
    } catch (e) {
      console.error("フィードバック通知メールの送信に失敗しました", e);
    }
  });
  return { ok: true };
}
