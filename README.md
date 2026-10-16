# 豆乳ビスケット図鑑

カルディの豆乳ビスケットシリーズの味・アソートパックについて、発売時期・価格・枚数を記録して検索できる**非公式**ファンサイトです。

- 味やアソートの検索（キーワード／種類／販売年／販売状況／食べたかどうか）
- 味ごとの販売期と、その味が入っていたアソートの一覧
- アソートの販売期ごとの中身
- ログイン（Google・メールリンク）すると、食べた記録とひとことメモを残せる（本人にしか見えない）
- フィードバックフォーム（目撃情報・誤りの指摘・サイトへの意見）。管理者全員にメールで届き、管理画面で状態を管理する
- 管理画面での味・アソート・販売期・中身・写真の編集

## 技術構成

| 用途 | 使うもの |
|---|---|
| アプリ | Next.js 16（App Router、Cache Components）、Tailwind CSS v4 |
| DB・認証・画像 | Supabase（Postgres + RLS、Auth、Storage） |
| メール | Resend |
| ボット対策 | Cloudflare Turnstile、隠しフィールド、IP ごとの送信回数制限（1時間に5件） |
| ホスティング | Vercel |

## データモデル

```
flavors（味）──< flavor_releases（販売期）
assorts（アソート）──< assort_releases（販売期）──< assort_contents（中身）>── flavors
auth.users ──< user_flavor_logs（食べた記録・メモ）>── flavors
feedbacks（フィードバック）
profiles（role: user / admin）
```

- **販売期**: 再販・価格改定・枚数変更・リニューアルは、それぞれ新しい販売期として記録します。
- **日付**: 精度（`year` / `month` / `day`）と確度（`confirmed` / `estimated`）を持ちます。精度が月なら `started_on` はその月の1日です。
- **価格**: 元の表記のまま保存し、税込・税抜・不明（`price_tax`）を記録します。表示するときに税込へ換算します（換算値には「≈」を付けます）。
- **食べた記録**: 味の単位です。アソートは、中身の味をすべて食べていれば「食べた」と表示します。

スキーマとアクセス制限は `supabase/migrations/` にあります。

## ローカル開発

```bash
npm install
cp .env.example .env.local
npx supabase start          # Docker が必要。表示された URL とキーを .env.local に書く
npx supabase db reset       # マイグレーション + supabase/seed.sql を流す
npm run dev
```

### 管理者にする

ログインしてから、SQL で `role` を書き換えます。

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

### 初期データ

`data/seed/*.csv` が初期データの元です。編集したら SQL を作り直してください。

```bash
npm run seed:build   # CSV を検証して supabase/seed.sql を生成
```

> ⚠️ 現在の CSV は Web 検索結果の要約から作った**下書き**です。一次情報では未確認なので、公開前に `data/seed/RESEARCH_NOTES.md` の要確認点を確かめてください。

### チェック

```bash
npm test             # ユニットテスト（vitest）
npm run typecheck
npm run lint
npm run build
```

## 本番環境の構築

1. Supabase でプロジェクトを作り、`supabase/migrations/` を適用する（`npx supabase link` → `npx supabase db push`）。初期データは `supabase/seed.sql` を SQL Editor で実行する。
2. Supabase Auth の設定
   - Site URL に本番の URL を入れ、Redirect URLs に `https://<ドメイン>/auth/callback` を追加する
   - Google プロバイダを有効にする（Google Cloud で OAuth クライアントを作り、承認済みリダイレクト URI に Supabase のコールバック URL を登録する）
   - メールリンクを本番で使うなら、カスタム SMTP を設定する（Resend の SMTP が使えます）。Supabase 標準のメール送信は送信数の制限が厳しいためです。
3. Resend で送信元ドメインを認証する。
4. Cloudflare Turnstile でサイトキーを発行する。
5. Vercel にデプロイし、`.env.example` の環境変数を設定する。

## 運用メモ

- 商品写真は、自分で撮影したものだけを載せてください。公式サイトの画像は転載しないでください。
- 管理画面で保存すると、カタログのキャッシュ（`catalog` タグ）が破棄されます。SQL で直接更新した場合は、最長1時間ほど古い表示が残ります。
