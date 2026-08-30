# Supabase Edge Functions

このディレクトリは **Deno** で動くサーバー関数です。アプリ本体（Expo / React Native）とは
別のランタイムなので、`tsconfig.json` の `exclude` で本体の型チェックから外してあります。

## なぜサーバーが要るのか

| 関数 | 理由 |
|---|---|
| `sync-ics` | ブラウザから ICS の URL を直接 fetch すると **CORS で弾かれる**。外部カレンダー連携には AI と無関係にこれが必須 |
| `ai` | **API キーをアプリに埋め込めない**（バンドルに見える。CLAUDE.md §3.5）。キーはサーバーの環境変数に置く |

## 鍵の扱い（CLAUDE.md §3.5）

- **`service_role` キーは使いません。** クライアントから届いたユーザーの JWT で
  Supabase クライアントを作るので、RLS（`0003_rls.sql` の `current_team_id()`）が
  そのまま効きます。`service_role` を使うと RLS を無視できてしまい、チーム分離が壊れます。
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` は Supabase が自動で入れてくれます。
- `GEMINI_API_KEY` だけ手で登録します（下記）。

## デプロイ手順（ユーザー作業）

私（Claude）にはできない作業です。順に実行してください。
このリポジトリの Supabase プロジェクト Ref は **`heqkeflguxahvrmfunvg`** です
（`.env` の `EXPO_PUBLIC_SUPABASE_URL` の `https://<ref>.supabase.co` から取れます）。

**Docker は不要です。** Supabase CLI v2 の `functions deploy` は Docker なしで
バンドル・デプロイします（Docker が要るのは `supabase start` のローカルスタックだけ）。

### 1. SQL を先に適用する

`supabase/migrations/` の `0004_goals.sql` → `0005_external_calendars.sql`
→ `0006_meetings.sql` を、この順で Supabase ダッシュボードの **SQL Editor** に
貼って実行します（これまでと同じ手順。何度実行しても安全です）。

`0006_meetings.sql` は Storage のバケット `meeting-audio`（非公開）も作ります。

**`supabase db push` は使わないこと。** これまで migration を手貼りで運用してきたので、
`db push` は 0001 から全部を流し直そうとして既存オブジェクトで失敗します。

### 2. Supabase CLI を入れる

Homebrew は不要。npm の devDependency として入れて `npx` で呼びます。

```bash
npm install --save-dev supabase
```

以降のコマンドはすべて `npx supabase ...` で実行します。

### 3. ログインしてプロジェクトに紐づける

```bash
npx supabase login
```

ブラウザが開くので承認します（アクセストークンが `~/.supabase/` に保存される）。

```bash
npx supabase link --project-ref heqkeflguxahvrmfunvg
```

DB パスワードを聞かれますが、**空のまま Enter で飛ばして構いません**
（functions と secrets の操作にはパスワード不要）。

### 4. Gemini の API キーを登録する（`ai` 関数を使う場合のみ）

Google AI Studio（https://aistudio.google.com/apikey）で「Create API key」。

```bash
npx supabase secrets set GEMINI_API_KEY=ここに貼る
```

`SUPABASE_URL` / `SUPABASE_ANON_KEY` などは Supabase が自動で入れるので設定不要。
登録するのは `GEMINI_API_KEY` の1つだけです。

**無料枠の条件は変わるので、使う前に必ず料金ページで確認してください。**
モデルは `_shared/gemini.ts` の `MODEL` 定数1か所（`gemini-2.0-flash`）で切り替えられます。

### 5. デプロイ

```bash
npx supabase functions deploy sync-ics
```

```bash
npx supabase functions deploy ai
```

JWT 検証はデフォルトの ON のままにします（`_shared/auth.ts` でも自前で確認しますが、
Supabase ゲートウェイの検証も残しておいたほうが安全）。
`--no-verify-jwt` は付けないこと。

デプロイ結果は Dashboard → Edge Functions で確認できます。
`npx supabase functions list` でも一覧が出ます。

## 動作確認

- **外部カレンダー**: 設定画面 →「外部カレンダーの取り込み」で ICS URL を登録 →
  「いま取り込む」→ カレンダーに「外」印の灰色チップが出る
- **AI**: 新規登録画面の「文章から作る」に `来週の土曜20時から雑談配信` と入れて、
  フォームが埋まること

未デプロイのうちは、どちらも画面にエラーが出るだけで**アプリ本体は普通に動きます**。
