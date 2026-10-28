import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ReleaseLabel, ReleasePeriod } from "@/components/release-table";
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
    <article className="space-y-12">
      <Link href="/" className="text-sm font-bold text-blue hover:text-red">
        一覧にもどる
      </Link>
      <header className="grid items-center gap-6 sm:grid-cols-[auto_1fr]">
        <Swatch name={assort.name} color={assort.color} imagePath={assort.image_path} kind="assort" size={168} className="mx-auto" />
        <div className="min-w-0">
          <p className="tag mb-2 bg-blue-tint text-blue">アソート</p>
          <h1 className="display text-[clamp(2rem,6vw,3.25rem)] leading-tight">{assort.name}</h1>
          {assort.name_kana && <p className="text-sm text-ink-soft">{assort.name_kana}</p>}
          {assort.description && <p className="mt-3 max-w-[36em]">{assort.description}</p>}
        </div>
      </header>

      <section aria-labelledby="releases" className="space-y-6">
        <h2 id="releases" className="display text-2xl">
          販売記録と中身
        </h2>
        {releases.length === 0 ? (
          <p className="text-sm text-ink-soft">販売期の情報はまだありません。</p>
        ) : (
          <Suspense fallback={<ReleaseList assortName={assort.name} releases={releases} eatenIds={null} />}>
            <ReleaseListWithLogs assortName={assort.name} releases={releases} />
          </Suspense>
        )}
      </section>

      {assort.notes && <p className="max-w-[40em] text-sm text-ink-soft">{assort.notes}</p>}
      <p className="text-sm">
        間違いや、ここにない情報を知っていたら
        <Link href={`/feedback?kind=correction&about=${encodeURIComponent(assort.name)}`} className="link">
          情報フォーム
        </Link>
        から教えてください。
      </p>
    </article>
  );
}

type Releases = NonNullable<Awaited<ReturnType<typeof getAssortDetail>>>["releases"];

async function ReleaseListWithLogs({ assortName, releases }: { assortName: string; releases: Releases }) {
  const logs = await getMyLogs();
  const eatenIds = logs ? new Set([...logs.values()].filter((l) => l.eaten).map((l) => l.flavor_id)) : null;
  return <ReleaseList assortName={assortName} releases={releases} eatenIds={eatenIds} />;
}

/** 販売期ごとに、左に「一括表示」、右に中身の味を並べる。新しい販売期から */
function ReleaseList({ assortName, releases, eatenIds }: { assortName: string; releases: Releases; eatenIds: Set<string> | null }) {
  const sorted = [...releases].sort((a, b) => (b.release.started_on ?? "").localeCompare(a.release.started_on ?? ""));
  return (
    <ol className="space-y-8">
      {sorted.map(({ release, contents }) => (
        <li key={release.id} className="grid gap-4 md:grid-cols-2">
          <ReleaseLabel r={release} name={assortName} piecesLabel="合計枚数" />
          <div>
            <h3 className="mb-2 text-sm font-bold">
              <ReleasePeriod r={release} /> の中身
            </h3>
            {contents.length === 0 ? (
              <p className="text-sm text-ink-soft">中身の記録はまだありません。</p>
            ) : (
              <ul className="space-y-1.5">
                {contents.map(({ flavor, pieces, notes }) => {
                  const eaten = eatenIds?.has(flavor.id);
                  return (
                    <li key={flavor.id}>
                      <Link href={`/flavors/${flavor.slug}`} className="group flex items-center gap-3 rounded-2xl bg-paper px-3 py-2 hover:bg-cream">
                        <Swatch name={flavor.name} color={flavor.color} imagePath={flavor.image_path} kind="flavor" size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold group-hover:text-red">{flavor.name}</span>
                          {notes && <span className="block text-xs text-ink-soft">{notes}</span>}
                        </span>
                        {pieces && <span className="text-sm whitespace-nowrap tabular-nums">{pieces}枚</span>}
                        {eatenIds && (
                          <span
                            className={`tag border-2 ${eaten ? "rotate-6 border-red text-red" : "border-line text-ink-soft"}`}
                          >
                            {eaten ? "たべた" : "まだ"}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
