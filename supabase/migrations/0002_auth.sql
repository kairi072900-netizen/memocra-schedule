-- =============================================================================
-- メモクラ スケジュール管理アプリ / 認証（Googleログイン + 許可リスト）
--
-- 【使い方】Supabase ダッシュボードの SQL Editor に貼り付けて実行する。
-- 0001_init.sql の後に実行すること（members テーブルが前提）。
--
-- 【要件定義書との差分】要件定義書 第9章は「メールOTP（マジックリンク）」を
-- 認証方式としているが、ユーザーの明示的な指示により **Googleアカウントでの
-- ログインのみ** に変更した（そのほうがユーザーにとって楽なため）。
-- CLAUDE.md §5.3 にこの決定を記録している。
--
-- 【方式】画面側でのチェック（サインイン後にメールを確認してダメなら
-- サインアウトする方式）は、一瞬でも本物のセッションが作られてしまう。
-- そこで `auth.users` へのINSERT自体をDBのトリガーで拒否する。
-- `set_team_id_from_parent`（0001_init.sql）と同じ「クライアントを信用せず
-- DB側で守る」考え方の延長線上。
--
-- 【このマイグレーションでやらないこと】
--   - RLSの有効化（引き続き別ステップ）
--   - Google OAuthプロバイダそのものの設定（Supabase Dashboardでの手作業が必要）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 許可リスト
--
-- ここに載っているメールアドレスの人だけが、初回ログイン（＝アカウント作成）できる。
-- 今はユーザー自身の動作確認用アドレスのみ登録している。
-- メンバー4人ぶんのメールアドレスが揃ったら、1行ずつ追加すればよい：
--
--   insert into public.allowed_emails (email) values ('本人のメールアドレス');
--
-- メールアドレスの大文字/小文字は区別しない（Googleアカウントの実運用に合わせる）。
-- -----------------------------------------------------------------------------
create table public.allowed_emails (
  email text primary key
);

insert into public.allowed_emails (email) values
  ('kairi072900@gmail.com'); -- 動作確認用（ユーザー自身。本番の4人ではない）

-- =============================================================================
-- members.id → auth.users.id の外部キーを有効化
--
-- 0001_init.sql でコメントアウトして用意していたもの。認証実装のタイミングで張る。
-- =============================================================================
alter table public.members
  add constraint members_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- =============================================================================
-- 許可リストに無いメールでのサインアップを拒否する
-- =============================================================================
create or replace function public.reject_unknown_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_emails where lower(email) = lower(new.email)
  ) then
    raise exception 'このメールアドレスは登録されていません: %', new.email
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger auth_users_reject_unknown_email
  before insert on auth.users
  for each row execute function public.reject_unknown_email();

-- =============================================================================
-- 許可された人が初めてログインしたら members 行を自動作成する
--
-- name はメールのローカル部分を仮の表示名として使う。color は暫定色。
-- **本名・役割・識別色は、あとでSupabaseのTable Editorから手直しする**
-- （4人しかいないので、この一手間はコストに見合う）。
-- =============================================================================
create or replace function public.create_member_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.members (id, name, color)
  values (new.id, split_part(new.email, '@', 1), '#7A7A7A');
  return new;
end;
$$;

create trigger auth_users_create_member
  after insert on auth.users
  for each row execute function public.create_member_for_new_user();
