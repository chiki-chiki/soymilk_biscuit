import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { ErrorBanner, ItemForm, ReleaseForm } from "../../components";

export default function AdminFlavorPage(props: PageProps<"/admin/flavors/[slug]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted">読み込み中…</p>}>
      <Editor {...props} />
    </Suspense>
  );
}

async function Editor({ params, searchParams }: PageProps<"/admin/flavors/[slug]">) {
  await requireAdmin();
  const [{ slug }, sp, c] = await Promise.all([params, searchParams, getCatalog()]);
  const flavor = slug === "new" ? null : c.flavors.find((f) => f.slug === slug);
  if (flavor === undefined) notFound();
  const releases = flavor ? c.flavorReleases.filter((r) => r.flavor_id === flavor.id) : [];

  return (
    <div className="space-y-6">
      <Link href="/admin/catalog" className="text-sm text-accent">
        ← 一覧
      </Link>
      <h1 className="text-xl font-bold">{flavor ? `味: ${flavor.name}` : "味を追加"}</h1>
      <ErrorBanner error={sp.error} />
      <ItemForm kind="flavor" item={flavor} />
      {flavor && (
        <section className="space-y-3">
          <h2 className="font-bold">販売期</h2>
          {releases.map((r) => (
            <div key={r.id} className="card p-4">
              <ReleaseForm kind="flavor" parentId={flavor.id} parentSlug={flavor.slug} release={r} />
            </div>
          ))}
          <div className="card border-dashed p-4">
            <ReleaseForm kind="flavor" parentId={flavor.id} parentSlug={flavor.slug} release={null} />
          </div>
        </section>
      )}
    </div>
  );
}
