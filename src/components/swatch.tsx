import Image from "next/image";
import { publicImageUrl } from "@/lib/supabase/env";

/** ビスケットの穴（3×3） */
const HOLES = [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((x) => [x * 9, y * 9] as const));

/** クリームをはさんだビスケット1枚。cream が味ごとのクリームの色 */
function Biscuit({ cx, cy, r, cream }: { cx: number; cy: number; r: number; cream: string }) {
  const s = r / 22;
  return (
    <g>
      {/* 下のビスケットとクリーム */}
      <circle cx={cx + 6 * s} cy={cy + 7 * s} r={r} fill="var(--biscuit-dark)" />
      <circle cx={cx + 3.5 * s} cy={cy + 4 * s} r={r * 0.98} fill={cream} stroke="var(--biscuit-dark)" strokeWidth={0.8 * s} />
      {/* 上のビスケット */}
      <circle cx={cx} cy={cy} r={r} fill="var(--biscuit)" stroke="var(--biscuit-dark)" strokeWidth={1.5 * s} />
      <circle cx={cx} cy={cy} r={r * 0.84} fill="none" stroke="var(--biscuit-dark)" strokeOpacity={0.35} strokeWidth={s} />
      {HOLES.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={cx + x * s} cy={cy + y * s} r={1.4 * s} fill="var(--biscuit-dark)" />
      ))}
    </g>
  );
}

/** ビスケットの絵。味は1枚、アソートは3枚。burst で袋の絵のような「！」の線を付ける */
export function BiscuitArt({
  kind = "flavor",
  cream,
  size = 64,
  burst = false,
  className = "",
}: {
  kind?: "flavor" | "assort";
  cream?: string | null;
  size?: number;
  burst?: boolean;
  className?: string;
}) {
  const c = cream ?? "var(--cream)";
  return (
    <svg aria-hidden viewBox="0 0 64 64" width={size} height={size} className={`shrink-0 overflow-visible ${className}`}>
      {burst && (
        <g stroke="var(--red)" strokeWidth={2.2} strokeLinecap="round">
          <line x1={18} y1={4} x2={14} y2={-4} />
          <line x1={27} y1={1} x2={27} y2={-8} />
          <line x1={36} y1={4} x2={41} y2={-4} />
        </g>
      )}
      {kind === "assort" ? (
        <>
          <Biscuit cx={21} cy={23} r={13} cream="var(--cream)" />
          <Biscuit cx={41} cy={25} r={13} cream={c} />
          <Biscuit cx={29} cy={41} r={13} cream="var(--red-tint)" />
        </>
      ) : (
        <Biscuit cx={28} cy={28} r={22} cream={c} />
      )}
    </svg>
  );
}

/** 商品写真。写真がなければビスケットの絵で代用する */
export function Swatch({
  name,
  color,
  imagePath,
  kind,
  size = 64,
  className = "",
}: {
  name: string;
  color: string | null;
  imagePath: string | null;
  kind: "flavor" | "assort";
  size?: number;
  className?: string;
}) {
  const url = publicImageUrl(imagePath);
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return <BiscuitArt kind={kind} cream={color} size={size} className={className} />;
}

/** スタンプカード用の小さなビスケット。食べていない味は輪郭だけ */
export function MiniBiscuit({ eaten, title }: { eaten: boolean; title: string }) {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} role="img" aria-label={title}>
      <title>{title}</title>
      <circle
        cx={10}
        cy={10}
        r={8.5}
        fill={eaten ? "var(--biscuit)" : "none"}
        stroke={eaten ? "var(--biscuit-dark)" : "var(--line)"}
        strokeWidth={1.5}
        strokeDasharray={eaten ? undefined : "2.5 2"}
      />
      {eaten &&
        [-3.5, 0, 3.5].flatMap((y) =>
          [-3.5, 0, 3.5].map((x) => <circle key={`${x}${y}`} cx={10 + x} cy={10 + y} r={0.8} fill="var(--biscuit-dark)" />),
        )}
    </svg>
  );
}
