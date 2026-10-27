import type { Metadata } from "next";
import { Pacifico, Yusei_Magic } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { UserMenu } from "@/components/user-menu";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "豆乳ビスケット図鑑", template: "%s | 豆乳ビスケット図鑑" },
  description: "カルディの豆乳ビスケットシリーズの味・アソートの発売時期、価格、枚数を記録する非公式ファンサイト",
};

// 見出し: 手書き風 / 本文: OS 標準 / 英字の飾り: 筆記体
const hand = Yusei_Magic({ weight: "400", subsets: ["latin"], variable: "--font-hand", preload: false });
const pacifico = Pacifico({ weight: "400", subsets: ["latin"], variable: "--font-pacifico" });

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${hand.variable} ${pacifico.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="bg-surface">
          <div className="checker" aria-hidden />
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="group flex min-w-0 flex-col leading-none">
              <span className="w-fit -rotate-2 rounded-r-full bg-blue-soft px-2 py-0.5 font-script text-xs text-blue">
                Soymilk Biscuit Zukan
              </span>
              <span className="display mt-1 text-xl whitespace-nowrap group-hover:text-accent-strong sm:text-3xl">豆乳ビスケット図鑑</span>
            </Link>
            <nav className="flex shrink-0 items-center gap-2 text-xs font-bold whitespace-nowrap sm:gap-3 sm:text-sm">
              <Link href="/feedback" className="text-blue hover:text-accent">
                情報を送る
              </Link>
              <Suspense fallback={<span className="w-16" />}>
                <UserMenu />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="bg-surface text-center text-xs text-muted">
          <div className="checker" aria-hidden />
          <div className="px-4 py-6">
            <p>このサイトは株式会社キャメル珈琲（カルディコーヒーファーム）とは関係のない非公式ファンサイトです。</p>
            <p className="mt-1">掲載情報は有志の調査によるもので、正確性を保証しません。</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
