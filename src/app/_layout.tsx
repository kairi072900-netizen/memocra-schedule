import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

/**
 * ルートレイアウト。
 * P0ではタブバーもテーマプロバイダも置かず、Stack1本のみ。
 * 下部タブバー（ホーム / プロジェクト / ＋ / 出欠 / お知らせ）は
 * 画面が揃ってから追加する（要件定義書 12.8）。
 */
export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}
