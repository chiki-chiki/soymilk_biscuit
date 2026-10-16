import { describe, expect, it } from "vitest";
import { FeedbackSchema } from "./schema";

const empty = { kind: "sighting", body: "", product_name: "", store: "", prefecture: "", seen_on: "", price: "", pieces: "", reply_email: "" };

describe("FeedbackSchema", () => {
  it("任意項目の空欄は null になる", () => {
    const r = FeedbackSchema.parse({ ...empty, body: "新しい味を見ました" });
    expect(r).toMatchObject({ kind: "sighting", body: "新しい味を見ました", store: null, price: null, reply_email: null });
  });
  it("数値と日付を変換・検証する", () => {
    expect(FeedbackSchema.parse({ ...empty, body: "x", price: "399", seen_on: "2026-10-01" })).toMatchObject({ price: 399, seen_on: "2026-10-01" });
    expect(FeedbackSchema.safeParse({ ...empty, body: "x", price: "-1" }).success).toBe(false);
    expect(FeedbackSchema.safeParse({ ...empty, body: "x", reply_email: "abc" }).success).toBe(false);
  });
  it("本文は必須", () => {
    expect(FeedbackSchema.safeParse({ ...empty, body: "   " }).success).toBe(false);
  });
});
