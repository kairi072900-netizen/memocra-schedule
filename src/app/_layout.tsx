import { DotGothic16_400Regular, useFonts } from '@expo-google-fonts/dotgothic16';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { COLORS } from '@/constants/theme';
import { useSession } from '@/lib/auth';

// フォント読み込みが終わるまでスプラッシュを出したままにする。
// 先に画面を出すとOS標準フォント → ドット絵フォントの切り替わりがちらつく。
SplashScreen.preventAutoHideAsync();

/**
 * ルートレイアウト。
 *
 * ログイン状態＋メンバー登録状態で画面を出し分ける（`Stack.Protected`）。
 * ログインはGoogleアカウントのみ（要件定義書のメールOTPから変更。CLAUDE.md §5.3）。
 *
 *   未ログイン                          → login
 *   ログイン済み・合言葉がまだ           → claim
 *   ログイン済み・合言葉を通ってメンバー → (tabs)
 *
 * 「合言葉がまだ」は、Googleアカウントは持っているが `members` 行がまだ無い状態
 * （`supabase/migrations/0002_auth.sql` の `claim_membership` を参照）。
 */
export default function RootLayout() {
  // キー名は FONT_FAMILY.pixel と一致させること。
  const [fontsLoaded, fontError] = useFonts({ DotGothic16_400Regular });

  const { session, hasMembership } = useSession();

  // undefined = まだ確認中の状態。フォント読み込みと同じく、確認が終わるまでスプラッシュを維持する
  const authResolved = session !== undefined && (session === null || hasMembership !== undefined);

  useEffect(() => {
    // 読み込みに失敗した場合もスプラッシュを閉じる。
    // フォントが無くてもOS標準フォントで表示はできるため、起動不能にはしない。
    if ((fontsLoaded || fontError) && authResolved) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, authResolved]);

  if ((!fontsLoaded && !fontError) || !authResolved) {
    return null;
  }

  const isMember = session !== null && hasMembership === true;
  const needsClaim = session !== null && hasMembership === false;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background },
        }}
      >
        {/* index は /calendar への Redirect のみ。(tabs) と同じ保護グループに入れる。
            未宣言のルートは Stack.Protected の対象外になる（＝保護されない）ため、
            ログイン後に見せたいルートはすべてここに明示する */}
        <Stack.Protected guard={isMember}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={needsClaim}>
          <Stack.Screen name="claim" />
        </Stack.Protected>
        <Stack.Protected guard={session === null}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
