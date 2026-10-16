"use server";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** アカウントを削除する。食べた記録とメモも一緒に消える（外部キーの cascade） */
export async function deleteAccount(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (formData.get("confirm") !== "削除") redirect("/account?error=confirm");

  const { error } = await createAdminClient().auth.admin.deleteUser(user.id);
  if (error) redirect("/account?error=delete");
  await (await createClient()).auth.signOut();
  redirect("/");
}
