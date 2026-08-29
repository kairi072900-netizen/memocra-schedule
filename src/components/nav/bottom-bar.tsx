import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { BOTTOM_BAR_ITEMS } from '@/components/nav/items';
import { PixelIcon } from '@/components/pixel/icon';
import { BORDER_WIDTH, COLORS, LAYOUT, SPACING, TAB_LABEL } from '@/constants/theme';

/**
 * モバイル用の下タブバー（要件定義書 12.3）。
 *
 * **9項目のうち5つだけを描く**（`BOTTOM_BAR_ITEMS`）。
 * 375pt端末ではタブ1つに65pxしか使えず、9つ並べるとラベルが読めなくなるため
 * （CLAUDE.md §3.1 の経緯）。残り4画面へは画面内リンクから辿る
 * （`src/components/nav/items.tsx` の約束）。
 *
 * ナビゲーションの型には依存せず、現在地とコールバックを素の値で受ける（§4）。
 */
export function BottomBar({
  currentRouteName,
  onNavigate,
}: {
  currentRouteName: string | undefined;
  onNavigate: (routeName: string) => void;
}) {
  // ホームバーのある端末で、タブが画面の縁に被らないようにする
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {BOTTOM_BAR_ITEMS.map((item) => {
        const active = item.name === currentRouteName;
        const color = active ? COLORS.text : COLORS.textMuted;
        return (
          <Pressable key={item.name} style={styles.item} onPress={() => onNavigate(item.name)}>
            <PixelIcon
              name={item.icon}
              size={LAYOUT.tabIconSize}
              color={color}
              secondaryColor={COLORS.surface}
            />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {item.shortLabel ?? item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    // 角丸なし。上辺だけ濃色の硬い境界にする
    borderTopWidth: BORDER_WIDTH.normal,
    borderTopColor: COLORS.frameDark,
    paddingTop: SPACING.xs,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: BORDER_WIDTH.normal,
    height: LAYOUT.tabBarHeight - SPACING.xs,
  },
  /** ドット絵17pxでは「プロジェクト」が収まらないため、ここだけゴシック（§3.1の例外） */
  label: { ...TAB_LABEL, textAlign: 'center' },
});
