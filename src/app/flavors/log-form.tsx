"use client";

import { useActionState } from "react";
import { saveLog } from "./actions";

export function LogForm({
  flavorId,
  slug,
  eaten,
  memo,
}: {
  flavorId: string;
  slug: string;
  eaten: boolean;
  memo: string;
}) {
  const [state, action, pending] = useActionState(saveLog, null);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="flavorId" value={flavorId} />
      <input type="hidden" name="slug" value={slug} />
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="eaten" defaultChecked={eaten} className="size-5 accent-[var(--accent)]" />
        食べたことがある
      </label>
      <div>
        <label htmlFor="memo" className="label">
          ひとことメモ（自分だけに表示・200文字まで）
        </label>
        <textarea id="memo" name="memo" defaultValue={memo} maxLength={200} rows={2} className="input" />
      </div>
      <div className="flex items-center gap-3">
        <button className="btn" disabled={pending}>
          {pending ? "保存中…" : "保存"}
        </button>
        {state && <p className={`text-sm ${state.ok ? "text-success" : "text-danger"}`}>{state.message}</p>}
      </div>
    </form>
  );
}
