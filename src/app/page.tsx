import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BiscuitArt, MiniBiscuit, Swatch } from "@/components/swatch";
import { getMyLogs } from "@/lib/auth";
import { getCatalog, summarizeCatalog, type CatalogItem } from "@/lib/catalog";
import { filterCatalog, isEaten, parseFilter, type CatalogFilter } from "@/lib/filter";
import { formatPartialDate } from "@/lib/format";
import { shortName } from "@/lib/search";

export default function Home(props: PageProps<"/">) {
  return (
    <div className="space-y-10">
      <Hero />
      <Suspense fallback={<p className="text-sm text-ink-soft">読み込んでいます…</p>}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

/** 袋の表のような見出し。2段ずらしの大きな文字、ビスケット、隅の斜めの帯 */
function Hero() {
  return (
    <section className="relative overflow-hidden rounded-[28px] bg-paper/70 px-5 pt-8 pb-20 sm:px-10 sm:pt-10 sm:pb-14">
      <h1 className="display text-[clamp(2.75rem,10vw,5.5rem)] leading-[1.05]">
        <span className="block">豆乳ビスケット</span>
        <span className="block pl-[1.4em]">図鑑</span>
      </h1>
      <p className="mt-5 max-w-[34em] text-sm sm:text-base">
        カルディの豆乳ビスケットの、味とアソートを記録しています。いつ出たか、いくらで何枚入りだったか、どのアソートに入っていたかを調べられます。
      </p>
      <BiscuitArt
        burst
        size={180}
        className="pop-in pointer-events-none absolute top-6 right-6 hidden -rotate-6 md:block lg:right-16"
      />
      {/* 袋の右下の「10まい入り」のような斜めの帯 */}
      <Suspense>
        <CountBadge />
      </Suspense>
    </section>
  );
}

/** 収録数の帯。ビルド時に DB を読まないよう、アクセス時に数える */
async function CountBadge() {
  await connection();
  const { flavors, assorts } = await getCatalog();
  return (
    <p
      className="absolute right-[-52px] bottom-[22px] w-[200px] -rotate-45 bg-blue py-1.5 text-center text-sm font-bold tracking-wider text-paper"
      title={`味 ${flavors.length}種類とアソート ${assorts.length}種類`}
    >
      {flavors.length + assorts.length}しゅるい
    </p>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const filter = parseFilter(await searchParams);
  const [catalog, logs] = await Promise.all([getCatalog(), getMyLogs()]);
  const items = summarizeCatalog(catalog);
  const eatenIds = logs ? new Set([...logs.values()].filter((l) => l.eaten).map((l) => l.flavor_id)) : null;
  const results = filterCatalog(items, filter, eatenIds);
  const years = [...new Set(items.flatMap((i) => i.years))].sort((a, b) => b - a);

  return (
    <div className="space-y-8">
      <FilterForm filter={filter} years={years} loggedIn={!!logs} />
      {eatenIds && <StampCard items={items} eatenIds={eatenIds} />}
      <section aria-labelledby="results-heading" className="space-y-4">
        <h2 id="results-heading" className="text-sm font-bold text-ink-soft">
          {results.length}件
        </h2>
        {results.length === 0 ? (
          <p className="card p-6 text-sm">
            条件に合うものがありません。キーワードを短くするか、
            <Link href="/" className="link">
              絞り込みを外して
            </Link>
            ください。
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-x-3 gap-y-12 pt-10 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="min-w-0">
                <ItemTile item={item} eaten={eatenIds ? isEaten(item, eatenIds) : null} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterForm({ filter, years, loggedIn }: { filter: CatalogFilter; years: number[]; loggedIn: boolean }) {
  return (
    <form role="search" className="space-y-4">
      <div className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          キーワード
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={filter.q}
          placeholder="味やアソートの名前で探す（例: まっちゃ、缶）"
          className="min-w-0 flex-1 rounded-full border-[3px] border-blue bg-paper px-5 py-3 text-base text-ink outline-none placeholder:text-ink-soft focus:border-red"
        />
        <button className="btn px-6">さがす</button>
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Chips name="kind" legend="種類" value={filter.kind} options={[["all", "すべて"], ["flavor", "味"], ["assort", "アソート"]]} />
        <Chips name="sale" legend="販売" value={filter.sale} options={[["all", "すべて"], ["on", "販売中"], ["off", "終了"]]} />
        {loggedIn && (
          <Chips name="eaten" legend="記録" value={filter.eaten} options={[["all", "すべて"], ["yes", "食べた"], ["no", "まだ"]]} />
        )}
        <div className="flex items-center gap-2">
          <label htmlFor="year" className="text-xs font-bold text-blue">
            販売年
          </label>
          <select id="year" name="year" defaultValue={filter.year ? String(filter.year) : ""} className="input w-auto py-1">
            <option value="">すべて</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}年
              </option>
            ))}
          </select>
        </div>
        <Link href="/" className="text-sm font-bold text-ink-soft underline underline-offset-4 hover:text-red">
          条件をクリア
        </Link>
      </div>
    </form>
  );
}

function Chips({ name, legend, value, options }: { name: string; legend: string; value: string; options: [string, string][] }) {
  return (
    <fieldset className="flex items-center gap-1.5">
      <legend className="sr-only">{legend}</legend>
      <span aria-hidden className="mr-1 text-xs font-bold text-blue">
        {legend}
      </span>
      {options.map(([v, text]) => (
        <label key={v} className="chip">
          <input type="radio" name={name} value={v} defaultChecked={value === v} className="sr-only" />
          {text}
        </label>
      ))}
    </fieldset>
  );
}

/** 食べた味の数だけビスケットに焼き色が付くスタンプカード */
function StampCard({ items, eatenIds }: { items: CatalogItem[]; eatenIds: Set<string> }) {
  const flavors = items.filter((i) => i.kind === "flavor");
  const eaten = flavors.filter((f) => eatenIds.has(f.id)).length;
  return (
    <section aria-labelledby="stamp-heading" className="card p-5">
      <h2 id="stamp-heading" className="font-bold">
        食べた味 <span className="display text-2xl">{eaten}</span>
        <span className="text-ink-soft"> / {flavors.length}種</span>
      </h2>
      <ul className="mt-3 flex flex-wrap gap-1">
        {flavors.map((f) => (
          <li key={f.id}>
            <Link href={`/flavors/${f.slug}`} className="block rounded-full hover:scale-125">
              <MiniBiscuit eaten={eatenIds.has(f.id)} title={`${f.name}（${eatenIds.has(f.id) ? "食べた" : "まだ"}）`} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 一覧のタイル。ビスケットがラベルの上からはみ出す */
function ItemTile({ item, eaten }: { item: CatalogItem; eaten: boolean | null }) {
  const href = item.kind === "flavor" ? `/flavors/${item.slug}` : `/assorts/${item.slug}`;
  const first = item.releases.find((r) => r.started_on);
  return (
    <Link
      href={href}
      className="group relative flex h-full flex-col items-center rounded-2xl bg-paper px-3 pb-4 text-center outline-offset-4 hover:bg-cream"
    >
      <div className="relative -mt-10 mb-2">
        <Swatch
          name={item.name}
          color={item.color}
          imagePath={item.image_path}
          kind={item.kind}
          size={92}
          className="drop-shadow-[0_4px_0_rgba(35,51,61,0.12)] group-hover:-rotate-6"
        />
        {eaten && (
          <span className="absolute -top-1 -right-3 grid size-12 rotate-12 place-items-center rounded-full border-2 border-red bg-paper/85 text-[11px] leading-none font-bold text-red">
            たべた
          </span>
        )}
      </div>
      <p className="text-base leading-snug font-bold">{shortName(item.name)}</p>
      <p className="mt-1 text-xs text-ink-soft">
        {first ? `${formatPartialDate(first.started_on, first.started_precision, first.started_confidence)}に登場` : "発売時期は調査中"}
      </p>
      <p className="mt-2 flex flex-wrap justify-center gap-1">
        {item.kind === "assort" && <span className="tag bg-blue-tint text-blue">アソート</span>}
        {item.assort_only && <span className="tag bg-blue-tint text-blue">アソート限定の味</span>}
        {item.onSale && <span className="tag bg-red text-on-red">販売中</span>}
      </p>
    </Link>
  );
}
