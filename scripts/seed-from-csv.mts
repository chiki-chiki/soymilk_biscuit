/**
 * data/seed/*.csv から supabase/seed.sql を生成する。
 *
 *   npm run seed:build
 *
 * 生成した SQL は何度流しても同じ結果になる（slug / code で upsert）。
 * - ローカル: `npx supabase db reset` で自動的に流れる
 * - 本番: Supabase の SQL Editor に貼り付けて実行する
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SEED_DIR = join(ROOT, "data", "seed");
const OUT = join(ROOT, "supabase", "seed.sql");

type Row = Record<string, string>;

/** RFC 4180 の CSV を読む（ダブルクォート・改行入りの値に対応） */
export function parseCsv(text: string): Row[] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else field += ch;
  }
  if (field || record.length) {
    record.push(field);
    records.push(record);
  }
  const [header, ...rows] = records.filter((r) => r.some((v) => v.trim()));
  return rows.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? "").trim()])));
}

const errors: string[] = [];

function lit(v: string | null | undefined): string {
  if (v === null || v === undefined || v === "") return "null";
  return `'${v.replace(/'/g, "''")}'`;
}

function intLit(v: string, where: string): string {
  if (!v) return "null";
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) {
    errors.push(`${where}: 正の整数ではありません: ${v}`);
    return "null";
  }
  return String(n);
}

function enumLit(v: string, allowed: string[], where: string, fallback: string | null = null): string {
  if (!v) return lit(fallback);
  if (!allowed.includes(v)) errors.push(`${where}: ${allowed.join("/")} のいずれかにしてください: ${v}`);
  return lit(v);
}

function urlsLit(v: string): string {
  const urls = v
    .split(/\s*\|\s*|\s+/)
    .map((u) => u.trim())
    .filter((u) => /^https?:\/\//.test(u));
  return `array[${urls.map(lit).join(", ")}]::text[]`;
}

function dateLit(date: string, precision: string, where: string): [string, string] {
  if (!date && !precision) return ["null", "null"];
  if (!date || !precision) {
    errors.push(`${where}: 日付と精度は両方そろえてください`);
    return ["null", "null"];
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) errors.push(`${where}: 日付が不正です: ${date}`);
  return [lit(date), enumLit(precision, ["year", "month", "day"], where)];
}

function read(name: string): Row[] {
  return parseCsv(readFileSync(join(SEED_DIR, name), "utf8"));
}

function itemUpserts(table: "flavors" | "assorts", rows: Row[]): string {
  const cols = ["slug", "name", "name_kana", "description", "notes", ...(table === "flavors" ? ["assort_only"] : [])];
  const values = rows.map((r) => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug)) errors.push(`${table}.csv: slug が不正です: ${r.slug}`);
    if (!r.name) errors.push(`${table}.csv ${r.slug}: name が空です`);
    const v = [lit(r.slug), lit(r.name), lit(r.name_kana), lit(r.description), lit(r.notes)];
    // notes に「アソート限定」とあればアソート限定の味として扱う
    if (table === "flavors") v.push(r.assort_only ? String(r.assort_only === "true") : String(/アソート限定/.test(r.notes ?? "")));
    return `  (${v.join(", ")})`;
  });
  const updates = cols.filter((c) => c !== "slug").map((c) => `${c} = excluded.${c}`);
  return `insert into public.${table} (${cols.join(", ")}) values\n${values.join(",\n")}\non conflict (slug) do update set ${updates.join(", ")};\n`;
}

