-- =============================================================================
-- メモクラ スケジュール管理アプリ / RLS の有効化と正式ポリシー
--
-- 【使い方】Supabase ダッシュボードの SQL Editor に貼り付けて実行する。
-- 0001_init.sql / 0002_auth.sql の後。何度実行しても安全（冪等）。
--
-- 【背景】0001_init.sql は RLS を無効のまま `temporary_full_access`
-- （using(true)）だけ置いていた。= anon キーがあれば全テーブルを読み書きできた。
-- 認証（Googleログイン）と合言葉（claim_membership）が通ったので、
-- CLAUDE.md §5.4 の方針どおり team_id 単位で分離する正式ポリシーに差し替える。
--
-- 【モデル】単一チーム（メモクラ）。全メンバーは members 行を持ち id = auth.uid()。
-- 基本述語は「行の team_id が、自分の members 行の team_id と一致する」。
-- members 行がまだ無い人（ログイン済み・合言葉未）は current_team_id() が NULL
-- になり、何も見えない（claim 画面だけ見える状態＝期待どおり）。
--
-- 【ロールバック】問題が出たら6テーブルぶん
--   alter table public.<t> disable row level security;
-- を実行すれば即座に元に戻る。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ヘルパー: 呼び出し元の team_id
--
-- security definer にしている理由: members の SELECT ポリシーがこの関数を呼ぶため、
-- 関数内で members を普通に読むと「ポリシー評価 → 関数 → ポリシー評価 …」の
-- 再帰になる。definer なら RLS をバイパスして members を読めるので再帰しない。
-- stable: 1ステートメント内で結果が変わらない（プランナが呼び出しをまとめられる）。
-- -----------------------------------------------------------------------------
create or replace function public.current_team_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select team_id from public.members where id = auth.uid()
$$;

revoke execute on function public.current_team_id() from public;
grant execute on function public.current_team_id() to authenticated;

-- -----------------------------------------------------------------------------
-- 暫定ポリシーを撤去
-- -----------------------------------------------------------------------------
drop policy if exists temporary_full_access on public.members;
drop policy if exists temporary_full_access on public.projects;
drop policy if exists temporary_full_access on public.tasks;
drop policy if exists temporary_full_access on public.streams;
drop policy if exists temporary_full_access on public.availabilities;
drop policy if exists temporary_full_access on public.notifications;

-- -----------------------------------------------------------------------------
-- RLS を有効化
--
-- force はしない。claim_membership / set_team_id_from_parent は security definer で
-- テーブル所有者として動くため、force しない限り RLS をバイパスできる。
-- -----------------------------------------------------------------------------
alter table public.members        enable row level security;
alter table public.projects       enable row level security;
alter table public.tasks          enable row level security;
alter table public.streams        enable row level security;
alter table public.availabilities enable row level security;
alter table public.notifications  enable row level security;

-- =============================================================================
-- members
--   読み取り: 同じチームのメンバー全員
--   更新    : 自分の行だけ（表示名・色・active_hours・push_token など）
--   追加/削除: クライアントには許可しない
--             （追加は claim_membership が definer で行う。削除は auth.users の
--              cascade に任せる）
-- =============================================================================
drop policy if exists members_select on public.members;
create policy members_select on public.members
  for select to authenticated
  using (team_id = public.current_team_id());

drop policy if exists members_update_self on public.members;
create policy members_update_self on public.members
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and team_id = public.current_team_id());

-- =============================================================================
-- projects / tasks / streams
--   同じチームなら読み書き自由（役割ベースの制限は P5 以降で足す。CLAUDE.md §3）
--   tasks.team_id / availabilities.team_id はトリガーが親から入れるので、
--   WITH CHECK も current_team_id() 一致で十分。
-- =============================================================================
drop policy if exists projects_team_all on public.projects;
create policy projects_team_all on public.projects
  for all to authenticated
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());

drop policy if exists tasks_team_all on public.tasks;
create policy tasks_team_all on public.tasks
  for all to authenticated
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());

drop policy if exists streams_team_all on public.streams;
create policy streams_team_all on public.streams
  for all to authenticated
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());

-- =============================================================================
-- availabilities（配信の出欠）
--   読み取り: 同じチーム全員（集約表示に使う）
--   書き込み: 自分の回答（member_id = 自分）だけ
-- =============================================================================
drop policy if exists availabilities_select on public.availabilities;
create policy availabilities_select on public.availabilities
  for select to authenticated
  using (team_id = public.current_team_id());

drop policy if exists availabilities_write_own on public.availabilities;
create policy availabilities_write_own on public.availabilities
  for all to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid() and team_id = public.current_team_id());

-- =============================================================================
-- notifications（お知らせ）
--   読み取り: 自分宛てだけ
--   更新    : 自分宛てだけ（既読化 read_at）
--   追加    : クライアント不可（P4 の業務トリガーが definer で発行する）
-- =============================================================================
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
