-- =============================================================================
-- メモクラ スケジュール管理アプリ / 初期スキーマ
--
-- 【使い方】Supabase ダッシュボードの SQL Editor に貼り付けて実行する。
--
-- 【列定義の出典】`src/types/index.ts`。**列は型定義と1対1で対応させている。**
-- 要件定義書 第7章が原典だが、P0で決めた次の変更を反映している。
--   1. profiles → members（アプリ側の型名 Member と揃える）
--   2. tasks / availabilities にも team_id を持たせる（RLSで親テーブルへの
--      サブクエリを不要にするため）。値はトリガーで親から自動セットする
--
-- 【このマイグレーションでやらないこと】
--   - RLSの有効化（末尾にコメントで用意。認証を実装してから外す）
--   - members.id と auth.users.id の外部キー（同上）
--   - 初期データの投入
-- =============================================================================

-- gen_random_uuid() は PostgreSQL 13 以降のコア関数。
-- pgcrypto 拡張は不要（Supabase は PG15 以降）。

-- -----------------------------------------------------------------------------
-- チームID
--
-- P8のマルチチーム対応まで、全レコードがこの固定値を持つ。
-- 各テーブルの team_id に default として置いてあるので、INSERT時の指定は不要。
-- 将来チームが増えたら default を外し、アプリ側から明示的に渡す形にする。
-- -----------------------------------------------------------------------------
-- メモクラ = '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91'

-- =============================================================================
-- members（要件定義書の profiles）
-- =============================================================================
create table public.members (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  name         text not null,
  role         text not null default '',
  -- UI上の識別色。色だけで判別させず、必ずアイコンと併用する（CLAUDE.md §3.4）
  color        text not null,
  avatar_url   text,
  -- 例「平日20時以降」。締切設定時に参照する（要件定義書 F7）
  active_hours text,
  push_token   text
);

-- 認証を実装したら次を有効にする（members.id を auth.users.id と同じUUIDにする）。
-- 今の段階で張ると auth.users に行が無く、確認用のメンバーすら入れられなくなるため保留。
--
-- alter table public.members
--   add constraint members_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- =============================================================================
-- projects（動画1本 = 1プロジェクト）
-- =============================================================================
create table public.projects (
  id         uuid primary key default gen_random_uuid(),
  team_id    uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  title      text not null,
  kind       text not null check (kind in ('long', 'short', 'sns', 'other')),
  status     text not null default 'planning' check (status in (
    'planning', 'awaiting_shoot', 'shot', 'editing', 'awaiting_upload', 'published', 'reviewed'
  )),
  shoot_at   timestamptz,
  publish_at timestamptz,
  -- 企画責任者。メンバーが消えてもプロジェクトは残す
  owner_id   uuid references public.members(id) on delete set null,
  memo       text,
  created_at timestamptz not null default now(),

  -- tasks から複合外部キーで参照させるために必要
  constraint projects_id_team_key unique (id, team_id)
);

-- =============================================================================
-- tasks（工程。テンプレートから自動生成される）
-- =============================================================================
create table public.tasks (
  id             uuid primary key default gen_random_uuid(),
  -- トリガーで projects から自動セットされる。クライアントの値は常に捨てられる
  team_id        uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  project_id     uuid not null,
  kind           text not null check (kind in (
    'planning', 'build', 'shoot', 'edit_long', 'edit_short',
    'thumbnail', 'upload', 'sns', 'analytics'
  )),
  title          text not null,
  -- null = 未割当。24時間放置でリーダーに通知する（要件定義書 F5）
  assignee_id    uuid references public.members(id) on delete set null,
  due_at         timestamptz,
  status         text not null default 'todo' check (status in ('todo', 'doing', 'done', 'blocked')),
  blocked_reason text,
  sort_order     int  not null default 0,
  done_at        timestamptz,

  -- 親子で team_id がずれることを DB レベルで防ぐ。
  -- トリガーが壊れてもここで弾かれる（CLAUDE.md §5.1）
  constraint tasks_project_fkey foreign key (project_id, team_id)
    references public.projects(id, team_id) on delete cascade,

  -- ブロック中は理由を必須にする（要件定義書 F3）
  constraint tasks_blocked_reason_required
    check (status <> 'blocked' or blocked_reason is not null)
);

-- =============================================================================
-- streams（配信予定）
-- =============================================================================
create table public.streams (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  title        text not null,
  starts_at    timestamptz not null,
  duration_min int  not null default 60,
  platform     text not null default 'youtube' check (platform in ('youtube', 'twitch', 'other')),
  memo         text,
  -- 登録者。型定義で必須なので set null にはできない。
  -- 配信を作ったメンバーを消すには、先に配信を消す必要がある
  created_by   uuid not null references public.members(id) on delete restrict,

  constraint streams_id_team_key unique (id, team_id)
);

