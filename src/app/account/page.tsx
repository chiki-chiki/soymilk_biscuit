import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
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
      <h1 className="text-2xl font-bold">マイページ</h1>
      <section className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <span>{user.email} でログイン中</span>
        <form action="/auth/signout" method="post">
          <button className="btn-ghost">ログアウト</button>
        </form>
      </section>

      <section className="card p-4">
        <h2 className="mb-3 font-bold">記録した味（{entries.length}件）</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">まだ記録がありません。味のページから記録できます。</p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {entries.map((l) => {
              const f = flavorById.get(l.flavor_id)!;
              return (
                <li key={l.flavor_id} className="py-2">
                  <Link href={`/flavors/${f.slug}`} className="font-semibold text-accent">
                    {l.eaten ? "✅ " : "⬜ "}
                    {f.name}
                  </Link>
                  {l.memo && <p className="mt-0.5 text-muted">{l.memo}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card border-danger/40 p-4">
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
