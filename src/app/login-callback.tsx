import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { COLORS, FONT_SIZE, SPACING } from '@/constants/theme';
import { useSession } from '@/lib/auth';

/**
 * web で Google ログインから戻ってくる先。
 *
 * web は `signInWithOAuth` のフルページ遷移で Google へ行き、
 * `<redirectTo>/login-callback?code=...` に戻ってくる（`src/app/login.tsx` の web 分岐）。
 * `supabase.ts` の `detectSessionInUrl`（web で true）が URL の code を自動で
 * セッションに交換し、`useSession` の `onAuthStateChange` がそれを拾う。
 *
 * ここは交換が終わるまでの繋ぎ表示だけを持つ:
 *   - セッションが張れたら `/`（→ `_layout.tsx` が合言葉画面かタブ画面へ振り分ける）
 *   - URL に `error=` が付いていた／一定時間セッションが張れなければ、ログイン画面へ戻す
 *
 * ネイティブは通常このルートに来ない（`WebBrowser` が戻り URL を横取りする）。
 * 来ても同じ挙動で無害。
 */
const FALLBACK_MS = 8000;

function urlError(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const desc = params.get('error_description') ?? hash.get('error_description');
  const code = params.get('error') ?? hash.get('error');
  if (desc) return desc;
  if (code) return code;
  return null;
}

export default function LoginCallbackScreen() {
  const { session } = useSession();
  const [gaveUp, setGaveUp] = useState(false);
  const [error] = useState<string | null>(urlError);

  useEffect(() => {
    if (session) return;
    const timer = setTimeout(() => setGaveUp(true), FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [session]);

  // セッションが張れた: 通常フローへ戻す
  if (session) return <Redirect href="/" />;

  // 認証エラー、またはタイムアウト: ログイン画面へ戻す
  if (error || gaveUp) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <ErrorView
            message={error ?? 'ログインを完了できませんでした。もう一度お試しください。'}
            onRetry={() => {
              if (typeof window !== 'undefined') window.location.replace('/login');
            }}
          />
          <Text style={styles.hint}>数秒待っても切り替わらない場合は「もう一度試す」を押してください</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <LoadingView label="ログイン処理中…" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  hint: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
