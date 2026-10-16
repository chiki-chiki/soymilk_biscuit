"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type LogState = { ok: boolean; message: string } | null;

const LogSchema = z.object({
  flavorId: z.uuid(),
  slug: z.string(),
  eaten: z.boolean(),
  memo: z.string().trim().max(200, "メモは200文字までです"),
});

export async function saveLog(_prev: LogState, formData: FormData): Promise<LogState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "ログインしてください" };

  const parsed = LogSchema.safeParse({
    flavorId: formData.get("flavorId"),
    slug: formData.get("slug"),
    eaten: formData.get("eaten") === "on",
    memo: formData.get("memo") ?? "",
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const { flavorId, slug, eaten, memo } = parsed.data;

  const supabase = await createClient();
  const { error } = !eaten && !memo
    ? await supabase.from("user_flavor_logs").delete().eq("user_id", user.id).eq("flavor_id", flavorId)
    : await supabase
        .from("user_flavor_logs")
        .upsert({ user_id: user.id, flavor_id: flavorId, eaten, memo: memo || null });
  if (error) return { ok: false, message: "保存できませんでした" };

  revalidatePath(`/flavors/${slug}`);
  revalidatePath("/");
  return { ok: true, message: "保存しました" };
}
