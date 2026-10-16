import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getCatalog, type Catalog } from "@/lib/catalog";
import { saveAssortContents } from "../../actions";
import { ErrorBanner, ItemForm, ReleaseForm } from "../../components";

/** 中身フォームに追加できる空行の数 */
const EMPTY_ROWS = 3;

export default function AdminAssortPage(props: PageProps<"/admin/assorts/[slug]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
      <Editor {...props} />
    </Suspense>
  );
}

async function Editor({ params, searchParams }: PageProps<"/admin/assorts/[slug]">) {
  await requireAdmin();
  const [{ slug }, sp, c] = await Promise.all([params, searchParams, getCatalog()]);
  const assort = slug === "new" ? null : c.assorts.find((a) => a.slug === slug);
  if (assort === undefined) notFound();
  const releases = assort ? c.assortReleases.filter((r) => r.assort_id === assort.id) : [];

  return (
    <div className="space-y-6">
      <Link href="/admin/catalog" className="text-sm font-bold text-blue">
        ← 一覧
      </Link>
      <h1 className="text-xl font-bold">{assort ? `アソート: ${assort.name}` : "アソートを追加"}</h1>
      <ErrorBanner error={sp.error} />
      <ItemForm kind="assort" item={assort} />
      {assort && (
        <section className="space-y-3">
          <h2 className="font-bold text-blue">販売期</h2>
          {releases.map((r) => (
            <div key={r.id} className="card space-y-4 p-4">
              <ReleaseForm kind="assort" parentId={assort.id} parentSlug={assort.slug} release={r} />
              <ContentsForm releaseId={r.id} assortSlug={assort.slug} catalog={c} />
            </div>
          ))}
          <div className="card border-dashed p-4">
            <ReleaseForm kind="assort" parentId={assort.id} parentSlug={assort.slug} release={null} />
          </div>
        </section>
      )}
    </div>
  );
}

function ContentsForm({ releaseId, assortSlug, catalog }: { releaseId: string; assortSlug: string; catalog: Catalog }) {
  const contents = catalog.assortContents.filter((x) => x.assort_release_id === releaseId);
  const rows = [...contents, ...Array.from({ length: EMPTY_ROWS }, () => null)];
  return (
    <form action={saveAssortContents.bind(null, releaseId, assortSlug)} className="space-y-2 border-t border-border pt-3">
      <p className="text-sm font-semibold">中身（味を「なし」にすると行が消えます）</p>
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-[1fr_5rem_1fr] gap-2">
          <input type="hidden" name={`sources_${i}`} value={row?.source_urls.join(" ") ?? ""} />
          <select name={`flavor_${i}`} defaultValue={row?.flavor_id ?? ""} className="input">
            <option value="">なし</option>
            {catalog.flavors.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <input name={`pieces_${i}`} type="number" min={1} placeholder="枚数" defaultValue={row?.pieces ?? ""} className="input" />
          <input name={`notes_${i}`} placeholder="備考" defaultValue={row?.notes ?? ""} className="input" />
        </div>
      ))}
      <button className="btn-ghost">中身を保存</button>
    </form>
  );
}
