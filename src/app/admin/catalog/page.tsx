import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";

export default function AdminCatalogPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
      <CatalogList />
    </Suspense>
  );
}

async function CatalogList() {
  await requireAdmin();
  const c = await getCatalog();
  const count = (id: string, kind: "flavor" | "assort") =>
    kind === "flavor" ? c.flavorReleases.filter((r) => r.flavor_id === id).length : c.assortReleases.filter((r) => r.assort_id === id).length;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm font-bold text-blue">
        ← 管理トップ
      </Link>
      {(
        [
          ["flavor", "味", c.flavors, "/admin/flavors"],
          ["assort", "アソート", c.assorts, "/admin/assorts"],
        ] as const
      ).map(([kind, label, items, base]) => (
        <section key={kind} className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-blue">
              {label}（{items.length}）
            </h2>
            <Link href={`${base}/new`} className="btn">
              ＋ {label}を追加
            </Link>
          </div>
          <ul className="card divide-y divide-border/60 text-sm">
            {items.map((x) => (
              <li key={x.id}>
                <Link href={`${base}/${x.slug}`} className="flex justify-between gap-2 p-3 hover:bg-accent-soft">
                  <span>{x.name}</span>
                  <span className="text-muted">
                    {x.slug} ・ 販売期{count(x.id, kind)}件
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
