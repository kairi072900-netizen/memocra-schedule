import { Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';

import { Text } from '@/components/app-text';
import { BORDER_WIDTH, COLORS, LAYOUT, SPACING, TAB_LABEL } from '@/constants/theme';

/**
 * 下部タブバー（要件定義書 12.3）。
 *
 * アイコンはドット絵が未作成のため、今はラベルのみ。アイコンができたら `tabBarIcon` を足す。
 * 中央の「＋」は新規登録のFAB相当。今はタブの1つとして置いてある。
 *
 * カレンダー（S0）は現時点ではホームタブの中身。
 * S1「ホーム（今週）」を作る段階で、カレンダーを別タブに分けるか見直す。
 */

/**
 * ラベルを自前で描く。
 * React Navigation の既定ラベルは `maxWidth` が効いていて、
 * 「プロジェクト」がタブ幅に収まるサイズでも省略されてしまうため。
 */
function tabLabel(label: string) {
  return ({ color }: { color: ColorValue }) => (
    <Text style={[styles.label, { color }]} numberOfLines={1}>
      {label}
    </Text>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.textMuted,
        // ドット絵アイコンが未作成の間はラベルのみで見せる。
        // これを省くと React Navigation が既定のプレースホルダ（⏷）を描いてしまう
        tabBarIcon: () => null,
        // 角丸なし。上辺だけ濃色の硬い境界にする（CLAUDE.md §3.1）
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: BORDER_WIDTH.normal,
          borderTopColor: COLORS.frameDark,
          // アイコン枠は tabBarIcon が null でも確保されるため、その分の高さを見込む。
          // ドット絵アイコンを作ったらこの枠にそのまま入る
          height: LAYOUT.tabBarHeight,
          paddingTop: SPACING.xs,
        },
      }}
    >
      <Tabs.Screen name="calendar" options={{ title: 'ホーム', tabBarLabel: tabLabel('ホーム') }} />
      <Tabs.Screen
        name="projects"
        options={{ title: 'プロジェクト', tabBarLabel: tabLabel('プロジェクト') }}
      />
      <Tabs.Screen name="new" options={{ title: '＋', tabBarLabel: tabLabel('＋') }} />
      <Tabs.Screen
        name="availability"
        options={{ title: '出欠', tabBarLabel: tabLabel('出欠') }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'お知らせ', tabBarLabel: tabLabel('お知らせ') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { ...TAB_LABEL, textAlign: 'center' },
});
