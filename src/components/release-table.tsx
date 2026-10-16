import { formatPartialDate, formatPrice, pricePerPiece } from "@/lib/format";
import type { ReleaseFields } from "@/lib/types";

export function ReleasePeriod({ r }: { r: ReleaseFields }) {
  const start = formatPartialDate(r.started_on, r.started_precision, r.started_confidence);
  const end = r.on_sale ? "販売中" : r.ended_on ? formatPartialDate(r.ended_on, r.ended_precision, r.ended_confidence) : "";
  return (
    <>
      {start}
      {end && <> 〜 {end}</>}
    </>
  );
}

export function ReleaseTable({ releases, piecesLabel = "枚数" }: { releases: ReleaseFields[]; piecesLabel?: string }) {
  if (releases.length === 0) {
    return <p className="text-sm text-muted">販売期の情報はまだありません。</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs whitespace-nowrap text-muted">
            <th className="py-2 pr-3 font-semibold">販売時期</th>
            <th className="py-2 pr-3 font-semibold">価格</th>
            <th className="py-2 pr-3 font-semibold">{piecesLabel}</th>
            <th className="py-2 pr-3 font-semibold">1枚あたり</th>
            <th className="py-2 font-semibold">メモ</th>
          </tr>
        </thead>
        <tbody>
          {releases.map((r) => {
            const per = pricePerPiece(r.price, r.price_tax, r.pieces, r.started_on);
            return (
              <tr key={r.id} className="border-b border-border/60 align-top">
                <td className="py-2 pr-3 whitespace-nowrap">
                  <ReleasePeriod r={r} />
                </td>
                <td className="py-2 pr-3 whitespace-nowrap">{formatPrice(r.price, r.price_tax, r.started_on)}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{r.pieces ? `${r.pieces}枚` : "不明"}</td>
                <td className="py-2 pr-3 whitespace-nowrap">{per ? `約${per}円` : "—"}</td>
                <td className="py-2">
                  {r.renewal_note && <p>リニューアル: {r.renewal_note}</p>}
                  {r.notes && <p className="text-muted">{r.notes}</p>}
                  {r.source_urls.length > 0 && (
                    <p className="mt-1 flex flex-wrap gap-2 text-xs">
                      {r.source_urls.map((u, i) => (
                        <a key={u} href={u} target="_blank" rel="noopener noreferrer nofollow" className="text-accent underline">
                          出典{r.source_urls.length > 1 ? i + 1 : ""}
                        </a>
                      ))}
                    </p>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
