-- =============================================================================
-- メモクラ スケジュール管理アプリ / 目標（goals）
--
-- 【使い方】Supabase ダッシュボードの SQL Editor に貼り付けて実行する。
-- 0001_init.sql / 0002_auth.sql / 0003_rls.sql の後。何度実行しても安全（冪等）。
--
-- 【なぜ作るか】要件定義書に「目標」の定義は無い（成功指標はあるが、
-- それはアプリの評価軸であってチームが自分で立てる目標ではない）。
-- ユーザーの要望で追加した機能で、**短期／中長期の2軸**を持つのが要点。
--
-- 【3つのスコープ】
--   team    … チーム全体（登録者数・月の投稿本数など）
--   member  … メンバー個人（今月はサムネ10枚 など）
--   project … 企画1本ごと（この動画で狙うこと）
-- スコープごとに対象列が変わるので、CHECK 制約で整合を保証する
-- （member スコープなのに project_id が入っている、のような状態を作らせない）。
--
-- 【Lv とは別物】`src/lib/level.ts` の加点型レベルには一切影響しない。
-- レベルは完了タスク数だけで決まる（CLAUDE.md §2「level.ts に減る要素を足さない」）。
-- 目標は「達成できなかった」があり得るので、混ぜてはいけない。
--
-- 【ロールバック】drop table public.goals;
-- =============================================================================

create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  team_id       uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',

  scope         text not null check (scope in ('team', 'member', 'project')),
  -- 短期（今月・今四半期）/ 中長期（半年・1年）
  horizon       text not null check (horizon in ('short', 'long')),

  -- スコープに応じた対象。使わないほうは NULL（下の CHECK で強制する）
  member_id     uuid references public.members(id) on delete cascade,
  project_id    uuid,

  title         text not null,
  -- 「登録者数」「投稿本数」など。自由記述。単位はここに書いてもらう
  metric        text,
  target_value  numeric,
  current_value numeric not null default 0,
  due_on        date,

  status        text not null default 'active'
                check (status in ('active', 'achieved', 'dropped')),
  created_at    timestamptz not null default now(),

  -- 親子で team_id がずれることを DB レベルで防ぐ（tasks と同じ作法。CLAUDE.md §5.1）
  constraint goals_project_fkey foreign key (project_id, team_id)
    references public.projects(id, team_id) on delete cascade,

  -- スコープと対象列の整合。アプリ側のバグでも壊れた行が入らないようにする
  constraint goals_scope_target check (
    (scope = 'team'    and member_id is null     and project_id is null) or
    (scope = 'member'  and member_id is not null and project_id is null) or
    (scope = 'project' and member_id is null     and project_id is not null)
  )
);

create index if not exists goals_team_idx    on public.goals (team_id);
create index if not exists goals_member_idx  on public.goals (member_id);
create index if not exists goals_project_idx on public.goals (project_id);

-- -----------------------------------------------------------------------------
-- RLS。projects / tasks と同型（同じチームなら読み書き自由）。
--
-- 個人の目標も**チーム内では見える**。4人のチームで「誰が何を目指しているか」が
-- 共有されているほうが、金曜会議の材料になるため。
-- 役割ベースの制限は必要になってから足す（0003_rls.sql と同じ判断）。
-- -----------------------------------------------------------------------------
alter table public.goals enable row level security;

drop policy if exists goals_team_all on public.goals;
create policy goals_team_all on public.goals
  for all to authenticated
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());
