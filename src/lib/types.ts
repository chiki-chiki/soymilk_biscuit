export type DatePrecision = "year" | "month" | "day";
export type DateConfidence = "confirmed" | "estimated";
export type PriceTax = "included" | "excluded" | "unknown";
export type FeedbackKind = "sighting" | "correction" | "site";
export type FeedbackStatus = "open" | "in_progress" | "resolved" | "rejected";

/** 味・アソートの販売期に共通する列 */
export type ReleaseFields = {
  id: string;
  code: string;
  started_on: string | null;
  started_precision: DatePrecision | null;
  started_confidence: DateConfidence;
  ended_on: string | null;
  ended_precision: DatePrecision | null;
  ended_confidence: DateConfidence;
  on_sale: boolean;
  price: number | null;
  price_tax: PriceTax | null;
  pieces: number | null;
  renewal_note: string | null;
  source_urls: string[];
  notes: string | null;
};

export type Flavor = {
  id: string;
  slug: string;
  name: string;
  name_kana: string | null;
  description: string | null;
  notes: string | null;
  assort_only: boolean;
  color: string | null;
  image_path: string | null;
};

export type Assort = {
  id: string;
  slug: string;
  name: string;
  name_kana: string | null;
  description: string | null;
  notes: string | null;
  color: string | null;
  image_path: string | null;
};

export type FlavorRelease = ReleaseFields & { flavor_id: string };
export type AssortRelease = ReleaseFields & { assort_id: string };

export type AssortContent = {
  assort_release_id: string;
  flavor_id: string;
  pieces: number | null;
  source_urls: string[];
  notes: string | null;
};

export type UserFlavorLog = {
  flavor_id: string;
  eaten: boolean;
  memo: string | null;
  updated_at: string;
};

export type Feedback = {
  id: string;
  kind: FeedbackKind;
  body: string;
  product_name: string | null;
  store: string | null;
  prefecture: string | null;
  seen_on: string | null;
  price: number | null;
  pieces: number | null;
  reply_email: string | null;
  user_id: string | null;
  status: FeedbackStatus;
  admin_note: string | null;
  related_flavor_id: string | null;
  related_assort_id: string | null;
  created_at: string;
  updated_at: string;
};

export const FEEDBACK_KIND_LABELS: Record<FeedbackKind, string> = {
  sighting: "新しいフレーバーの目撃情報",
  correction: "掲載情報の誤り",
  site: "サイトについて",
};

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  open: "未対応",
  in_progress: "確認中",
  resolved: "反映済み",
  rejected: "却下",
};
