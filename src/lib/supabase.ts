import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
// Supabase-js は内部で URL を扱うが、React Native の JS エンジンには
// 完全な URL 実装が無い。ポリフィルを読み込むだけでよく、呼び出しはしない。
import 'react-native-url-polyfill/auto';

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
    // ログイン状態を端末に保存する。次に開いたときも再ログイン不要にするため。
    //
    // web だけは AsyncStorage を渡さない。このプロジェクトの web 出力は
    // Expo Router の static rendering（Node上でのサーバーレンダリング）を経由するが、
    // AsyncStorageのweb実装は `window.localStorage` を直接叩くため、
    // window が存在しないNode環境で「window is not defined」で落ちる。
    // supabase-js は storage を渡さなければブラウザ判定つきの既定実装
    // （非ブラウザ環境では安全に何もしない）にフォールバックするため、
    // web はそちらに任せる。
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // URLからセッションを拾うのはWeb用の挙動。React Nativeでは使わない
    detectSessionInUrl: false,
    // Googleログインの戻り先URLには token ではなく code だけを含める（PKCE方式）。
    // React Nativeでは戻り先URLの断片（#access_token=...）を手で解析するより確実
    flowType: 'pkce',
  },
});

/**
 * アプリがバックグラウンドにいる間はトークンの自動更新を止め、
 * フォアグラウンドに戻ったら再開する（Supabase公式の推奨パターン）。
 * これを呼ばないと、バックグラウンドで期限切れになったトークンが
 * 復帰後も更新されない場合がある。
 */
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
