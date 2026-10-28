import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Swatch } from "@/components/swatch";
import { getMyLogs, requireUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { deleteAccount } from "./actions";

export const metadata: Metadata = { title: "マイページ" };

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
      <Account searchParams={props.searchParams} />
    </Suspense>
  );
}

async function Account({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const user = await requireUser("/account");
  const sp = await searchParams;
  const [logs, catalog] = await Promise.all([getMyLogs(), getCatalog()]);
  const flavorById = new Map(catalog.flavors.map((f) => [f.id, f]));
  const entries = [...(logs?.values() ?? [])]
    .filter((l) => flavorById.has(l.flavor_id))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div className="space-y-6">
      <h1 className="display text-3xl">マイページ</h1>
      <section className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <span>{user.email} でログイン中</span>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost">ログアウト</button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="display text-2xl">記録した味（{entries.length}件）</h2>
        {entries.length === 0 ? (
          <p className="card p-5 text-sm">
            まだ記録がありません。
            <Link href="/" className="link">
              一覧
            </Link>
            から味のページを開いて、「食べたことがある」にチェックを入れてみてください。
          </p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {entries.map((l) => {
              const f = flavorById.get(l.flavor_id)!;
              return (
                <li key={l.flavor_id}>
                  <Link href={`/flavors/${f.slug}`} className="group flex items-start gap-3 rounded-2xl bg-paper p-3 hover:bg-cream">
                    <Swatch name={f.name} color={f.color} imagePath={f.image_path} kind="flavor" size={44} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold group-hover:text-red">{f.name}</span>
                      {l.memo && <span className="mt-0.5 block text-sm text-ink-soft">{l.memo}</span>}
                    </span>
                    <span className={`tag border-2 ${l.eaten ? "rotate-6 border-red text-red" : "border-line text-ink-soft"}`}>
                      {l.eaten ? "たべた" : "まだ"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card border-2 border-danger/40 p-5">
        <h2 className="mb-2 font-bold text-danger">アカウントの削除</h2>
        <p className="mb-3 text-sm">アカウントを削除すると、食べた記録とメモもすべて消え、元に戻せません。</p>
        <form action={deleteAccount} className="flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="confirm" className="label">
              確認のため「削除」と入力してください
            </label>
            <input id="confirm" name="confirm" className="input" autoComplete="off" />
          </div>
          <button className="btn bg-danger hover:bg-danger/80">削除する</button>
        </form>
        {sp.error && <p className="mt-2 text-sm text-danger">削除できませんでした。入力内容を確認してください。</p>}
      </section>
    </div>
  );
}
