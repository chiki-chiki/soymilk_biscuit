import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <Link href="/login" className="btn-ghost">
        ログイン
      </Link>
    );
  }
  return (
    <>
      {user.isAdmin && (
        <Link href="/admin" className="hover:text-accent">
          管理
        </Link>
      )}
      <Link href="/account" className="btn-ghost">
        マイページ
      </Link>
    </>
  );
}
