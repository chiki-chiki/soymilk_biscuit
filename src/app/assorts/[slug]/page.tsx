import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReleasePeriod, ReleaseTable } from "@/components/release-table";
import { Swatch } from "@/components/swatch";
import { getMyLogs } from "@/lib/auth";
import { getAssortDetail } from "@/lib/catalog";

export async function generateMetadata(props: PageProps<"/assorts/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const detail = await getAssortDetail(slug);
  return { title: detail?.assort.name ?? "見つかりません" };
}

export default function AssortPage(props: PageProps<"/assorts/[slug]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
      <AssortDetail params={props.params} />
    </Suspense>
  );
}

async function AssortDetail({ params }: { params: PageProps<"/assorts/[slug]">["params"] }) {
  const { slug } = await params;
  const detail = await getAssortDetail(slug);
  if (!detail) notFound();
  const { assort, releases } = detail;

  return (
    <article className="space-y-6">
      <Link href="/" className="text-sm text-accent">
        ← 一覧へ
      </Link>
      <header className="flex gap-4">
        <Swatch name={assort.name} color={assort.color} imagePath={assort.image_path} kind="assort" size={112} />
        <div>
          <h1 className="text-2xl font-bold">{assort.name}</h1>
          {assort.name_kana && <p className="text-sm text-muted">{assort.name_kana}</p>}
          {assort.description && <p className="mt-2 text-sm">{assort.description}</p>}
        </div>
      </header>

      <section className="card p-4">
        <h2 className="mb-3 font-bold">販売期</h2>
        <ReleaseTable releases={releases.map((r) => r.release)} piecesLabel="合計枚数" />
      </section>

      <section className="space-y-3">
        <h2 className="font-bold">中身（販売期ごと）</h2>
        <Suspense fallback={<Contents releases={releases} eatenIds={null} />}>
          <ContentsWithLogs releases={releases} />
        </Suspense>
      </section>

      {assort.notes && <p className="text-sm text-muted">{assort.notes}</p>}
      <p className="text-sm">
        情報の間違いや追加情報は
        <Link href={`/feedback?kind=correction&about=${encodeURIComponent(assort.name)}`} className="text-accent underline">
          こちら
        </Link>
        から。
      </p>
    </article>
  );
}

type Releases = NonNullable<Awaited<ReturnType<typeof getAssortDetail>>>["releases"];

async function ContentsWithLogs({ releases }: { releases: Releases }) {
  const logs = await getMyLogs();
  const eatenIds = logs ? new Set([...logs.values()].filter((l) => l.eaten).map((l) => l.flavor_id)) : null;
  return <Contents releases={releases} eatenIds={eatenIds} />;
}

function Contents({ releases, eatenIds }: { releases: Releases; eatenIds: Set<string> | null }) {
  if (releases.length === 0) return <p className="text-sm text-muted">記録はありません。</p>;
  return (
    <>
      {releases.map(({ release, contents }) => (
        <div key={release.id} className="card p-4">
          <p className="mb-2 text-sm font-semibold">
            <ReleasePeriod r={release} />
          </p>
          {contents.length === 0 ? (
            <p className="text-sm text-muted">中身の記録はありません。</p>
          ) : (
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {contents.map(({ flavor, pieces, notes }) => (
                <li key={flavor.id} className="flex items-center gap-2">
                  {eatenIds && <span aria-label={eatenIds.has(flavor.id) ? "食べた" : "まだ"}>{eatenIds.has(flavor.id) ? "✅" : "⬜"}</span>}
                  <Link href={`/flavors/${flavor.slug}`} className="text-accent">
                    {flavor.name}
                  </Link>
                  {pieces && <span className="text-muted">×{pieces}枚</span>}
                  {notes && <span className="text-xs text-muted">（{notes}）</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  );
}
