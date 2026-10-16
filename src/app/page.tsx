import Link from "next/link";
import { Suspense } from "react";
import { Swatch } from "@/components/swatch";
import { getMyLogs } from "@/lib/auth";
import { getCatalog, summarizeCatalog, type CatalogItem } from "@/lib/catalog";
import { completion, filterCatalog, isEaten, parseFilter, type CatalogFilter } from "@/lib/filter";
import { formatPartialDate } from "@/lib/format";

export default function Home(props: PageProps<"/">) {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="display text-3xl sm:text-4xl">豆乳ビスケットをさがす</h1>
        <p className="mt-2 text-sm text-muted">カルディの豆乳ビスケットの、味とアソートの発売時期・価格・枚数の記録です。</p>
      </section>
      <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </div>
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
    <>
      <FilterForm filter={filter} years={years} loggedIn={!!logs} />
      {eatenIds && <Completion {...completion(items, eatenIds)} />}
      <p className="text-sm text-muted">{results.length}件</p>
      {results.length === 0 ? (
        <p className="card p-6 text-center text-sm text-muted">見つかりませんでした。キーワードを変えてみてください。</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {results.map((item) => (
            <li key={`${item.kind}-${item.id}`}>
              <ItemCard item={item} eaten={eatenIds ? isEaten(item, eatenIds) : null} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function FilterForm({ filter, years, loggedIn }: { filter: CatalogFilter; years: number[]; loggedIn: boolean }) {
  return (
    <form className="card grid gap-3 border-blue p-4 sm:grid-cols-6" role="search">
      <div className="sm:col-span-6">
        <label htmlFor="q" className="label">
          キーワード
        </label>
        <input id="q" name="q" type="search" defaultValue={filter.q} placeholder="例: まっちゃ、ココア、缶" className="input" />
      </div>
      <Select name="kind" label="種類" value={filter.kind} options={[["all", "すべて"], ["flavor", "単品の味"], ["assort", "アソート"]]} />
      <Select
        name="year"
        label="販売年"
        value={filter.year ? String(filter.year) : ""}
        options={[["", "すべて"], ...years.map((y) => [String(y), `${y}年`] as [string, string])]}
      />
      <Select name="sale" label="販売状況" value={filter.sale} options={[["all", "すべて"], ["on", "販売中"], ["off", "販売終了"]]} />
      {loggedIn && (
        <Select name="eaten" label="食べた？" value={filter.eaten} options={[["all", "すべて"], ["yes", "食べた"], ["no", "まだ"]]} />
      )}
      <div className="flex items-end gap-2 sm:col-span-2">
        <button className="btn flex-1">検索</button>
        <Link href="/" className="btn-ghost">
          クリア
        </Link>
      </div>
    </form>
  );
}

function Select({ name, label, value, options }: { name: string; label: string; value: string; options: [string, string][] }) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <select id={name} name={name} defaultValue={value} className="input">
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </div>
  );
}

function Completion({ eaten, total, percent }: { eaten: number; total: number; percent: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-bold text-blue">コンプリート率</span>
        <span>
          {eaten} / {total} 種類（{percent}%）
        </span>
      </div>
      <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-accent bg-surface">
        <div className="stripe h-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function ItemCard({ item, eaten }: { item: CatalogItem; eaten: boolean | null }) {
  const href = item.kind === "flavor" ? `/flavors/${item.slug}` : `/assorts/${item.slug}`;
  const first = item.releases.find((r) => r.started_on);
  return (
    <Link href={href} className="card flex items-center gap-3 p-3 transition hover:-translate-y-0.5 hover:border-blue">
      <Swatch name={item.name} color={item.color} imagePath={item.image_path} kind={item.kind} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="tag bg-blue-soft text-blue">{item.kind === "flavor" ? "味" : "アソート"}</span>
          {item.assort_only && <span className="tag bg-blue-soft text-blue">アソート限定</span>}
          {item.onSale && <span className="tag border-2 border-accent bg-surface text-accent">販売中</span>}
          {eaten && <span className="tag bg-success text-on-accent">食べた</span>}
        </div>
        <p className="mt-1 truncate font-bold">{item.name}</p>
        <p className="text-xs text-muted">
          {first ? `初登場 ${formatPartialDate(first.started_on, first.started_precision, first.started_confidence)}` : "発売時期不明"}
          {item.releases.length > 1 && ` ・ 販売期${item.releases.length}回`}
        </p>
      </div>
    </Link>
  );
}
