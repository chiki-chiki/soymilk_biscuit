import type { Metadata } from "next";
import { Pacifico, Yusei_Magic } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Pennant } from "@/components/pennant";
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
        <div className="bag-edge h-6 md:hidden" aria-hidden />
        <header>
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-5 pb-2">
            <Link href="/" className="group flex min-w-0 flex-col gap-0.5" aria-label="豆乳ビスケット図鑑 トップへ">
              <Pennant>Soymilk Biscuit Zukan</Pennant>
              <span className="display text-xl leading-none whitespace-nowrap group-hover:text-red-deep sm:text-2xl">
                豆乳ビスケット図鑑
              </span>
            </Link>
            <nav className="flex shrink-0 items-center gap-2 text-xs font-bold whitespace-nowrap sm:gap-4 sm:text-sm">
              <Link href="/feedback" className="text-blue hover:text-red">
                情報を送る
              </Link>
              <Suspense fallback={<span className="w-16" />}>
                <UserMenu />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-16">{children}</main>
        <footer className="text-xs text-ink-soft">
          <div className="mx-auto max-w-5xl px-4 pb-8">
            <p>このサイトは株式会社キャメル珈琲（カルディコーヒーファーム）とは関係のない、非公式のファンサイトです。</p>
            <p>掲載している情報は有志の調査によるもので、正確さは保証できません。</p>
          </div>
          <div className="bag-edge h-6 md:hidden" aria-hidden />
        </footer>
      </body>
    </html>
  );
}
