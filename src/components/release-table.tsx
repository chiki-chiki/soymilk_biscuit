import { formatPartialDate, formatPrice, pricePerPiece } from "@/lib/format";
import type { ReleaseFields } from "@/lib/types";

export function ReleasePeriod({ r }: { r: ReleaseFields }) {
  const start = formatPartialDate(r.started_on, r.started_precision, r.started_confidence);
  const end = r.on_sale ? "販売中" : r.ended_on ? formatPartialDate(r.ended_on, r.ended_precision, r.ended_confidence) : "";
  return (
    <>
      {start}
      {end && <>〜{end}</>}
    </>
  );
}

/**
 * 販売期ごとの情報を、お菓子の袋の裏にある「一括表示」のような枠で見せる。
 * 新しい販売期から順に並べる。
 */
export function ReleaseTable({
  releases,
  name,
  piecesLabel = "内容量",
}: {
  releases: ReleaseFields[];
  name: string;
  piecesLabel?: string;
}) {
  if (releases.length === 0) {
    return <p className="text-sm text-ink-soft">販売期の情報はまだありません。知っていることがあれば、情報フォームから教えてください。</p>;
  }
  const sorted = [...releases].sort((a, b) => (b.started_on ?? "").localeCompare(a.started_on ?? ""));
  return (
    <ol className="grid gap-4 sm:grid-cols-2">
      {sorted.map((r) => (
        <li key={r.id}>
          <ReleaseLabel r={r} name={name} piecesLabel={piecesLabel} />
        </li>
      ))}
    </ol>
  );
}

/** 販売期1件分の「一括表示」風の枠 */
export function ReleaseLabel({ r, name, piecesLabel = "内容量" }: { r: ReleaseFields; name: string; piecesLabel?: string }) {
  const per = pricePerPiece(r.price, r.price_tax, r.pieces, r.started_on);
  const rows: [string, React.ReactNode][] = [
    ["名称", name],
    ["販売時期", <ReleasePeriod key="p" r={r} />],
    [piecesLabel, r.pieces ? `${r.pieces}枚` : "不明"],
    ["価格", formatPrice(r.price, r.price_tax, r.started_on)],
  ];
  if (per) rows.push(["1枚あたり", `約${per}円`]);
  if (r.renewal_note) rows.push(["リニューアル", r.renewal_note]);
  return (
    <div className="label-box">
      <dl className="grid grid-cols-[6.5em_1fr]">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="border-r-[1.5px] border-b border-ink/40 px-2 py-1.5 text-xs font-bold">{k}</dt>
            <dd className="border-b border-ink/40 px-2 py-1.5">{v}</dd>
          </div>
        ))}
      </dl>
      {(r.notes || r.source_urls.length > 0) && (
        <div className="space-y-1 px-2 py-2 text-xs text-ink-soft">
          {r.notes && <p>{r.notes}</p>}
          {r.source_urls.length > 0 && (
            <p className="flex flex-wrap gap-x-3">
              {r.source_urls.map((u, i) => (
                <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow" className="link font-normal">
                  出典{r.source_urls.length > 1 ? i + 1 : ""}
                </a>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
