import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, type Feedback } from "@/lib/types";
import { updateFeedback } from "../../actions";
import { ErrorBanner, Field } from "../../components";

export default function FeedbackDetailPage(props: PageProps<"/admin/feedback/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
      <Detail {...props} />
    </Suspense>
  );
}

async function Detail({ params, searchParams }: PageProps<"/admin/feedback/[id]">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const supabase = await createClient();
  const [{ data }, catalog] = await Promise.all([supabase.from("feedbacks").select("*").eq("id", id).maybeSingle(), getCatalog()]);
  if (!data) notFound();
  const f = data as Feedback;

  const rows: [string, string | number | null][] = [
    ["種別", FEEDBACK_KIND_LABELS[f.kind]],
    ["受付日時", new Date(f.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })],
    ["商品名", f.product_name],
    ["店舗", f.store],
    ["都道府県", f.prefecture],
    ["見かけた日", f.seen_on],
    ["価格（税込）", f.price],
    ["枚数", f.pieces],
    ["返信先", f.reply_email],
    ["ログインユーザー", f.user_id ? "あり" : "なし"],
  ];

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-bold text-blue">
        ← フィードバック一覧
      </Link>
      <ErrorBanner error={sp.error} />
      <section className="card p-4">
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
          {rows
            .filter(([, v]) => v !== null && v !== "")
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
        </dl>
        <p className="mt-4 text-sm whitespace-pre-wrap">{f.body}</p>
      </section>

      <form action={updateFeedback.bind(null, f.id)} className="card grid gap-3 p-4 sm:grid-cols-2">
        <Field label="状態">
          <select name="status" defaultValue={f.status} className="input">
            {Object.entries(FEEDBACK_STATUS_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div />
        <Field label="反映先の味">
          <select name="related_flavor_id" defaultValue={f.related_flavor_id ?? ""} className="input">
            <option value="">なし</option>
            {catalog.flavors.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="反映先のアソート">
          <select name="related_assort_id" defaultValue={f.related_assort_id ?? ""} className="input">
            <option value="">なし</option>
            {catalog.assorts.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="管理メモ" className="sm:col-span-2">
          <textarea name="admin_note" rows={3} defaultValue={f.admin_note ?? ""} className="input" />
        </Field>
        <div className="sm:col-span-2">
          <button className="btn">保存</button>
        </div>
      </form>
    </div>
  );
}
