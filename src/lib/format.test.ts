import { describe, expect, it } from "vitest";
import {
  formatPartialDate,
  formatPrice,
  parsePartialDate,
  partialDateInput,
  pricePerPiece,
  toTaxIncluded,
} from "./format";

describe("formatPartialDate", () => {
  it("精度に応じて表示する", () => {
    expect(formatPartialDate("2023-10-01", "month")).toBe("2023年10月");
    expect(formatPartialDate("2023-01-01", "year")).toBe("2023年");
    expect(formatPartialDate("2023-10-05", "day")).toBe("2023年10月5日");
  });
  it("推定なら「頃」を付ける", () => {
    expect(formatPartialDate("2019-01-01", "year", "estimated")).toBe("2019年頃");
  });
  it("不明", () => {
    expect(formatPartialDate(null, null)).toBe("不明");
  });
});

describe("toTaxIncluded", () => {
  it("税込はそのまま", () => {
    expect(toTaxIncluded(399, "included")).toEqual({ amount: 399, converted: false, uncertain: false });
  });
  it("税抜は当時の税率で換算", () => {
    expect(toTaxIncluded(370, "excluded", "2020-01-01")).toMatchObject({ amount: 399, converted: true });
    expect(toTaxIncluded(300, "excluded", "2013-05-01")).toMatchObject({ amount: 315, converted: true });
  });
  it("不明", () => {
    expect(toTaxIncluded(null, null)).toBeNull();
  });
});

describe("formatPrice", () => {
  it("換算値には ≈ を付ける", () => {
    expect(formatPrice(370, "excluded")).toBe("≈399円（税抜370円から換算）");
    expect(formatPrice(1280, "included")).toBe("1,280円（税込）");
    expect(formatPrice(198, "unknown")).toBe("198円（税込/税抜不明）");
  });
});

describe("pricePerPiece", () => {
  it("1枚あたりの税込価格", () => {
    expect(pricePerPiece(399, "included", 30)).toBe(13.3);
    expect(pricePerPiece(399, "included", null)).toBeNull();
  });
});

describe("parsePartialDate", () => {
  it("入力の細かさから精度を決める", () => {
    expect(parsePartialDate("2023")).toEqual({ date: "2023-01-01", precision: "year" });
    expect(parsePartialDate("2023-10")).toEqual({ date: "2023-10-01", precision: "month" });
    expect(parsePartialDate("2023/1/5")).toEqual({ date: "2023-01-05", precision: "day" });
  });
  it("空欄は null、不正な値は undefined", () => {
    expect(parsePartialDate(" ")).toBeNull();
    expect(parsePartialDate("2023-13")).toBeUndefined();
    expect(parsePartialDate("2023-02-30")).toBeUndefined();
    expect(parsePartialDate("秋")).toBeUndefined();
  });
  it("往復できる", () => {
    for (const s of ["2023", "2023-10", "2023-10-05"]) {
      const p = parsePartialDate(s)!;
      expect(partialDateInput(p.date, p.precision)).toBe(s);
    }
  });
});
