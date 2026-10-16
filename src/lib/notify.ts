import "server-only";
import { Resend } from "resend";
import { createAdminClient } from "./supabase/admin";
import { FEEDBACK_KIND_LABELS, type Feedback } from "./types";

/** 管理者全員にフィードバックの通知メールを送る */
export async function notifyAdminsOfFeedback(feedback: Feedback) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.FEEDBACK_FROM_EMAIL;
  if (!apiKey || !from) {
    console.warn("RESEND_API_KEY / FEEDBACK_FROM_EMAIL が未設定のため通知メールを送りません");
    return;
  }

  const { data: admins, error } = await createAdminClient().from("profiles").select("email").eq("role", "admin");
  if (error) throw error;
  const to = admins.map((a) => a.email as string | null).filter((e): e is string => !!e);
  if (to.length === 0) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const lines = [
    `種別: ${FEEDBACK_KIND_LABELS[feedback.kind]}`,
    feedback.product_name && `商品名: ${feedback.product_name}`,
    feedback.store && `店舗: ${feedback.store}`,
    feedback.prefecture && `都道府県: ${feedback.prefecture}`,
    feedback.seen_on && `見かけた日: ${feedback.seen_on}`,
    feedback.price && `価格: ${feedback.price}円`,
    feedback.pieces && `枚数: ${feedback.pieces}枚`,
    feedback.reply_email && `返信先: ${feedback.reply_email}`,
    "",
    feedback.body,
    "",
    `管理画面: ${siteUrl}/admin/feedback/${feedback.id}`,
  ].filter((l) => typeof l === "string");

  const { error: sendError } = await new Resend(apiKey).emails.send({
    from,
    to,
    replyTo: feedback.reply_email ?? undefined,
    subject: `[豆乳ビスケット図鑑] ${FEEDBACK_KIND_LABELS[feedback.kind]}が届きました`,
    text: lines.join("\n"),
  });
  if (sendError) throw new Error(sendError.message);
}
