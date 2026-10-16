import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReleasePeriod, ReleaseTable } from "@/components/release-table";
import { Swatch } from "@/components/swatch";
import { getMyLogs } from "@/lib/auth";
import { getFlavorDetail } from "@/lib/catalog";
import { LogForm } from "../log-form";

export async function generateMetadata(props: PageProps<"/flavors/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = await getFlavorDetail(slug);
  return { title: detail?.flavor.name ?? "見つかりません" };
}

export default function FlavorPage(props: PageProps<"/flavors/[slug]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
      <FlavorDetail params={props.params} />
    </Suspense>
  );
}

async function FlavorDetail({ params }: { params: PageProps<"/flavors/[slug]">["params"] }) {
  const { slug } = await params;
  const detail = await getFlavorDetail(slug);
  if (!detail) notFound();
  const { flavor, releases, appearances } = detail;

  return (
    <article className="space-y-6">
      <Link href="/" className="text-sm font-bold text-blue">
        ← 一覧へ
      </Link>
      <header className="flex gap-4">
        <Swatch name={flavor.name} color={flavor.color} imagePath={flavor.image_path} kind="flavor" size={112} />
        <div>
          <h1 className="display text-3xl">{flavor.name}</h1>
          {flavor.name_kana && <p className="text-sm text-muted">{flavor.name_kana}</p>}
          {flavor.assort_only && <p className="mt-1 text-xs">アソート限定の味</p>}
          {flavor.description && <p className="mt-2 text-sm">{flavor.description}</p>}
        </div>
      </header>

      <section className="card p-4">
        <h2 className="mb-3 font-bold text-blue">あなたの記録</h2>
        <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
          <MyLog flavorId={flavor.id} slug={flavor.slug} />
        </Suspense>
      </section>

      {!flavor.assort_only && (
        <section className="card p-4">
          <h2 className="mb-3 font-bold text-blue">単品の販売期</h2>
          <ReleaseTable releases={releases} />
        </section>
      )}

      <section className="card p-4">
        <h2 className="mb-3 font-bold text-blue">この味が入っていたアソート</h2>
        {appearances.length === 0 ? (
          <p className="text-sm text-muted">記録はありません。</p>
        ) : (
          <ul className="divide-y divide-border/60 text-sm">
            {appearances.map(({ assort, release, pieces }) => (
              <li key={release.id} className="flex flex-wrap justify-between gap-2 py-2">
                <Link href={`/assorts/${assort.slug}`} className="font-semibold text-accent">
                  {assort.name}
                </Link>
                <span className="text-muted">
                  <ReleasePeriod r={release} />
                  {pieces && ` ・ ${pieces}枚入り`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {flavor.notes && <p className="text-sm text-muted">{flavor.notes}</p>}
      <p className="text-sm">
        情報の間違いや追加情報は
        <Link href={`/feedback?kind=correction&about=${encodeURIComponent(flavor.name)}`} className="text-accent underline">
          こちら
        </Link>
        から。
      </p>
    </article>
  );
}

async function MyLog({ flavorId, slug }: { flavorId: string; slug: string }) {
  const logs = await getMyLogs();
  if (!logs) {
    return (
      <p className="text-sm">
        <Link href={`/login?next=/flavors/${slug}`} className="text-accent underline">
          ログイン
        </Link>
        すると、食べた記録とメモを残せます。
      </p>
    );
  }
  const log = logs.get(flavorId);
  return <LogForm key={log?.updated_at ?? "new"} flavorId={flavorId} slug={slug} eaten={log?.eaten ?? false} memo={log?.memo ?? ""} />;
}
