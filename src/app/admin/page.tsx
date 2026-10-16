import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FEEDBACK_KIND_LABELS, FEEDBACK_STATUS_LABELS, type Feedback, type FeedbackStatus } from "@/lib/types";

export const metadata: Metadata = { title: "管理" };

export default function AdminPage(props: PageProps<"/admin">) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">管理</h1>
        <Link href="/admin/catalog" className="btn">
          味・アソートを編集
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
        <FeedbackList searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function FeedbackList({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (Object.keys(FEEDBACK_STATUS_LABELS) as FeedbackStatus[]).find((s) => s === sp.status) ?? "open";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feedbacks")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const feedbacks = data as Feedback[];

  return (
    <section className="space-y-3">
      <h2 className="font-bold">フィードバック</h2>
      <nav className="flex flex-wrap gap-2 text-sm">
        {(Object.entries(FEEDBACK_STATUS_LABELS) as [FeedbackStatus, string][]).map(([s, label]) => (
          <Link key={s} href={`/admin?status=${s}`} className={`btn-ghost ${s === status ? "border-accent bg-accent-soft" : ""}`}>
            {label}
          </Link>
        ))}
      </nav>
      {feedbacks.length === 0 ? (
        <p className="card p-4 text-sm text-muted">該当するフィードバックはありません。</p>
      ) : (
        <ul className="card divide-y divide-border/60">
          {feedbacks.map((f) => (
            <li key={f.id}>
              <Link href={`/admin/feedback/${f.id}`} className="block p-3 hover:bg-accent-soft">
                <p className="text-xs text-muted">
                  {new Date(f.created_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })} ・ {FEEDBACK_KIND_LABELS[f.kind]}
                  {f.product_name && ` ・ ${f.product_name}`}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm">{f.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
