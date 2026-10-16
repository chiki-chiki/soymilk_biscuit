"use client";

import Script from "next/script";
import { useActionState, useState } from "react";
import { FEEDBACK_KIND_LABELS, type FeedbackKind } from "@/lib/types";
import { submitFeedback } from "./actions";

const PREFECTURES =
  "北海道 青森県 岩手県 宮城県 秋田県 山形県 福島県 茨城県 栃木県 群馬県 埼玉県 千葉県 東京都 神奈川県 新潟県 富山県 石川県 福井県 山梨県 長野県 岐阜県 静岡県 愛知県 三重県 滋賀県 京都府 大阪府 兵庫県 奈良県 和歌山県 鳥取県 島根県 岡山県 広島県 山口県 徳島県 香川県 愛媛県 高知県 福岡県 佐賀県 長崎県 熊本県 大分県 宮崎県 鹿児島県 沖縄県 オンラインストア".split(
    " ",
  );

export function FeedbackForm({
  defaultKind,
  defaultProduct,
  siteKey,
}: {
  defaultKind: FeedbackKind;
  defaultProduct: string;
  siteKey: string | null;
}) {
  const [state, action, pending] = useActionState(submitFeedback, null);
  const [kind, setKind] = useState<FeedbackKind>(defaultKind);

  if (state?.ok) {
    return (
      <div className="card p-6 text-center">
        <p className="font-semibold">送信しました。ありがとうございます！</p>
        <p className="mt-1 text-sm text-muted">内容を確認のうえ、サイトに反映します。</p>
      </div>
    );
  }
  const err = (name: string) =>
    state && !state.ok && state.fieldErrors?.[name] ? <p className="mt-1 text-xs text-danger">{state.fieldErrors[name]}</p> : null;

  return (
    <form action={action} className="card space-y-4 p-5">
      {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <fieldset>
        <legend className="label">種別</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FEEDBACK_KIND_LABELS) as FeedbackKind[]).map((k) => (
            <label key={k} className={`btn-ghost cursor-pointer ${kind === k ? "border-accent bg-accent-soft" : ""}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {FEEDBACK_KIND_LABELS[k]}
            </label>
          ))}
        </div>
      </fieldset>

      {kind !== "site" && (
        <div>
          <label htmlFor="product_name" className="label">
            商品名（任意）
          </label>
          <input id="product_name" name="product_name" defaultValue={defaultProduct} maxLength={100} className="input" />
          {err("product_name")}
        </div>
      )}

      {kind === "sighting" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="store" className="label">
              店舗名（任意）
            </label>
            <input id="store" name="store" maxLength={100} placeholder="例: ○○店" className="input" />
          </div>
          <div>
            <label htmlFor="prefecture" className="label">
              都道府県（任意）
            </label>
            <select id="prefecture" name="prefecture" defaultValue="" className="input">
              <option value="">選択しない</option>
              {PREFECTURES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="seen_on" className="label">
              見かけた日（任意）
            </label>
            <input id="seen_on" name="seen_on" type="date" className="input" />
            {err("seen_on")}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="price" className="label">
                価格（税込・任意）
              </label>
              <input id="price" name="price" type="number" min={1} inputMode="numeric" className="input" />
              {err("price")}
            </div>
            <div>
              <label htmlFor="pieces" className="label">
                枚数（任意）
              </label>
              <input id="pieces" name="pieces" type="number" min={1} inputMode="numeric" className="input" />
              {err("pieces")}
            </div>
          </div>
        </div>
      )}

      <div>
        <label htmlFor="body" className="label">
          内容
        </label>
        <textarea
          id="body"
          name="body"
          required
          maxLength={2000}
          rows={5}
          className="input"
          placeholder={
            kind === "sighting"
              ? "どんな味でしたか？パッケージの特徴なども教えてください"
              : kind === "correction"
                ? "どの情報が、どう間違っていますか？根拠（URLなど）があれば添えてください"
                : "サイトへのご意見・ご要望"
          }
        />
        {err("body")}
      </div>

      <div>
        <label htmlFor="reply_email" className="label">
          返信先メールアドレス（任意・返信が必要な場合のみ）
        </label>
        <input id="reply_email" name="reply_email" type="email" maxLength={254} className="input" autoComplete="email" />
        {err("reply_email")}
      </div>

      {/* ボット除けの見えない入力欄 */}
      <div aria-hidden className="absolute -left-[9999px]">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {siteKey && <div className="cf-turnstile" data-sitekey={siteKey} data-language="ja" />}

      {state && !state.ok && <p className="text-sm text-danger">{state.message}</p>}
      <button className="btn w-full" disabled={pending}>
        {pending ? "送信中…" : "送信する"}
      </button>
    </form>
  );
}
