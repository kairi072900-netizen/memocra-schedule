-- =============================================================================
-- メモクラ スケジュール管理アプリ / 認証（Googleログイン + 合言葉）
--
-- 【使い方】Supabase ダッシュボードの SQL Editor に貼り付けて実行する。
-- 0001_init.sql の後に実行すること（members テーブルが前提）。
--
-- 【要件定義書との差分】要件定義書 第9章は「メールOTP（マジックリンク）」を
-- 認証方式としているが、ユーザーの明示的な指示により **Googleアカウントでの
-- ログインのみ** に変更した（そのほうがユーザーにとって楽なため）。
-- CLAUDE.md §5.3 にこの決定を記録している。
--
-- 【方式（2026-08-27改訂）】当初は「許可リスト（メールアドレスを事前登録）」で
-- 制限する設計にしていたが、4人ぶんのメールアドレスを事前に集めるのが難しいため、
-- **「合言葉」方式に変更した。** Googleアカウントでのログイン自体は誰でもできるが、
-- 初回ログイン後に合言葉を入力しないと `members` 行が作られず、アプリの中には入れない。
-- 合言葉はLINE/Discord等で4人にまとめて伝えれば済み、メールアドレスを個別に
-- 集める必要が無い。
--
-- 【この方式の限界（正直な注記）】`team_passcode` は平文で保存する。
-- **これは見知らぬ人を締め出すためのもので、本気の攻撃者を防ぐものではない。**
-- 4人しか使わないアプリでは、これで十分というCLAUDE.md全体の判断に沿っている。
-- 本当の意味でデータを守るのはRLSの役目（CLAUDE.md §3.5）で、RLSは別ステップで有効化する。
--
-- 【このマイグレーションでやらないこと】
--   - RLSの有効化（引き続き別ステップ）
--   - Google OAuthプロバイダそのものの設定（Supabase Dashboardでの手作業が必要）
-- =============================================================================

-- =============================================================================
-- members.id → auth.users.id の外部キーを有効化
--
-- 0001_init.sql でコメントアウトして用意していたもの。認証実装のタイミングで張る。
-- アクセス制限（合言葉）とは別の話＝データの整合性のための制約なので、
-- 認証方式が変わっても変更しない。
-- =============================================================================
alter table public.members
  add constraint members_id_fkey foreign key (id) references auth.users(id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 合言葉
--
-- 1行だけを持つ表。ここに書いた文字列と一致した人だけが members 行を作れる。
-- 実行後、必ず本番の合言葉に書き換えること：
--
--   update public.team_passcode set passcode = '実際に4人へ伝える合言葉';
--
-- そのうえで、決めた合言葉をLINEやDiscordなどで4人に伝える。
-- -----------------------------------------------------------------------------
create table public.team_passcode (
  passcode text not null
);

insert into public.team_passcode (passcode) values ('changeme'); -- 【要変更】仮の値

-- =============================================================================
-- 合言葉が合っていれば members 行を作る
--
-- security definer にしている理由は2つ：
--   1. 一般ロールには auth.users への SELECT 権限が無く、素のroleでは
--      auth.users.email を読めないため（表示名の仮値として使う）
--   2. RLSをまだ有効化していない今の段階でも、少なくとも
--      「合言葉を知らない人には members 行を作らせない」という制御だけは
--      DB側で確実に効かせるため
-- =============================================================================
create or replace function public.claim_membership(input_passcode text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  if auth.uid() is null then
    raise exception 'ログインしていません';
  end if;

  -- 既に members 行があるなら何もしない（二重送信・再入力対策）
  if exists (select 1 from public.members where id = auth.uid()) then
    return;
  end if;

  if not exists (select 1 from public.team_passcode where passcode = input_passcode) then
    raise exception '合言葉が違います';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  insert into public.members (id, name, color)
  values (auth.uid(), split_part(coalesce(v_email, 'member'), '@', 1), '#7A7A7A');
end;
$$;

-- ログイン済みの人（authenticated ロール）だけが呼べるようにする。
-- 未ログイン（anon）から呼ばれても auth.uid() が null なので拒否されるが、念のため権限自体も絞る。
revoke execute on function public.claim_membership(text) from public;
grant execute on function public.claim_membership(text) to authenticated;
