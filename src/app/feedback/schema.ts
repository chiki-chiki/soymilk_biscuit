import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max}文字までです`)
    .transform((v) => v || null);

const optionalInt = z
  .string()
  .trim()
  .transform((v) => (v ? Number(v) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v < 100000), "正の整数で入力してください");

export const FeedbackSchema = z.object({
  kind: z.enum(["sighting", "correction", "site"], { error: "種別を選んでください" }),
  body: z.string().trim().min(1, "内容を入力してください").max(2000, "2000文字までです"),
  product_name: optionalText(100),
  store: optionalText(100),
  prefecture: optionalText(10),
  seen_on: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v), "日付の形式が正しくありません"),
  price: optionalInt,
  pieces: optionalInt,
  reply_email: z
    .string()
    .trim()
    .transform((v) => v || null)
    .refine((v) => v === null || z.email().safeParse(v).success, "メールアドレスの形式が正しくありません"),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;
