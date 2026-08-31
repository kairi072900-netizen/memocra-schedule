import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { BOTTOM_BAR_ITEMS, MORE_ITEMS, type NavItem } from '@/components/nav/items';
import { PixelIcon } from '@/components/pixel/icon';
import { NotifyBadge } from '@/components/ui/badge';
import { Panel } from '@/components/ui/panel';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING, TAB_LABEL } from '@/constants/theme';

/**
 * モバイル用の下タブ。**5項目＋「その他」**。
 *
 * 【なぜ「その他」を足したか】画面が13あるのに下タブには5つしか置けない
 * （375pt端末でタブ1つに使えるのは65px。CLAUDE.md §3.1）。
 * 以前は残り8画面への入口が画面内リンクだけで、目標・AI・議事録は
 * **設定画面からの一方通行**（戻る導線も無し）だった。
 * ここから開けるようにして、どの画面にも2手で行けるようにする。
 *
 * 【選択中を色だけで示さない】§3.4。文字色を濃くするのに加えて、
 * **上辺に太い線**を引く。モックアップのサイドバーの選択強調と同じ考え方。
 */
export function BottomBar({
  currentRouteName,
  onNavigate,
  /** お知らせの未読件数。0なら何も出ない。 */
  unreadCount = 0,
}: {
  currentRouteName: string | undefined;
  onNavigate: (routeName: string) => void;
  unreadCount?: number;
}) {
  // ホームバーのある端末で、タブが画面の縁に被らないようにする
  const insets = useSafeAreaInsets();
  const [moreOpen, setMoreOpen] = useState(false);

  // 「その他」の中の画面を見ているときは、その他のタブを選択中にする
  const inMore = MORE_ITEMS.some((i) => i.name === currentRouteName);

  return (
    <>
      <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
        {BOTTOM_BAR_ITEMS.map((item) => (
          <TabButton
            key={item.name}
            item={item}
            active={item.name === currentRouteName}
            badge={item.name === 'notifications' ? unreadCount : 0}
            onPress={() => onNavigate(item.name)}
          />
        ))}
        <TabButton
          item={{ name: '__more', label: 'その他', icon: 'settings', inBottomBar: true }}
          active={inMore}
          badge={0}
          onPress={() => setMoreOpen(true)}
        />
      </View>

      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        {/* 背後をタップで閉じる。中身のタップでは閉じない */}
        <Pressable style={styles.backdrop} onPress={() => setMoreOpen(false)}>
          <Pressable onPress={() => {}} style={styles.sheetWrap}>
            <Panel title="その他の画面" padding="sm">
              <ScrollView style={styles.sheetBody}>
                {MORE_ITEMS.map((item) => (
                  <Pressable
                    key={item.name}
                    style={styles.moreRow}
                    onPress={() => {
                      setMoreOpen(false);
                      onNavigate(item.name);
                    }}
                  >
                    <PixelIcon name={item.icon} size={LAYOUT.tabIconSize} color={COLORS.text} />
                    <Text style={styles.moreLabel}>{item.label}</Text>
                    <Text style={styles.moreChevron}>›</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Pressable style={styles.close} onPress={() => setMoreOpen(false)}>
                <Text style={styles.closeText}>とじる</Text>
              </Pressable>
            </Panel>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function TabButton({
  item,
  active,
  badge,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  badge: number;
  onPress: () => void;
}) {
  const color = active ? COLORS.text : COLORS.textMuted;
  return (
    <Pressable style={[styles.item, active && styles.itemActive]} onPress={onPress}>
      <View style={styles.iconWrap}>
        <PixelIcon name={item.icon} size={LAYOUT.tabIconSize} color={color} secondaryColor={COLORS.surface} />
        <NotifyBadge count={badge} />
      </View>
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {item.shortLabel ?? item.label}
      </Text>
    </Pressable>
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
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: BORDER_WIDTH.normal,
    height: LAYOUT.tabBarHeight,
    // 選択中の太線ぶんを最初から確保して、切り替えで高さが動かないようにする
    borderTopWidth: BORDER_WIDTH.thick,
    borderTopColor: 'transparent',
  },
  /** 選択中。地の沈み**と**上辺の太線（色だけに頼らない。§3.4） */
  itemActive: { backgroundColor: COLORS.surfaceSunken, borderTopColor: COLORS.primary },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  /** ドット絵17pxでは「プロジェクト」が収まらないため、ここだけゴシック（§3.1の例外） */
  label: { ...TAB_LABEL, textAlign: 'center' },

  // --- 「その他」シート ---
  backdrop: { flex: 1, backgroundColor: COLORS.backdrop, justifyContent: 'flex-end' },
  sheetWrap: { padding: SPACING.sm },
  sheetBody: { maxHeight: SPACING.xxl * 12 },
  moreRow: {
    minHeight: LAYOUT.minTapSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.frameLight,
  },
  moreLabel: { fontSize: FONT_SIZE.body, flexGrow: 1 },
  moreChevron: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
  close: {
    minHeight: LAYOUT.minTapSize,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surfaceSunken,
  },
  closeText: { fontSize: FONT_SIZE.body },
});