-- =============================================================================
-- availabilities（配信への出欠。未回答はレコードを作らないことで表現する）
-- =============================================================================
create table public.availabilities (
  id          uuid primary key default gen_random_uuid(),
  -- トリガーで streams から自動セットされる
  team_id     uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  stream_id   uuid not null,
  member_id   uuid not null references public.members(id) on delete cascade,
  answer      text not null check (answer in ('yes', 'maybe', 'no')),
  comment     text,
  answered_at timestamptz not null default now(),

  -- 1人1配信につき1回答
  constraint availabilities_stream_member_key unique (stream_id, member_id),

  -- 【P2で再検討】配信を削除すると、メンバー本人が入力した回答も無警告で消える。
  -- 削除UIを作るときに確認ダイアログの要否を決める（CLAUDE.md §5.4）
  constraint availabilities_stream_fkey foreign key (stream_id, team_id)
    references public.streams(id, team_id) on delete cascade
);

-- =============================================================================
-- notifications（お知らせ履歴。自動発行される業務通知のみ）
-- =============================================================================
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  recipient_id uuid not null references public.members(id) on delete cascade,
  kind         text not null check (kind in (
    'availability_request', 'assigned', 'due_soon', 'overdue', 'unassigned'
  )),
  title        text not null,
  body         text not null,
  -- link_type と link_id はセットで使う。参照先が3種類あるため外部キーは張れない
  link_type    text not null check (link_type in ('task', 'stream', 'project')),
  link_id      uuid not null,
  -- null = 未読
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

-- =============================================================================
-- team_id を親レコードから自動セットするトリガー
--
-- クライアントから送られた team_id は信用せず、常に親の値で上書きする。
-- BEFORE トリガーは制約チェックより先に走るので、上の複合外部キーとも噛み合う。
-- =============================================================================
create or replace function public.set_team_id_from_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id   uuid;
  v_parent_id uuid;
begin
  -- NEW.項目名は実行時に解決されるため、各分岐の中でだけ参照する。
  -- coalesce(new.project_id, new.stream_id) のように両方書くと、
  -- 片方の列を持たないテーブルで「record new has no field」になる
  if tg_table_name = 'tasks' then
    v_parent_id := new.project_id;
    select p.team_id into v_team_id from public.projects p where p.id = v_parent_id;
  elsif tg_table_name = 'availabilities' then
    v_parent_id := new.stream_id;
    select s.team_id into v_team_id from public.streams s where s.id = v_parent_id;
  end if;

  if v_team_id is null then
    raise exception '親レコードが見つかりません (table=%, parent_id=%)', tg_table_name, v_parent_id;
  end if;

  new.team_id := v_team_id;
  return new;
end;
$$;

create trigger tasks_set_team_id
  before insert or update on public.tasks
  for each row execute function public.set_team_id_from_parent();

create trigger availabilities_set_team_id
  before insert or update on public.availabilities
  for each row execute function public.set_team_id_from_parent();

-- =============================================================================
-- インデックス
-- =============================================================================
create index members_team_idx          on public.members (team_id);
create index projects_team_publish_idx on public.projects (team_id, publish_at);
create index projects_team_shoot_idx   on public.projects (team_id, shoot_at);
create index tasks_project_idx         on public.tasks (project_id);
create index tasks_assignee_due_idx    on public.tasks (assignee_id, due_at);
create index tasks_team_due_idx        on public.tasks (team_id, due_at);
create index streams_team_starts_idx   on public.streams (team_id, starts_at);
create index availabilities_stream_idx on public.availabilities (stream_id);
create index availabilities_member_idx on public.availabilities (member_id);
create index notifications_unread_idx  on public.notifications (recipient_id, read_at);

-- =============================================================================
-- RLS
--
-- 【重要】このマイグレーションでは RLS を**有効にしない**。
-- 下のポリシーは有効化するまで一切効かないので、
-- **この状態では anon キーを持つ人が全テーブルを自由に読み書きできる。**
-- 動作確認用の数件だけを入れ、実データは認証とポリシーを入れてから投入すること。
--
-- 次のプロンプト（認証）で、下の ENABLE 文のコメントを外し、
-- ポリシーを team_id ベースの正式なものへ差し替える。
-- =============================================================================
create policy temporary_full_access on public.members        for all using (true) with check (true);
create policy temporary_full_access on public.projects       for all using (true) with check (true);
create policy temporary_full_access on public.tasks          for all using (true) with check (true);
create policy temporary_full_access on public.streams        for all using (true) with check (true);
create policy temporary_full_access on public.availabilities for all using (true) with check (true);
create policy temporary_full_access on public.notifications  for all using (true) with check (true);

-- 認証を実装したら有効にする
-- alter table public.members        enable row level security;
-- alter table public.projects       enable row level security;
-- alter table public.tasks          enable row level security;
-- alter table public.streams        enable row level security;
-- alter table public.availabilities enable row level security;
-- alter table public.notifications  enable row level security;
