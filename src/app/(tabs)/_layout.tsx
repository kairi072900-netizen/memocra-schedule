import { Stack } from 'expo-router';

/**
 * タブグループのレイアウト。
 * **下部タブバー（ホーム / プロジェクト / ＋ / 出欠 / お知らせ）は次のステップで足す。**
 * 今はカレンダー1画面しか無いので、Stackだけ置いてルートグループの形を先に作っておく。
 */
export default function TabsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
