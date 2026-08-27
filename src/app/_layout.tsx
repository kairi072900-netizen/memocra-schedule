import { DotGothic16_400Regular, useFonts } from '@expo-google-fonts/dotgothic16';
import type { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { COLORS } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// フォント読み込みが終わるまでスプラッシュを出したままにする。
// 先に画面を出すとOS標準フォント → ドット絵フォントの切り替わりがちらつく。
SplashScreen.preventAutoHideAsync();

/**
 * ルートレイアウト。
 *
 * ログイン状態で画面を出し分ける（`Stack.Protected`）。
 * ログイン済みなら `(tabs)` 配下、未ログインなら `login` だけが見える。
 * ログインはGoogleアカウントのみ。許可された4人以外はDB側のトリガーで拒否される
 * （`supabase/migrations/0002_auth.sql`。CLAUDE.md §5.3参照）。
 */
export default function RootLayout() {
  // キー名は FONT_FAMILY.pixel と一致させること。
  const [fontsLoaded, fontError] = useFonts({ DotGothic16_400Regular });

  // undefined = まだ確認中。null = 未ログイン。フォント読み込みと同じく、
  // 確認が終わるまではスプラッシュを維持する
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // 読み込みに失敗した場合もスプラッシュを閉じる。
    // フォントが無くてもOS標準フォントで表示はできるため、起動不能にはしない。
    if ((fontsLoaded || fontError) && session !== undefined) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, session]);

  if ((!fontsLoaded && !fontError) || session === undefined) {
    return null;
  }

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
        <Stack.Protected guard={session !== null}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={session === null}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}
