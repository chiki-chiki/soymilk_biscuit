import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "豆乳ビスケット図鑑", template: "%s | 豆乳ビスケット図鑑" },
  description: "カルディの豆乳ビスケットシリーズの味・アソートの発売時期、価格、枚数を記録する非公式ファンサイト",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-base font-bold tracking-tight whitespace-nowrap sm:text-lg">
              🍪 豆乳ビスケット図鑑
            </Link>
            <nav className="flex items-center gap-3 text-sm whitespace-nowrap">
              <Link href="/feedback" className="hover:text-accent">
                情報を送る
              </Link>
              <Suspense fallback={<span className="w-16" />}>
                <UserMenu />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          <p>
            このサイトは株式会社キャメル珈琲（カルディコーヒーファーム）とは関係のない非公式ファンサイトです。
          </p>
          <p className="mt-1">掲載情報は有志の調査によるもので、正確性を保証しません。</p>
        </footer>
      </body>
    </html>
  );
}
