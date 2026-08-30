-- =============================================================================
-- メモクラ スケジュール管理アプリ / 外部カレンダーの取り込み（読み取り専用）
--
-- 【使い方】Supabase ダッシュボードの SQL Editor に貼り付けて実行する。
-- 0004_goals.sql の後。何度実行しても安全（冪等）。
--
-- 【何をするか】Google カレンダー / TimeTree の**公開 iCal（ICS）URL** を登録すると、
-- そこの予定をアプリのカレンダーに重ねて表示する。**取り込むだけで、書き戻さない。**
--
-- 【なぜサーバー経由か】ブラウザから ICS の URL を直接 fetch すると CORS で弾かれる。
-- Edge Function（`supabase/functions/sync-ics`）が取りに行って、ここに保存する。
--
-- 【要件定義書との関係】外部カレンダー連携は要件定義書に定義が無い（第4章 v2 の
-- 「YouTube Data API との連携」とも別物）。ユーザーの要望で足した機能。
-- カレンダー専用テーブルを作らない方針（第7章）は**自前の予定について**の話で、
-- 外部から取り込んだ予定はキャッシュなので、別テーブルに置く。
--
-- 【ロールバック】drop table public.external_events; drop table public.external_calendars;
-- =============================================================================

create table if not exists public.external_calendars (
  id             uuid primary key default gen_random_uuid(),
  team_id        uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  -- 「けんのGoogleカレンダー」など、誰の何かが分かる名前
  label          text not null,
  -- 【注意】Google の「非公開URL（iCal形式）」は、URL を知っている人なら誰でも
  -- 中身を見られる。登録画面にその注意書きを出すこと。
  ics_url        text not null,
  enabled        boolean not null default true,
  last_synced_at timestamptz,
  -- 取り込みに失敗した理由。URL の打ち間違いに気づけるよう画面に出す
  last_error     text,
  created_at     timestamptz not null default now(),

  constraint external_calendars_id_team_key unique (id, team_id)
);

create table if not exists public.external_events (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  calendar_id uuid not null,
  -- ICS の UID。同じ予定を2回入れないための鍵
  uid         text not null,
  title       text not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  -- 終日予定（DTSTART;VALUE=DATE）。時刻を出さない判断に使う
  all_day     boolean not null default false,

  constraint external_events_calendar_fkey foreign key (calendar_id, team_id)
    references public.external_calendars(id, team_id) on delete cascade,

  -- 繰り返し予定を将来展開したときに、同じ UID で複数行になるので開始時刻も鍵に含める
  constraint external_events_uid_key unique (calendar_id, uid, starts_at)
);

create index if not exists external_events_team_starts_idx
  on public.external_events (team_id, starts_at);

-- -----------------------------------------------------------------------------
-- RLS
--   カレンダーの登録   : 同じチームなら誰でも（4人での運用。0003_rls.sql と同じ判断）
--   取り込んだ予定     : 読むのは同じチーム全員。**書き込みはクライアントに許可しない**
--                        （Edge Function が service_role ではなくユーザーの JWT で
--                          書くので、insert/update 用のポリシーを別に置く）
-- -----------------------------------------------------------------------------
alter table public.external_calendars enable row level security;
alter table public.external_events    enable row level security;

drop policy if exists external_calendars_team_all on public.external_calendars;
create policy external_calendars_team_all on public.external_calendars
  for all to authenticated
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());

drop policy if exists external_events_team_all on public.external_events;
create policy external_events_team_all on public.external_events
  for all to authenticated
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());
