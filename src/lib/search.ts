/**
 * 検索用の正規化: 全角/半角の統一（NFKC）、カタカナ→ひらがな、小文字化、空白除去。
 * 「マッチャ」「まっちゃ」「ﾏｯﾁｬ」が同じものとして一致する。
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    .replace(/\s+/g, "");
}

/** keyword を空白で区切り、すべての語がいずれかのフィールドに含まれれば true */
export function matchesKeyword(keyword: string, fields: (string | null | undefined)[]): boolean {
  const terms = keyword.split(/[\s　]+/).map(normalizeForSearch).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = fields.filter(Boolean).map((f) => normalizeForSearch(f!)).join("\n");
  return terms.every((t) => haystack.includes(t));
}
