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

### 1. Supabase CLI を入れる

```bash
brew install supabase/tap/supabase
```

### 2. プロジェクトに紐づける

```bash
supabase login
```

```bash
supabase link --project-ref <SupabaseプロジェクトのRef>
```

Ref は Supabase ダッシュボードの Project Settings → General で確認できます。

### 3. Gemini の API キーを登録する（`ai` 関数を使う場合のみ）

Google AI Studio（https://aistudio.google.com/apikey）でキーを発行してから:

```bash
supabase secrets set GEMINI_API_KEY=ここに貼る
```

**無料枠の条件は変わるので、使う前に必ず料金ページで確認してください。**
モデルは `ai/index.ts` の `MODEL` 定数1か所で切り替えられます。

### 4. デプロイ

```bash
supabase functions deploy sync-ics
```

```bash
supabase functions deploy ai
```

### 5. SQL を適用する

`supabase/migrations/` の `0004` `0005` `0006` を、番号順に SQL Editor へ貼って実行します
（これまでと同じ手順。何度実行しても安全です）。

`0006_meetings.sql` は Storage のバケット `meeting-audio` も作ります。

## 動作確認

- **外部カレンダー**: 設定画面 →「外部カレンダーの取り込み」で ICS URL を登録 →
  「いま取り込む」→ カレンダーに「外」印の灰色チップが出る
- **AI**: 新規登録画面の「文章から作る」に `来週の土曜20時から雑談配信` と入れて、
  フォームが埋まること

未デプロイのうちは、どちらも画面にエラーが出るだけで**アプリ本体は普通に動きます**。
