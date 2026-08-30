import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { ErrorView } from '@/components/async-state';
import { PixelFrame } from '@/components/pixel/frame';
import { SceneryCastle } from '@/components/pixel/scenery';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

/**
 * ログイン画面。**Googleアカウントでのログインのみ**（要件定義書はメールOTPだったが、
 * ユーザーの指示によりGoogleに変更した。CLAUDE.md §5.3 参照）。
 *
 * Googleアカウントであれば誰でもログイン自体はできる。メンバー限定にする制限は
 * ログイン後の合言葉入力（`src/app/claim.tsx`）で行っている
 * （`supabase/migrations/0002_auth.sql` の `claim_membership`）。
 *
 * ログインの往復は web とネイティブで方式が違う:
 *   - web: `signInWithOAuth` のフルページ遷移で Google へ飛び、`/login-callback` に戻る。
 *     戻り URL の `?code=` は `supabase.ts` の `detectSessionInUrl`（web で true）が
 *     自動でセッションに交換する。繋ぎ表示は `src/app/login-callback.tsx`。
 *   - native: `WebBrowser` の在アプリブラウザで開き、戻り URL を受け取って
 *     `exchangeCodeForSession` を自前で呼ぶ（web には `WebBrowser` の戻り値横取りが無い）。
 */
export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      // アプリに戻ってくるためのURL。web は origin + /login-callback、
      // native は scheme（app.json の "memocra"）から作られる
      const redirectTo = Linking.createURL('login-callback');

      if (Platform.OS === 'web') {
        // web: フルページ遷移で Google へ。成功時はこの後ブラウザが遷移するので戻らない。
        // 戻り先 /login-callback で detectSessionInUrl がセッションを張る。
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo },
        });
        if (oauthError) {
          throw new Error(oauthError.message);
        }
        return;
      }

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
        throw new Error(exchangeError.message);
      }
      // 成功時は useSession（src/lib/auth.ts）が検知して claim 画面へ切り替わる。
      // メンバー未登録（合言葉が済んでいない）なら claim.tsx、済んでいれば (tabs) へ進む
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
          {/* 起動画面は風景を出してよい場所（要件定義書 12.5 / §3.1） */}
          <SceneryCastle width={LAYOUT.sceneryWidth} />
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
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { fontSize: FONT_SIZE.body },
});
