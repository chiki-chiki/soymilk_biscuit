/** ログイン後の戻り先。外部サイトへのリダイレクトを防ぐため、同一サイト内のパスだけ許可する */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  return next;
}
