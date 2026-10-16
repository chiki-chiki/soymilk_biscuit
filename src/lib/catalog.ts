import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "./supabase/public";
import type { Assort, AssortContent, AssortRelease, Flavor, FlavorRelease, ReleaseFields } from "./types";

export const CATALOG_TAG = "catalog";

export type Catalog = {
  flavors: Flavor[];
  assorts: Assort[];
  flavorReleases: FlavorRelease[];
  assortReleases: AssortRelease[];
  assortContents: AssortContent[];
};

/**
 * カタログ全体を読む。件数は多くても数百件なので、一括で読んでサーバーのメモリ上で検索する。
 * 管理画面で更新したら updateTag(CATALOG_TAG) で破棄する。
 */
export async function getCatalog(): Promise<Catalog> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const db = createPublicClient();
  const [flavors, assorts, flavorReleases, assortReleases, assortContents] = await Promise.all([
    db.from("flavors").select("*").order("name_kana"),
    db.from("assorts").select("*").order("name_kana"),
    db.from("flavor_releases").select("*").order("started_on", { nullsFirst: false }),
    db.from("assort_releases").select("*").order("started_on", { nullsFirst: false }),
    db.from("assort_contents").select("*"),
  ]);
  for (const r of [flavors, assorts, flavorReleases, assortReleases, assortContents]) {
    if (r.error) throw r.error;
  }
  return {
    flavors: flavors.data as Flavor[],
    assorts: assorts.data as Assort[],
    flavorReleases: flavorReleases.data as FlavorRelease[],
    assortReleases: assortReleases.data as AssortRelease[],
    assortContents: assortContents.data as AssortContent[],
  };
}

// ---------------------------------------------------------------------------
// 一覧用の要約
// ---------------------------------------------------------------------------

export type CatalogItem = {
  kind: "flavor" | "assort";
  id: string;
  slug: string;
  name: string;
  name_kana: string | null;
  description: string | null;
  color: string | null;
  image_path: string | null;
  assort_only: boolean;
  releases: ReleaseFields[];
  /** 最初の発売年（不明なら null） */
  firstYear: number | null;
  years: number[];
  onSale: boolean;
  /** 味: 収録されているアソート名 / アソート: 中身の味名（検索用） */
  relatedNames: string[];
  /** アソート: 中身の味 ID（食べた判定用） */
  flavorIds: string[];
};

function releaseYears(releases: ReleaseFields[]): number[] {
  const years = new Set<number>();
  for (const r of releases) {
    const start = r.started_on ? Number(r.started_on.slice(0, 4)) : null;
    const end = r.ended_on ? Number(r.ended_on.slice(0, 4)) : null;
    if (start && end) for (let y = start; y <= end; y++) years.add(y);
    else if (start) years.add(start);
    else if (end) years.add(end);
  }
  return [...years].sort((a, b) => a - b);
}

export function summarizeCatalog(c: Catalog): CatalogItem[] {
  const flavorById = new Map(c.flavors.map((f) => [f.id, f]));
  const assortById = new Map(c.assorts.map((a) => [a.id, a]));
  const assortReleaseById = new Map(c.assortReleases.map((r) => [r.id, r]));

  const flavorItems = c.flavors.map<CatalogItem>((f) => {
    const releases = c.flavorReleases.filter((r) => r.flavor_id === f.id);
    const assortNames = new Set<string>();
    for (const content of c.assortContents) {
      if (content.flavor_id !== f.id) continue;
      const release = assortReleaseById.get(content.assort_release_id);
      const assort = release && assortById.get(release.assort_id);
      if (assort) assortNames.add(assort.name);
    }
    const years = releaseYears(releases);
    return {
      kind: "flavor",
      ...f,
      releases,
      firstYear: years[0] ?? null,
      years,
      onSale: releases.some((r) => r.on_sale),
      relatedNames: [...assortNames],
      flavorIds: [f.id],
    };
  });

  const assortItems = c.assorts.map<CatalogItem>((a) => {
    const releases = c.assortReleases.filter((r) => r.assort_id === a.id);
    const releaseIds = new Set(releases.map((r) => r.id));
    const flavorIds = [
      ...new Set(c.assortContents.filter((x) => releaseIds.has(x.assort_release_id)).map((x) => x.flavor_id)),
    ];
    const years = releaseYears(releases);
    return {
      kind: "assort",
      ...a,
      assort_only: false,
      releases,
      firstYear: years[0] ?? null,
      years,
      onSale: releases.some((r) => r.on_sale),
      relatedNames: flavorIds.map((id) => flavorById.get(id)?.name).filter((n): n is string => !!n),
      flavorIds,
    };
  });

  return [...flavorItems, ...assortItems];
}

// ---------------------------------------------------------------------------
// 詳細ページ用
// ---------------------------------------------------------------------------

export async function getFlavorDetail(slug: string) {
  const c = await getCatalog();
  const flavor = c.flavors.find((f) => f.slug === slug);
  if (!flavor) return null;
  const releases = c.flavorReleases.filter((r) => r.flavor_id === flavor.id);
  const assortById = new Map(c.assorts.map((a) => [a.id, a]));
  const appearances = c.assortContents
    .filter((x) => x.flavor_id === flavor.id)
    .map((x) => {
      const release = c.assortReleases.find((r) => r.id === x.assort_release_id)!;
      return { assort: assortById.get(release.assort_id)!, release, pieces: x.pieces };
    })
    .sort((a, b) => (a.release.started_on ?? "9999").localeCompare(b.release.started_on ?? "9999"));
  return { flavor, releases, appearances };
}

export async function getAssortDetail(slug: string) {
  const c = await getCatalog();
  const assort = c.assorts.find((a) => a.slug === slug);
  if (!assort) return null;
  const flavorById = new Map(c.flavors.map((f) => [f.id, f]));
  const releases = c.assortReleases
    .filter((r) => r.assort_id === assort.id)
    .map((release) => ({
      release,
      contents: c.assortContents
        .filter((x) => x.assort_release_id === release.id)
        .map((x) => ({ flavor: flavorById.get(x.flavor_id)!, pieces: x.pieces, notes: x.notes })),
    }));
  return { assort, releases };
}
