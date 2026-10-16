import Image from "next/image";
import { publicImageUrl } from "@/lib/supabase/env";

/** 商品写真。写真がなければ色とアイコンで代用する */
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
        className="shrink-0 rounded-lg object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-lg border border-border"
      style={{ width: size, height: size, background: color ?? "var(--accent-soft)", fontSize: size * 0.45 }}
    >
      {kind === "assort" ? "🎁" : "🍪"}
    </div>
  );
}
