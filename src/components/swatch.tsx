import Image from "next/image";
import { publicImageUrl } from "@/lib/supabase/env";

/** ビスケットの穴（3×3） */
const HOLES = [-1, 0, 1].flatMap((y) => [-1, 0, 1].map((x) => [x * 9, y * 9] as const));

/** クリームをはさんだビスケット。cream が味ごとのクリームの色 */
function Biscuit({ cx, cy, r, cream, id }: { cx: number; cy: number; r: number; cream: string; id: string }) {
  const s = r / 22;
  return (
    <g>
      {/* 下のビスケットとクリーム */}
      <circle cx={cx + 6 * s} cy={cy + 7 * s} r={r} fill="var(--biscuit-dark)" />
      <circle cx={cx + 3.5 * s} cy={cy + 4 * s} r={r * 0.98} fill={cream} stroke="var(--biscuit-dark)" strokeWidth={0.8 * s} />
      {/* 上のビスケット */}
      <circle cx={cx} cy={cy} r={r} fill="var(--biscuit)" stroke="var(--biscuit-dark)" strokeWidth={1.5 * s} />
      <circle cx={cx} cy={cy} r={r * 0.84} fill="none" stroke="var(--biscuit-dark)" strokeOpacity={0.35} strokeWidth={1 * s} />
      {HOLES.map(([x, y]) => (
        <circle key={`${id}-${x}-${y}`} cx={cx + x * s} cy={cy + y * s} r={1.4 * s} fill="var(--biscuit-dark)" />
      ))}
    </g>
  );
}

/** 商品写真。写真がなければビスケットの絵で代用する（クリームの色は味ごとの色） */
export function Swatch({
  name,
  color,
  imagePath,
  kind,
  size = 64,
}: {
  name: string;
  color: string | null;
  imagePath: string | null;
  kind: "flavor" | "assort";
  size?: number;
}) {
  const url = publicImageUrl(imagePath);
  if (url) {
    return (
      <Image
        src={url}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  const cream = color ?? "var(--cream)";
  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className="shrink-0 rounded-xl border-2 border-border bg-blue-soft"
    >
      {kind === "assort" ? (
        <>
          <Biscuit id="a" cx={22} cy={24} r={13} cream="var(--cream)" />
          <Biscuit id="b" cx={41} cy={26} r={13} cream={cream} />
          <Biscuit id="c" cx={30} cy={41} r={13} cream="var(--accent-soft)" />
        </>
      ) : (
        <Biscuit id="f" cx={28} cy={28} r={21} cream={cream} />
      )}
    </svg>
  );
}
