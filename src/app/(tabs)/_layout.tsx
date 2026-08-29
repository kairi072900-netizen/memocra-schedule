import { Tabs } from 'expo-router';
import { StyleSheet, type ColorValue } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelIcon, type PixelIconName } from '@/components/pixel/icon';
import { BORDER_WIDTH, COLORS, LAYOUT, SPACING, TAB_LABEL } from '@/constants/theme';

/**
 * 下部タブバー（要件定義書 12.3）。
 *
 * 中央の「＋」は新規登録のFAB相当。今はタブの1つとして置いてある。
 *
 * カレンダー（S0）は現時点ではホームタブの中身。
 * S1「ホーム（今週）」を作る段階で、カレンダーを別タブに分けるか見直す。
 *
 * 【ラベルのフォント】ドット絵アイコンが付いた後も `TAB_LABEL`（ゴシック10px）のまま。
 * アイコンがあれば「プロジェクト」を短縮できるかを検討したが、
 * 「企画」等に言い換えると requirements の用語（プロジェクト＝動画1本）とずれるため見送った。
 * 17pxのドット絵フォントに戻すには、375pt端末で使える65pxに全角6文字が収まる必要がある
 * （CLAUDE.md §3.1 の例外の経緯を参照）。
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

/**
 * アクティブ/非アクティブの色は React Navigation が渡してくるものを使う。
 * `ColorValue` はプラットフォーム固有の不透明値も取りうるため、
 * SVG の fill に渡せる文字列のときだけ採用し、それ以外は既定色にフォールバックする。
 */
function tabIcon(name: PixelIconName) {
  return ({ color }: { color: ColorValue }) => (
    <PixelIcon
      name={name}
      size={LAYOUT.tabIconSize}
      color={typeof color === 'string' ? color : COLORS.text}
      secondaryColor={COLORS.surface}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.text,
        tabBarInactiveTintColor: COLORS.textMuted,
        // 角丸なし。上辺だけ濃色の硬い境界にする（CLAUDE.md §3.1）
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: BORDER_WIDTH.normal,
          borderTopColor: COLORS.frameDark,
          height: LAYOUT.tabBarHeight,
          paddingTop: SPACING.xs,
        },
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{ title: 'ホーム', tabBarLabel: tabLabel('ホーム'), tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'プロジェクト',
          tabBarLabel: tabLabel('プロジェクト'),
          tabBarIcon: tabIcon('projects'),
        }}
      />
      <Tabs.Screen
        name="new"
        options={{ title: '＋', tabBarLabel: tabLabel('新規'), tabBarIcon: tabIcon('plus') }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: '出欠',
          tabBarLabel: tabLabel('出欠'),
          tabBarIcon: tabIcon('availability'),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'お知らせ',
          tabBarLabel: tabLabel('お知らせ'),
          tabBarIcon: tabIcon('notifications'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  label: { ...TAB_LABEL, textAlign: 'center' },
});
