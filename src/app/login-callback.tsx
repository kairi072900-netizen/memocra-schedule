import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView, LoadingView } from '@/components/async-state';
import { COLORS, FONT_SIZE, SPACING } from '@/constants/theme';
import { useSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

/**
 * web で Google ログインから戻ってくる先。
 *
 * web は `signInWithOAuth` のフルページ遷移で Google へ行き、
 * `<origin>/login-callback?code=...` に戻ってくる（`src/app/login.tsx` の web 分岐）。
 * ここで戻り URL の `code` を `exchangeCodeForSession` に渡してセッションを張る
 * （`supabase.ts` の `detectSessionInUrl` は false。自動処理と二重にしない）。
 *
 *   - 交換成功 → `useSession` がセッションを検知 → `/`（`_layout.tsx` が合言葉/タブへ振り分け）
 *   - 交換失敗 or URL に `error=` → 原因の文言を出し、「もう一度」でログイン画面へ
 *
 * ネイティブは通常このルートに来ない（`WebBrowser` が戻り URL を横取りする）。
 */
const FALLBACK_MS = 10000;

function readParam(name: string): string | null {
  if (typeof window === 'undefined') return null;
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return search.get(name) ?? hash.get(name);
}

function initialError(): string | null {
  const desc = readParam('error_description');
  const code = readParam('error');
  return desc ?? code ?? null;
}

export default function LoginCallbackScreen() {
  const { session } = useSession();
  const [error, setError] = useState<string | null>(initialError);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (initialError()) return; // 交換以前に Google/Supabase 側で失敗している

    const code = readParam('code');
    if (!code) {
      setError('ログインの応答に認証コードが含まれていませんでした');
      return;
    }

    let cancelled = false;
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (cancelled) return;
      if (exchangeError) setError(exchangeError.message);
      // 成功時は onAuthStateChange 経由で useSession がセッションを拾い、下の Redirect が走る
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (session || error) return;
    const timer = setTimeout(() => setGaveUp(true), FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [session, error]);

  if (session) return <Redirect href="/" />;

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
          <Text style={styles.hint}>
            切り替わらない場合は「もう一度試す」を押してログインからやり直してください
          </Text>
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
