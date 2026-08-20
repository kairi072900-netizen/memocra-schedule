# メモクラ スケジュール管理アプリ

グループYouTuber「メモリークラフト」（4名）向けのスケジュール／制作パイプライン管理アプリ。

- 仕様: `メモクラ_スケジュール管理アプリ_要件定義書_v0.4.md`
- 開発ルール: [CLAUDE.md](./CLAUDE.md) ← 作業前に必ず読む

## 現在地

**P0**: ダミーデータでカレンダーUIを作る段階。外部API・DBには接続しない。

## 開発

```bash
npm install
npx expo start
```

型チェック:

```bash
npx tsc --noEmit
```

## 技術スタック

| 領域 | 採用 |
|---|---|
| フロント | Expo (React Native) + Expo Router / TypeScript |
| バックエンド | Supabase (Postgres / Auth / RLS) — P1以降 |
| リアルタイム | Supabase Realtime — P1以降 |
| 通知 | Expo Notifications + Supabase Edge Functions — P4 |
