import type { DateConfidence, DatePrecision, PriceTax } from "./types";

/**
 * 精度つきの日付を表示用の文字列にする。
 *   ("2023-10-01", "month", "estimated") → "2023年10月頃"
 */
export function formatPartialDate(
  date: string | null,
  precision: DatePrecision | null,
  confidence: DateConfidence = "confirmed",
): string {
  if (!date || !precision) return "不明";
  const [y, m, d] = date.split("-").map(Number);
  let text: string;
  switch (precision) {
    case "year":
      text = `${y}年`;
      break;
    case "month":
      text = `${y}年${m}月`;
      break;
    case "day":
      text = `${y}年${m}月${d}日`;
      break;
  }
  return confidence === "estimated" ? `${text}頃` : text;
}

export function yearOf(date: string | null): number | null {
  return date ? Number(date.slice(0, 4)) : null;
}

/**
 * 飲食料品の消費税率。2019-10 以降は軽減税率で 8% のまま。
 * 日付が不明なら現行の 8% とみなす。
 */
export function foodTaxRate(date: string | null): number {
  if (date && date < "2014-04-01") return 0.05;
  return 0.08;
}

export type DisplayPrice = {
  /** 税込金額（円） */
  amount: number;
  /** 税抜からの換算値なら true */
  converted: boolean;
  /** 税込か税抜か分からない（記録された金額をそのまま使う） */
  uncertain: boolean;
};

/** 記録された価格を税込に揃える（税抜は当時の税率で換算し、小数点以下は切り捨て） */
export function toTaxIncluded(
  price: number | null,
  tax: PriceTax | null,
  date: string | null = null,
): DisplayPrice | null {
  if (price == null || tax == null) return null;
  if (tax === "included") return { amount: price, converted: false, uncertain: false };
  if (tax === "unknown") return { amount: price, converted: false, uncertain: true };
  return { amount: Math.floor(price * (1 + foodTaxRate(date))), converted: true, uncertain: false };
}

export function formatPrice(price: number | null, tax: PriceTax | null, date: string | null = null): string {
  const p = toTaxIncluded(price, tax, date);
  if (!p) return "不明";
  const yen = `${p.amount.toLocaleString("ja-JP")}円`;
  if (p.uncertain) return `${yen}（税込/税抜不明）`;
  return p.converted ? `≈${yen}（税抜${price!.toLocaleString("ja-JP")}円から換算）` : `${yen}（税込）`;
}

/** 1枚あたりの税込価格（小数1桁） */
export function pricePerPiece(
  price: number | null,
  tax: PriceTax | null,
  pieces: number | null,
  date: string | null = null,
): number | null {
  const p = toTaxIncluded(price, tax, date);
  if (!p || !pieces) return null;
  return Math.round((p.amount / pieces) * 10) / 10;
}

/**
 * 管理画面の入力 "2023" / "2023-10" / "2023-10-05" を精度つきの日付にする。
 * 空欄は null、解釈できなければ undefined。
 */
export function parsePartialDate(input: string): { date: string; precision: DatePrecision } | null | undefined {
  const s = input.trim().replace(/[/.]/g, "-");
  if (!s) return null;
  const m = /^(\d{4})(?:-(\d{1,2})(?:-(\d{1,2}))?)?$/.exec(s);
  if (!m) return undefined;
  const [, y, mo, d] = m;
  const month = mo ? Number(mo) : 1;
  const day = d ? Number(d) : 1;
  const date = new Date(Date.UTC(Number(y), month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return {
    date: date.toISOString().slice(0, 10),
    precision: d ? "day" : mo ? "month" : "year",
  };
}

/** parsePartialDate の逆。フォームの初期値に使う */
export function partialDateInput(date: string | null, precision: DatePrecision | null): string {
  if (!date || !precision) return "";
  return precision === "year" ? date.slice(0, 4) : precision === "month" ? date.slice(0, 7) : date;
}
