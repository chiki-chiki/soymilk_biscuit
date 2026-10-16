import type { Metadata } from "next";
import { Suspense } from "react";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "情報を送る" };

export default function FeedbackPage(props: PageProps<"/feedback">) {
  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold">情報を送る</h1>
      <p className="text-sm text-muted">
        新しいフレーバーの目撃情報、掲載情報の誤り、サイトへのご意見をお送りください。いただいた情報は管理者が確認してから反映します。
      </p>
      <Suspense>
        <Form searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/feedback">["searchParams"] }) {
  const sp = await searchParams;
  const kind = sp.kind === "correction" || sp.kind === "site" ? sp.kind : "sighting";
  const about = typeof sp.about === "string" ? sp.about.slice(0, 100) : "";
  return <FeedbackForm defaultKind={kind} defaultProduct={about} siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? null} />;
}
