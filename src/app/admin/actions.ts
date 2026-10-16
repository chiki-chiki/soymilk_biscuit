"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { parsePartialDate } from "@/lib/format";
import { IMAGE_BUCKET } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { FeedbackStatus } from "@/lib/types";

type Kind = "flavor" | "assort";

const TABLE = { flavor: "flavors", assort: "assorts" } as const;
const RELEASE_TABLE = { flavor: "flavor_releases", assort: "assort_releases" } as const;
const PARENT_COLUMN = { flavor: "flavor_id", assort: "assort_id" } as const;

function text(fd: FormData, key: string): string | null {
  const v = String(fd.get(key) ?? "").trim();
  return v || null;
}

function int(fd: FormData, key: string): number | null {
  const v = text(fd, key);
  if (v === null) return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function back(path: string, error: string): never {
  redirect(`${path}?error=${encodeURIComponent(error)}`);
}

function adminPath(kind: Kind, slug: string) {
  return `/admin/${kind === "flavor" ? "flavors" : "assorts"}/${slug}`;
}

// ---------------------------------------------------------------------------
// 味・アソート
// ---------------------------------------------------------------------------

export async function saveItem(kind: Kind, id: string | null, formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const slug = text(formData, "slug") ?? "";
  const current = id ? adminPath(kind, String(formData.get("currentSlug"))) : adminPath(kind, "new");

  const color = text(formData, "color");
  const row: Record<string, unknown> = {
    slug,
    name: text(formData, "name"),
    name_kana: text(formData, "name_kana"),
    description: text(formData, "description"),
    notes: text(formData, "notes"),
    color: color && /^#[0-9a-f]{6}$/i.test(color) ? color.toLowerCase() : null,
  };
  if (kind === "flavor") row.assort_only = formData.get("assort_only") === "on";
  if (!row.name || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    back(current, "名前と、英小文字・数字・ハイフンの slug が必要です");
  }

  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[image.type];
    if (!ext) back(current, "画像は JPEG / PNG / WebP にしてください");
    const path = `${TABLE[kind]}/${slug}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, image, { contentType: image.type });
    if (error) back(current, `画像をアップロードできませんでした: ${error.message}`);
    row.image_path = path;
  }
  if (formData.get("remove_image") === "on") row.image_path = null;

  const { error } = id
    ? await supabase.from(TABLE[kind]).update(row).eq("id", id)
    : await supabase.from(TABLE[kind]).insert(row);
  if (error) back(current, error.code === "23505" ? "その slug は使われています" : error.message);

  updateTag(CATALOG_TAG);
  redirect(adminPath(kind, slug));
}

export async function deleteItem(kind: Kind, id: string, slug: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from(TABLE[kind]).delete().eq("id", id);
  if (error) {
    back(adminPath(kind, slug), error.code === "23503" ? "アソートの中身に使われているため削除できません" : error.message);
  }
  updateTag(CATALOG_TAG);
  redirect("/admin/catalog");
}

// ---------------------------------------------------------------------------
// 販売期
// ---------------------------------------------------------------------------

export async function saveRelease(kind: Kind, parentId: string, parentSlug: string, releaseId: string | null, formData: FormData) {
  await requireAdmin();
  const path = adminPath(kind, parentSlug);

  const started = parsePartialDate(String(formData.get("started") ?? ""));
  const ended = parsePartialDate(String(formData.get("ended") ?? ""));
  if (started === undefined || ended === undefined) back(path, "日付は 2023 / 2023-10 / 2023-10-05 の形で入力してください");

  const price = int(formData, "price");
  const priceTax = text(formData, "price_tax");
  const code = text(formData, "code");
  if (!code) back(path, "販売期コードが必要です");

  const row = {
    code,
    [PARENT_COLUMN[kind]]: parentId,
    started_on: started?.date ?? null,
    started_precision: started?.precision ?? null,
    started_confidence: formData.get("started_confidence") === "confirmed" ? "confirmed" : "estimated",
    ended_on: ended?.date ?? null,
    ended_precision: ended?.precision ?? null,
    ended_confidence: formData.get("ended_confidence") === "confirmed" ? "confirmed" : "estimated",
    on_sale: formData.get("on_sale") === "on",
    price,
    price_tax: price === null ? null : priceTax === "excluded" || priceTax === "unknown" ? priceTax : "included",
    pieces: int(formData, "pieces"),
    renewal_note: text(formData, "renewal_note"),
    source_urls: String(formData.get("source_urls") ?? "")
      .split(/\s+/)
      .filter((u) => /^https?:\/\//.test(u)),
    notes: text(formData, "notes"),
  };

  const supabase = await createClient();
  const { error } = releaseId
    ? await supabase.from(RELEASE_TABLE[kind]).update(row).eq("id", releaseId)
    : await supabase.from(RELEASE_TABLE[kind]).insert(row);
  if (error) back(path, error.code === "23505" ? "その販売期コードは使われています" : error.message);

  updateTag(CATALOG_TAG);
  redirect(path);
}

export async function deleteRelease(kind: Kind, releaseId: string, parentSlug: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from(RELEASE_TABLE[kind]).delete().eq("id", releaseId);
  if (error) back(adminPath(kind, parentSlug), error.message);
  updateTag(CATALOG_TAG);
  redirect(adminPath(kind, parentSlug));
}

/** アソート販売期の中身を、フォームの行（flavor_0, pieces_0, ...）で置き換える */
export async function saveAssortContents(releaseId: string, assortSlug: string, formData: FormData) {
  await requireAdmin();
  const path = adminPath("assort", assortSlug);
  const rows = new Map<
    string,
    { assort_release_id: string; flavor_id: string; pieces: number | null; source_urls: string[]; notes: string | null }
  >();
  for (let i = 0; formData.has(`flavor_${i}`); i++) {
    const flavorId = text(formData, `flavor_${i}`);
    if (!flavorId) continue;
    rows.set(flavorId, {
      assort_release_id: releaseId,
      flavor_id: flavorId,
      pieces: int(formData, `pieces_${i}`),
      source_urls: String(formData.get(`sources_${i}`) ?? "")
        .split(/\s+/)
        .filter((u) => /^https?:\/\//.test(u)),
      notes: text(formData, `notes_${i}`),
    });
  }

  const supabase = await createClient();
  const del = await supabase.from("assort_contents").delete().eq("assort_release_id", releaseId);
  if (del.error) back(path, del.error.message);
  if (rows.size > 0) {
    const ins = await supabase.from("assort_contents").insert([...rows.values()]);
    if (ins.error) back(path, ins.error.message);
  }
  updateTag(CATALOG_TAG);
  redirect(path);
}

// ---------------------------------------------------------------------------
// フィードバック
// ---------------------------------------------------------------------------

const STATUSES: FeedbackStatus[] = ["open", "in_progress", "resolved", "rejected"];

export async function updateFeedback(id: string, formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!STATUSES.includes(status as FeedbackStatus)) back(`/admin/feedback/${id}`, "状態が不正です");

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedbacks")
    .update({
      status,
      admin_note: text(formData, "admin_note"),
      related_flavor_id: text(formData, "related_flavor_id"),
      related_assort_id: text(formData, "related_assort_id"),
    })
    .eq("id", id);
  if (error) back(`/admin/feedback/${id}`, error.message);
  redirect("/admin");
}
