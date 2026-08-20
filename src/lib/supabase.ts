import { createClient } from '@supabase/supabase-js';

/**
 * Supabase クライアント。
 *
 * 【接続情報】`.env` から読む。**ハードコードしないこと**
 * （要件定義書 第8章「APIキーは環境変数、リポジトリに含めない」）。
 * キー名は `.env.example` を参照。値の入った `.env` は .gitignore で除外している。
 *
 * Expo ではクライアント側から読む環境変数に `EXPO_PUBLIC_` 接頭辞が必須。
 * 接頭辞付きの値はバンドルに埋め込まれて利用者から見えるため、
 * ここで扱ってよいのは anon キーだけ。**service_role キーは絶対に置かない。**
 * anon キーは公開前提で、データを守るのは RLS の役目。
 */

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase の接続情報が設定されていません。\n' +
      '`cp .env.example .env` を実行し、Supabase ダッシュボードの\n' +
      'Project Settings > API から URL と anon キーを転記してください。\n' +
      '.env を書き換えたら開発サーバーを再起動する必要があります。',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 【次のプロンプトで変更する】
    // セッションの永続化には AsyncStorage の設定が要る。認証と同時に入れる。
    // 今は保存先が無いまま persistSession を有効にしても壊れるだけなので切っておく。
    persistSession: false,
    autoRefreshToken: false,
    // URLからセッションを拾うのはWeb用の挙動。React Nativeでは使わない
    detectSessionInUrl: false,
  },
});
