import { describe, expect, it } from "vitest";
import type { CatalogItem } from "./catalog";
import { completion, filterCatalog, parseFilter } from "./filter";

function item(overrides: Partial<CatalogItem>): CatalogItem {
  return {
    kind: "flavor",
    id: "f1",
    slug: "plain",
    name: "豆乳ビスケット",
    name_kana: "とうにゅうびすけっと",
    description: null,
    color: null,
    image_path: null,
    assort_only: false,
    releases: [],
    firstYear: null,
    years: [],
    onSale: false,
    relatedNames: [],
    flavorIds: ["f1"],
    ...overrides,
  };
}

const plain = item({ id: "f1", years: [2020, 2021], onSale: true });
const matcha = item({
  id: "f2",
  slug: "matcha",
  name: "豆乳ビスケット 抹茶",
  name_kana: "とうにゅうびすけっと まっちゃ",
  years: [2023],
  flavorIds: ["f2"],
});
const assort = item({
  kind: "assort",
  id: "a1",
  slug: "box",
  name: "アソートBOX",
  name_kana: "あそーとぼっくす",
  years: [2023],
  relatedNames: ["豆乳ビスケット", "豆乳ビスケット 抹茶"],
  flavorIds: ["f1", "f2"],
});
const all = [plain, matcha, assort];
const base = parseFilter({});

describe("parseFilter", () => {
  it("不正な値はデフォルトに戻す", () => {
    expect(parseFilter({ kind: "x", year: "abc", sale: ["on", "off"] })).toEqual({
      ...base,
      sale: "on",
    });
  });
});

describe("filterCatalog", () => {
  it("キーワード（カタカナでも一致、アソートは中身の味名でも一致）", () => {
    expect(filterCatalog(all, { ...base, q: "マッチャ" }, null).map((i) => i.id)).toEqual(["f2"]);
    expect(filterCatalog(all, { ...base, q: "抹茶" }, null).map((i) => i.id)).toEqual(["f2", "a1"]);
  });
  it("種類・年・販売中", () => {
    expect(filterCatalog(all, { ...base, kind: "assort" }, null).map((i) => i.id)).toEqual(["a1"]);
    expect(filterCatalog(all, { ...base, year: 2021 }, null).map((i) => i.id)).toEqual(["f1"]);
    expect(filterCatalog(all, { ...base, sale: "on" }, null).map((i) => i.id)).toEqual(["f1"]);
  });
  it("食べた / 未食（アソートは中身を全部食べたら食べた扱い）", () => {
    const eaten = new Set(["f1"]);
    expect(filterCatalog(all, { ...base, eaten: "yes" }, eaten).map((i) => i.id)).toEqual(["f1"]);
    expect(filterCatalog(all, { ...base, eaten: "no" }, eaten).map((i) => i.id)).toEqual(["f2", "a1"]);
  });
  it("未ログインなら食べた絞り込みは無視", () => {
    expect(filterCatalog(all, { ...base, eaten: "yes" }, null)).toHaveLength(3);
  });
});

describe("completion", () => {
  it("味だけで数える", () => {
    expect(completion(all, new Set(["f1"]))).toEqual({ eaten: 1, total: 2, percent: 50 });
  });
});
