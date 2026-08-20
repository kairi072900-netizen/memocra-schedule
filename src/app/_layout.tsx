import { DotGothic16_400Regular, useFonts } from '@expo-google-fonts/dotgothic16';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { COLORS } from '@/constants/theme';

// フォント読み込みが終わるまでスプラッシュを出したままにする。
// 先に画面を出すとOS標準フォント → ドット絵フォントの切り替わりがちらつく。
SplashScreen.preventAutoHideAsync();

/**
 * ルートレイアウト。
 * P0ではタブバーもテーマプロバイダも置かず、Stack1本のみ。
 * 下部タブバー（ホーム / プロジェクト / ＋ / 出欠 / お知らせ）は
 * 画面が揃ってから追加する（要件定義書 12.8）。
 */
export default function RootLayout() {
  // キー名は FONT_FAMILY.pixel と一致させること。
  const [fontsLoaded, fontError] = useFonts({ DotGothic16_400Regular });

  useEffect(() => {
    // 読み込みに失敗した場合もスプラッシュを閉じる。
    // フォントが無くてもOS標準フォントで表示はできるため、起動不能にはしない。
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
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
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
