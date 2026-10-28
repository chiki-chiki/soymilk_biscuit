import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="btn-ghost px-3 text-xs sm:px-4 sm:text-sm">
        ログイン
      </Link>
    );
  }
  return (
    <>
      {user.isAdmin && (
        <Link href="/admin" className="text-blue hover:text-red">
          管理
        </Link>
      )}
      <Link href="/account" className="btn-ghost px-3 text-xs sm:px-4 sm:text-sm">
        マイページ
      </Link>
    </>
  );
}
