-- カルディ豆乳ビスケット データベース 初期スキーマ

-- ---------------------------------------------------------------------------
-- 列挙型
-- ---------------------------------------------------------------------------
create type public.date_precision as enum ('year', 'month', 'day');
create type public.date_confidence as enum ('confirmed', 'estimated');
-- unknown: 価格は分かるが税込/税抜が不明
create type public.price_tax as enum ('included', 'excluded', 'unknown');
create type public.user_role as enum ('user', 'admin');
create type public.feedback_kind as enum ('sighting', 'correction', 'site');
create type public.feedback_status as enum ('open', 'in_progress', 'resolved', 'rejected');

-- ---------------------------------------------------------------------------
-- 共通: updated_at の自動更新
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- プロフィール（auth.users と 1:1。role で管理者を判定）
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- 味・アソート
-- ---------------------------------------------------------------------------
create table public.flavors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_kana text,
  description text,
  notes text,
  -- 単品販売がなくアソートにだけ入っている味
  assort_only boolean not null default false,
  -- 写真がないときに表示する色（#rrggbb）
  color text check (color ~ '^#[0-9a-f]{6}$'),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.assorts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  name_kana text,
  description text,
  notes text,
  color text check (color ~ '^#[0-9a-f]{6}$'),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 販売期（味・アソート共通の列構成）
--   日付は精度つき: precision=month なら started_on はその月の1日、year なら1月1日
-- ---------------------------------------------------------------------------
create table public.flavor_releases (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  flavor_id uuid not null references public.flavors (id) on delete cascade,
  started_on date,
  started_precision public.date_precision,
  started_confidence public.date_confidence not null default 'estimated',
  ended_on date,
  ended_precision public.date_precision,
  ended_confidence public.date_confidence not null default 'estimated',
  on_sale boolean not null default false,
  price integer check (price > 0),
  price_tax public.price_tax,
  pieces integer check (pieces > 0),
  renewal_note text,
  source_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((started_on is null) = (started_precision is null)),
  check ((ended_on is null) = (ended_precision is null)),
  check ((price is null) = (price_tax is null))
);
create index flavor_releases_flavor_id_idx on public.flavor_releases (flavor_id);

create table public.assort_releases (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  assort_id uuid not null references public.assorts (id) on delete cascade,
  started_on date,
  started_precision public.date_precision,
  started_confidence public.date_confidence not null default 'estimated',
  ended_on date,
  ended_precision public.date_precision,
  ended_confidence public.date_confidence not null default 'estimated',
  on_sale boolean not null default false,
  price integer check (price > 0),
  price_tax public.price_tax,
  -- 合計枚数
  pieces integer check (pieces > 0),
  renewal_note text,
  source_urls text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((started_on is null) = (started_precision is null)),
  check ((ended_on is null) = (ended_precision is null)),
  check ((price is null) = (price_tax is null))
);
create index assort_releases_assort_id_idx on public.assort_releases (assort_id);

-- アソートの販売期ごとの中身
create table public.assort_contents (
  assort_release_id uuid not null references public.assort_releases (id) on delete cascade,
  flavor_id uuid not null references public.flavors (id) on delete restrict,
  pieces integer check (pieces > 0),
  source_urls text[] not null default '{}',
  notes text,
  primary key (assort_release_id, flavor_id)
);
create index assort_contents_flavor_id_idx on public.assort_contents (flavor_id);

-- ---------------------------------------------------------------------------
-- ユーザーの「食べた」記録（本人のみ読み書き）
-- ---------------------------------------------------------------------------
create table public.user_flavor_logs (
  user_id uuid not null references auth.users (id) on delete cascade,
  flavor_id uuid not null references public.flavors (id) on delete cascade,
  eaten boolean not null default true,
  memo text check (char_length(memo) <= 200),
  updated_at timestamptz not null default now(),
  primary key (user_id, flavor_id)
);

-- ---------------------------------------------------------------------------
-- フィードバック（投稿はサーバーから service role で行う）
-- ---------------------------------------------------------------------------
create table public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  kind public.feedback_kind not null,
  body text not null check (char_length(body) between 1 and 2000),
  -- 目撃情報用（任意）
  product_name text check (char_length(product_name) <= 100),
  store text check (char_length(store) <= 100),
  prefecture text check (char_length(prefecture) <= 10),
  seen_on date,
  price integer check (price > 0),
  pieces integer check (pieces > 0),
  reply_email text check (char_length(reply_email) <= 254),
  user_id uuid references auth.users (id) on delete set null,
  -- 送信回数制限用（IP のソルト付きハッシュ）
  ip_hash text,
  status public.feedback_status not null default 'open',
  admin_note text,
  related_flavor_id uuid references public.flavors (id) on delete set null,
  related_assort_id uuid references public.assorts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index feedbacks_status_created_at_idx on public.feedbacks (status, created_at desc);
create index feedbacks_ip_hash_created_at_idx on public.feedbacks (ip_hash, created_at desc);

-- updated_at トリガー
create trigger set_updated_at before update on public.flavors
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assorts
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.flavor_releases
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.assort_releases
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.user_flavor_logs
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.feedbacks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 行レベルセキュリティ
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.flavors enable row level security;
alter table public.assorts enable row level security;
alter table public.flavor_releases enable row level security;
alter table public.assort_releases enable row level security;
alter table public.assort_contents enable row level security;
alter table public.user_flavor_logs enable row level security;
alter table public.feedbacks enable row level security;

-- プロフィール: 本人のみ参照（role の変更は SQL で直接行う）
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

-- カタログ: 誰でも参照、管理者のみ書き込み
create policy "flavors: public read" on public.flavors
  for select to anon, authenticated using (true);
create policy "flavors: admin write" on public.flavors
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "assorts: public read" on public.assorts
  for select to anon, authenticated using (true);
create policy "assorts: admin write" on public.assorts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "flavor_releases: public read" on public.flavor_releases
  for select to anon, authenticated using (true);
create policy "flavor_releases: admin write" on public.flavor_releases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "assort_releases: public read" on public.assort_releases
  for select to anon, authenticated using (true);
create policy "assort_releases: admin write" on public.assort_releases
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "assort_contents: public read" on public.assort_contents
  for select to anon, authenticated using (true);
create policy "assort_contents: admin write" on public.assort_contents
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- 食べた記録: 本人のみ
create policy "user_flavor_logs: own" on public.user_flavor_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- フィードバック: 管理者のみ参照・更新（投稿は service role）
create policy "feedbacks: admin read" on public.feedbacks
  for select to authenticated using (public.is_admin());
create policy "feedbacks: admin update" on public.feedbacks
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 商品写真のストレージ（公開読み取り、管理者のみアップロード）
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp']);

create policy "catalog-images: admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog-images' and public.is_admin());
create policy "catalog-images: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog-images' and public.is_admin());
create policy "catalog-images: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog-images' and public.is_admin());