function releaseUpserts(kind: "flavor" | "assort", rows: Row[], parents: Set<string>, parentKey: string[]): string {
  const table = `${kind}_releases`;
  const parentTable = kind === "flavor" ? "flavors" : "assorts";
  const parentCol = `${kind}_id`;
  const codes = new Set<string>();
  const statements = rows.map((r) => {
    const where = `${table}.csv ${r.release_id}`;
    const parentSlug = parentKey.map((k) => r[k]).find(Boolean) ?? "";
    if (!r.release_id) errors.push(`${table}.csv: release_id が空の行があります`);
    if (codes.has(r.release_id)) errors.push(`${where}: release_id が重複しています`);
    codes.add(r.release_id);
    if (!parents.has(parentSlug)) errors.push(`${where}: 存在しない slug です: ${parentSlug}`);
    if (r.price_tax && !r.price) errors.push(`${where}: price がないのに price_tax があります`);
    // 価格だけ分かって税区分が書かれていない行は unknown として扱う
    const priceTax = r.price && !r.price_tax ? "unknown" : r.price_tax;
    const [startedOn, startedPrecision] = dateLit(r.started_on, r.started_precision, `${where} started`);
    const [endedOn, endedPrecision] = dateLit(r.ended_on, r.ended_precision, `${where} ended`);
    const cols: [string, string][] = [
      ["code", lit(r.release_id)],
      [parentCol, `(select id from public.${parentTable} where slug = ${lit(parentSlug)})`],
      ["started_on", startedOn],
      ["started_precision", startedPrecision],
      ["started_confidence", enumLit(r.started_confidence, ["confirmed", "estimated"], where, "estimated")],
      ["ended_on", endedOn],
      ["ended_precision", endedPrecision],
      ["ended_confidence", enumLit(r.ended_confidence, ["confirmed", "estimated"], where, "estimated")],
      ["on_sale", r.on_sale === "true" ? "true" : "false"],
      ["price", intLit(r.price, `${where} price`)],
      ["price_tax", enumLit(priceTax, ["included", "excluded", "unknown"], where)],
      ["pieces", intLit(r.pieces, `${where} pieces`)],
      ["renewal_note", lit(r.renewal_note)],
      ["source_urls", urlsLit(r.source_urls ?? "")],
      ["notes", lit(r.notes)],
    ];
    const updates = cols.filter(([c]) => c !== "code").map(([c]) => `${c} = excluded.${c}`);
    return `insert into public.${table} (${cols.map(([c]) => c).join(", ")})\nvalues (${cols.map(([, v]) => v).join(", ")})\non conflict (code) do update set ${updates.join(", ")};`;
  });
  return statements.join("\n") + "\n";
}

function main() {
  const flavors = read("flavors.csv");
  const assorts = read("assorts.csv");
  const flavorReleases = read("flavor_releases.csv");
  const assortReleases = read("assort_releases.csv");
  const contents = read("assort_contents.csv");

  const flavorSlugs = new Set(flavors.map((r) => r.slug));
  const assortSlugs = new Set(assorts.map((r) => r.slug));
  const assortCodes = new Set(assortReleases.map((r) => r.release_id));

  const contentSql = contents.map((r) => {
    const where = `assort_contents.csv ${r.assort_release_id}/${r.flavor_slug}`;
    if (!assortCodes.has(r.assort_release_id)) errors.push(`${where}: 存在しない assort_release_id です`);
    if (!flavorSlugs.has(r.flavor_slug)) errors.push(`${where}: 存在しない flavor_slug です`);
    return `insert into public.assort_contents (assort_release_id, flavor_id, pieces, source_urls, notes)
select r.id, f.id, ${intLit(r.pieces, `${where} pieces`)}, ${urlsLit(r.source_urls ?? "")}, ${lit(r.notes)}
from public.assort_releases r, public.flavors f where r.code = ${lit(r.assort_release_id)} and f.slug = ${lit(r.flavor_slug)}
on conflict (assort_release_id, flavor_id) do update set pieces = excluded.pieces, source_urls = excluded.source_urls, notes = excluded.notes;`;
  });

  const sql = [
    "-- このファイルは scripts/seed-from-csv.mts が data/seed/*.csv から生成します。直接編集しないでください。",
    "begin;",
    itemUpserts("flavors", flavors),
    itemUpserts("assorts", assorts),
    releaseUpserts("flavor", flavorReleases, flavorSlugs, ["flavor_slug"]),
    // 調査用 CSV では列名が flavor_slug になっている場合があるので両方受け付ける
    releaseUpserts("assort", assortReleases, assortSlugs, ["assort_slug", "flavor_slug"]),
    "-- CSV にあるアソート販売期の中身は CSV の内容で置き換える",
    `delete from public.assort_contents where assort_release_id in (select id from public.assort_releases where code in (${[...assortCodes].map(lit).join(", ")}));`,
    contentSql.join("\n"),
    "commit;",
    "",
  ].join("\n");

  if (errors.length) {
    console.error(`CSV にエラーが ${errors.length} 件あります:\n` + errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }
  writeFileSync(OUT, sql);
  console.log(
    `supabase/seed.sql を生成しました（味 ${flavors.length} / アソート ${assorts.length} / 販売期 ${flavorReleases.length + assortReleases.length} / 中身 ${contents.length}）`,
  );
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) main();
