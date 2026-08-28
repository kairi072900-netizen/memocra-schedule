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
    // web だけは AsyncStorage を渡さない。web は supabase-js 既定の localStorage 実装に任せる
    // （非ブラウザ環境では安全に何もしないブラウザ判定つき）。
    // web 出力は `output: "single"`（SPA）で Node 上のプリレンダリングを経由しないため、
    // かつて `static` で起きた「window is not defined」は発生しない。
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // web / native とも、戻り URL の code は画面側で自前で exchangeCodeForSession する
    // （web=`src/app/login-callback.tsx`、native=`src/app/login.tsx`）。
    // 自動処理を有効にすると手動交換と二重になり「code 使用済み」で失敗するため false。
    detectSessionInUrl: false,
    // 戻り先 URL には token ではなく code だけを含める（PKCE 方式）。
    // code verifier は storage（web は localStorage）に入るので、フルページ遷移でも復元できる。
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
