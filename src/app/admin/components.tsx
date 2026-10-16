import { partialDateInput } from "@/lib/format";
import type { ReleaseFields } from "@/lib/types";
import { deleteItem, deleteRelease, saveItem, saveRelease } from "./actions";

export function ErrorBanner({ error }: { error: string | string[] | undefined }) {
  if (!error) return null;
  return <p className="card border-danger/50 p-3 text-sm text-danger">{String(error)}</p>;
}

export function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

function ConfidenceSelect({ name, value }: { name: string; value: string }) {
  return (
    <select name={name} defaultValue={value} className="input">
      <option value="estimated">推定</option>
      <option value="confirmed">確定</option>
    </select>
  );
}

/** 販売期の追加・編集フォーム（release が null なら追加） */
export function ReleaseForm({
  kind,
  parentId,
  parentSlug,
  release,
}: {
  kind: "flavor" | "assort";
  parentId: string;
  parentSlug: string;
  release: ReleaseFields | null;
}) {
  const save = saveRelease.bind(null, kind, parentId, parentSlug, release?.id ?? null);
  return (
    <form action={save} className="grid gap-3 sm:grid-cols-4">
      <Field label="販売期コード（一意）" className="sm:col-span-2">
        <input name="code" required defaultValue={release?.code ?? `${parentSlug}-`} className="input" />
      </Field>
      <Field label="販売中">
        <input type="checkbox" name="on_sale" defaultChecked={release?.on_sale} className="size-5" />
      </Field>
      <div />
      <Field label="発売（2023 / 2023-10 / 2023-10-05）">
        <input name="started" defaultValue={partialDateInput(release?.started_on ?? null, release?.started_precision ?? null)} className="input" />
      </Field>
      <Field label="発売の確度">
        <ConfidenceSelect name="started_confidence" value={release?.started_confidence ?? "estimated"} />
      </Field>
      <Field label="終了">
        <input name="ended" defaultValue={partialDateInput(release?.ended_on ?? null, release?.ended_precision ?? null)} className="input" />
      </Field>
      <Field label="終了の確度">
        <ConfidenceSelect name="ended_confidence" value={release?.ended_confidence ?? "estimated"} />
      </Field>
      <Field label="価格（円）">
        <input name="price" type="number" min={1} defaultValue={release?.price ?? ""} className="input" />
      </Field>
      <Field label="表記">
        <select name="price_tax" defaultValue={release?.price_tax ?? "included"} className="input">
          <option value="included">税込</option>
          <option value="excluded">税抜</option>
          <option value="unknown">不明</option>
        </select>
      </Field>
      <Field label={kind === "flavor" ? "枚数" : "合計枚数"}>
        <input name="pieces" type="number" min={1} defaultValue={release?.pieces ?? ""} className="input" />
      </Field>
      <Field label="リニューアル内容">
        <input name="renewal_note" defaultValue={release?.renewal_note ?? ""} className="input" />
      </Field>
      <Field label="出典URL（空白・改行区切り）" className="sm:col-span-2">
        <textarea name="source_urls" rows={2} defaultValue={release?.source_urls.join("\n") ?? ""} className="input" />
      </Field>
      <Field label="備考" className="sm:col-span-2">
        <textarea name="notes" rows={2} defaultValue={release?.notes ?? ""} className="input" />
      </Field>
      <div className="flex gap-2 sm:col-span-4">
        <button className="btn">{release ? "販売期を保存" : "販売期を追加"}</button>
        {release && (
          <button formAction={deleteRelease.bind(null, kind, release.id, parentSlug)} formNoValidate className="btn-ghost text-danger">
            この販売期を削除
          </button>
        )}
      </div>
    </form>
  );
}

/** 味・アソートの基本情報フォーム（item が null なら新規作成） */
export function ItemForm({
  kind,
  item,
}: {
  kind: "flavor" | "assort";
  item: { id: string; slug: string; name: string; name_kana: string | null; description: string | null; notes: string | null; color: string | null; image_path: string | null; assort_only?: boolean } | null;
}) {
  const save = saveItem.bind(null, kind, item?.id ?? null);
  return (
    <form action={save} className="card grid gap-3 p-4 sm:grid-cols-2">
      {item && <input type="hidden" name="currentSlug" value={item.slug} />}
      <Field label="名前">
        <input name="name" required defaultValue={item?.name ?? ""} className="input" />
      </Field>
      <Field label="よみ（ひらがな）">
        <input name="name_kana" defaultValue={item?.name_kana ?? ""} className="input" />
      </Field>
      <Field label="slug（URL用・英小文字/数字/ハイフン）">
        <input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" defaultValue={item?.slug ?? ""} className="input" />
      </Field>
      <Field label="代わりの色（写真がないとき）">
        <input name="color" type="color" defaultValue={item?.color ?? "#f4e6d2"} className="h-10 w-20 rounded border border-border" />
      </Field>
      <Field label="説明" className="sm:col-span-2">
        <textarea name="description" rows={2} defaultValue={item?.description ?? ""} className="input" />
      </Field>
      <Field label="備考（管理用・公開されます）" className="sm:col-span-2">
        <textarea name="notes" rows={2} defaultValue={item?.notes ?? ""} className="input" />
      </Field>
      <Field label="写真（自分で撮影したもの・JPEG/PNG/WebP・5MBまで）">
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" />
      </Field>
      <div className="space-y-2 text-sm">
        {item?.image_path && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remove_image" /> 写真を外す
          </label>
        )}
        {kind === "flavor" && (
          <label className="flex items-center gap-2">
            <input type="checkbox" name="assort_only" defaultChecked={item?.assort_only} /> アソート限定の味
          </label>
        )}
      </div>
      <div className="flex gap-2 sm:col-span-2">
        <button className="btn">{item ? "保存" : "作成"}</button>
        {item && (
          <button formAction={deleteItem.bind(null, kind, item.id, item.slug)} formNoValidate className="btn-ghost text-danger">
            削除
          </button>
        )}
      </div>
    </form>
  );
}
