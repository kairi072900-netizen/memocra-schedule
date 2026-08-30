-- =============================================================================
-- メモクラ スケジュール管理アプリ / 議事録（meetings）と音声の置き場
--
-- 【使い方】Supabase ダッシュボードの SQL Editor に貼り付けて実行する。
-- 0005_external_calendars.sql の後。何度実行しても安全（冪等）。
--
-- 【要件定義書との関係】第7章に `meetings（v2）: id, team_id, held_on, agenda, minutes`
-- として定義がある。それに音声と抽出結果の列を足した形にしている。
--
-- 【流れ】手元（iPhone のボイスメモ等）で録音 → アプリからアップロード →
-- Edge Function `ai` が Gemini に投げて 文字起こし・要約・決定事項・ToDo を得る。
-- **アプリの中では録音しない**（iPhone Safari の録音は踏む問題が多く、
-- 既存のボイスメモで足りるため。2026-08-30 のユーザー判断）。
--
-- 【ToDo は自動でタスクにしない】抽出した ToDo は `todos` 列に置くだけで、
-- `tasks` に入れるのは人が選んだものだけ。担当と締切を人が確定させることが
-- このアプリの目的そのもの（CLAUDE.md §1）なので、ここを自動化してはいけない。
--
-- 【ロールバック】drop table public.meetings;
-- =============================================================================

create table if not exists public.meetings (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null default '7f3d2c10-9a4b-4c8e-b1d5-2e6f8a0c4b91',
  title        text not null default '',
  held_on      date not null default current_date,
  -- 会議前に書く議題。要件定義書 第7章の agenda
  agenda       text,
  -- 文字起こし（そのまま）。長いので画面では折りたたむ
  transcript   text,
  -- 要約。要件定義書 第7章の minutes
  minutes      text,
  -- 決定事項。1件1行のテキスト配列
  decisions    text[] not null default '{}',
  -- 抽出された ToDo。**自動ではタスクにしない**（上のコメント参照）
  todos        text[] not null default '{}',
  -- Storage の meeting-audio バケット内のパス。null なら音声なし（手打ちの議事録）
  audio_path   text,
  created_by   uuid references public.members(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists meetings_team_held_idx on public.meetings (team_id, held_on desc);

alter table public.meetings enable row level security;

drop policy if exists meetings_team_all on public.meetings;
create policy meetings_team_all on public.meetings
  for all to authenticated
  using (team_id = public.current_team_id())
  with check (team_id = public.current_team_id());

-- -----------------------------------------------------------------------------
-- 音声ファイルの置き場（Storage）
--
-- **公開バケットにしない。** 会議の録音は私的な会話を含みうる。
-- Edge Function は呼び出した人の JWT で署名URLを作って Gemini に渡す。
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('meeting-audio', 'meeting-audio', false)
on conflict (id) do nothing;

-- 同じチームのログイン済みメンバーだけが読み書きできる。
-- team_id をパスに含めていないので、判定は「members 行があるか」だけにしている
-- （単一チーム運用のため。マルチチーム対応 P8 でパスに team_id を入れて絞り込む）。
drop policy if exists meeting_audio_read on storage.objects;
create policy meeting_audio_read on storage.objects
  for select to authenticated
  using (bucket_id = 'meeting-audio' and public.current_team_id() is not null);

drop policy if exists meeting_audio_write on storage.objects;
create policy meeting_audio_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'meeting-audio' and public.current_team_id() is not null);

drop policy if exists meeting_audio_delete on storage.objects;
create policy meeting_audio_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'meeting-audio' and public.current_team_id() is not null);
