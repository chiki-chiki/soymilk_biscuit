import type { CatalogItem } from "./catalog";
import { matchesKeyword } from "./search";

export type CatalogFilter = {
  q: string;
  kind: "all" | "flavor" | "assort";
  year: number | null;
  sale: "all" | "on" | "off";
  eaten: "all" | "yes" | "no";
};

type SearchParams = Record<string, string | string[] | undefined>;

function one(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v) ?? "";
}

function pick<T extends string>(v: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

export function parseFilter(sp: SearchParams): CatalogFilter {
  const year = Number(one(sp.year));
  return {
    q: one(sp.q).slice(0, 100),
    kind: pick(one(sp.kind), ["all", "flavor", "assort"], "all"),
    year: Number.isInteger(year) && year > 1900 ? year : null,
    sale: pick(one(sp.sale), ["all", "on", "off"], "all"),
    eaten: pick(one(sp.eaten), ["all", "yes", "no"], "all"),
  };
}

/** 味は「食べた」なら、アソートは中身の味をすべて食べていれば「食べた」 */
export function isEaten(item: CatalogItem, eatenIds: Set<string>): boolean {
  if (item.flavorIds.length === 0) return false;
  return item.flavorIds.every((id) => eatenIds.has(id));
}

export function filterCatalog(
  items: CatalogItem[],
  f: CatalogFilter,
  eatenIds: Set<string> | null,
): CatalogItem[] {
  return items.filter((item) => {
    if (f.kind !== "all" && item.kind !== f.kind) return false;
    if (f.year && !item.years.includes(f.year)) return false;
    if (f.sale === "on" && !item.onSale) return false;
    if (f.sale === "off" && item.onSale) return false;
    if (eatenIds && f.eaten !== "all") {
      if (isEaten(item, eatenIds) !== (f.eaten === "yes")) return false;
    }
    return matchesKeyword(f.q, [item.name, item.name_kana, item.description, ...item.relatedNames]);
  });
}

export function completion(items: CatalogItem[], eatenIds: Set<string>) {
  const flavors = items.filter((i) => i.kind === "flavor");
  const eaten = flavors.filter((i) => eatenIds.has(i.id)).length;
  return { eaten, total: flavors.length, percent: flavors.length ? Math.round((eaten / flavors.length) * 100) : 0 };
}
