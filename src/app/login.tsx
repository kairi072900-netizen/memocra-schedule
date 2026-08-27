import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView } from '@/components/async-state';
import { PixelFrame } from '@/components/pixel/frame';
import { BORDER_WIDTH, COLORS, FONT_SIZE, SPACING } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * ログイン画面。**Googleアカウントでのログインのみ**（要件定義書はメールOTPだったが、
 * ユーザーの指示によりGoogleに変更した。CLAUDE.md §5.3 参照）。
 *
 * 「けん / らてん / 南場テル / ゆず」のメールアドレスだけがログインできる。
 * 制限はDB側のトリガーで行っている（`supabase/migrations/0002_auth.sql`）ため、
 * ここでは拒否されたときのエラー表示だけを担当する。
 */
export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      // アプリに戻ってくるためのURL。scheme は app.json の "memocra" から作られる
      const redirectTo = Linking.createURL('login-callback');

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (oauthError || !data.url) {
        throw new Error(oauthError?.message ?? 'ログインURLの取得に失敗しました');
      }

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') {
        // ユーザーがブラウザを閉じた等。エラー表示は不要
        return;
      }

      // PKCE方式なので、戻り先URLには token ではなく code だけが含まれる
      const { queryParams } = Linking.parse(result.url);
      const code = typeof queryParams?.code === 'string' ? queryParams.code : null;
      if (!code) {
        throw new Error('ログインの応答からcodeを取得できませんでした');
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        // 許可リストに無いメールで拒否された場合もここに来る
        // （supabase/migrations/0002_auth.sql の reject_unknown_email トリガー）
        throw new Error(
          'このメールアドレスは登録されていません。管理者に確認してください。',
        );
      }
      // 成功時は onAuthStateChange（src/app/_layout.tsx）が検知してタブ画面へ切り替わる
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <PixelFrame style={styles.frame}>
          <Text style={styles.title}>メモクラ</Text>
          <Text style={styles.subtitle}>スケジュール管理</Text>

          <Pressable
            onPress={handleGoogleLogin}
            disabled={loading}
            style={[styles.button, loading && styles.buttonDisabled]}
          >
            <Text style={styles.buttonText}>
              {loading ? 'ログイン中…' : 'Googleでログイン'}
            </Text>
          </Pressable>

        </PixelFrame>

        {error && <ErrorView message={error} onRetry={handleGoogleLogin} />}
      </View>
    </SafeAreaView>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg },
  frame: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  title: { fontSize: FONT_SIZE.title },
  subtitle: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xxl,
  },
  button: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: FONT_SIZE.body },
});
