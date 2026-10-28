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
    <article className="space-y-12">
      <Link href="/" className="text-sm font-bold text-blue hover:text-red">
        一覧にもどる
      </Link>
      <header className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <Swatch name={flavor.name} color={flavor.color} imagePath={flavor.image_path} kind="flavor" size={168} className="mx-auto -rotate-6" />
        <div className="min-w-0">
          {flavor.assort_only && <p className="tag mb-2 bg-blue-tint text-blue">アソート限定の味</p>}
          <h1 className="display text-[clamp(2rem,6vw,3.25rem)] leading-tight">{flavor.name}</h1>
          {flavor.name_kana && <p className="text-sm text-ink-soft">{flavor.name_kana}</p>}
          {flavor.description && <p className="mt-3 max-w-[36em]">{flavor.description}</p>}
        </div>
      </header>

      <section aria-labelledby="mylog" className="card p-5">
        <h2 id="mylog" className="mb-3 text-lg font-bold">
          あなたの記録
        </h2>
        <Suspense fallback={<p className="text-sm text-ink-soft">読み込んでいます…</p>}>
          <MyLog flavorId={flavor.id} slug={flavor.slug} />
        </Suspense>
      </section>

      {!flavor.assort_only && (
        <section aria-labelledby="releases" className="space-y-4">
          <h2 id="releases" className="display text-2xl">
            単品の販売記録
          </h2>
          <ReleaseTable releases={releases} name={flavor.name} />
        </section>
      )}

      <section aria-labelledby="appearances" className="space-y-4">
        <h2 id="appearances" className="display text-2xl">
          入っていたアソート
        </h2>
        {appearances.length === 0 ? (
          <p className="text-sm text-ink-soft">アソートに入っていた記録はありません。</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {appearances.map(({ assort, release, pieces }) => (
              <li key={release.id}>
                <Link href={`/assorts/${assort.slug}`} className="group flex items-center gap-3 rounded-2xl bg-paper p-3 hover:bg-cream">
                  <Swatch name={assort.name} color={assort.color} imagePath={assort.image_path} kind="assort" size={44} />
                  <span className="min-w-0">
                    <span className="block font-bold group-hover:text-red">{assort.name}</span>
                    <span className="block text-xs text-ink-soft">
                      <ReleasePeriod r={release} />
                      {pieces && `、${pieces}枚入り`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {flavor.notes && <p className="max-w-[40em] text-sm text-ink-soft">{flavor.notes}</p>}
      <p className="text-sm">
        間違いや、ここにない情報を知っていたら
        <Link href={`/feedback?kind=correction&about=${encodeURIComponent(flavor.name)}`} className="link">
          情報フォーム
        </Link>
        から教えてください。
      </p>
    </article>
  );
}

async function MyLog({ flavorId, slug }: { flavorId: string; slug: string }) {
  const logs = await getMyLogs();
  if (!logs) {
    return (
      <p className="text-sm">
        <Link href={`/login?next=/flavors/${slug}`} className="link">
          ログイン
        </Link>
        すると、食べたかどうかとひとことメモを残せます。記録は自分にしか見えません。
      </p>
    );
  }
  const log = logs.get(flavorId);
  return <LogForm key={log?.updated_at ?? "new"} flavorId={flavorId} slug={slug} eaten={log?.eaten ?? false} memo={log?.memo ?? ""} />;
}
