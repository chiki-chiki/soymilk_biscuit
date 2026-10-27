import type { Metadata } from "next";
import { Suspense } from "react";
import { safeNext } from "@/lib/safe-next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <div className="mx-auto max-w-sm space-y-4">
      <h1 className="display text-3xl">ログイン</h1>
      <p className="text-sm text-muted">ログインすると、食べた記録とひとことメモを残せます。記録は本人にしか見えません。</p>
      <Suspense>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const error = sp.error === "auth" ? "ログインに失敗しました。もう一度お試しください。" : null;
  return <LoginForm next={next} initialError={error} />;
}
