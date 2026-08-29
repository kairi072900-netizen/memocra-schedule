import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { NAV_ITEMS } from '@/components/nav/items';
import { MemberAvatar, PixelIcon } from '@/components/pixel/icon';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SPACING,
} from '@/constants/theme';
import type { LevelInfo } from '@/lib/level';
import type { Member } from '@/types';

/**
 * PC用の左サイドバー（要件定義書 12.7 のモックアップ）。
 *
 * React Navigation の `tabBarPosition: 'left'` に乗せ、`tabBar` prop から呼ばれる。
 * ただし**ナビゲーションの型には依存しない**（現在地とコールバックを素の値で受ける）。
 * これは「コンポーネントはデータの取得元を知らない」という方針と同じ（CLAUDE.md §4）。
 *
 * **モバイルでは使わない**（`(tabs)/_layout.tsx` が幅で出し分ける）。
 * 10項目を縦に並べられるのは、この幅があるときだけ。
 */
export function Sidebar({
  currentRouteName,
  onNavigate,
  members,
  me,
  level,
}: {
  /** いま開いているルート名（`(tabs)` 配下のファイル名）。 */
  currentRouteName: string | undefined;
  onNavigate: (routeName: string) => void;
  members: Member[];
  /** ログイン中のメンバー。まだ取得できていなければ null。 */
  me: Member | null;
  level: LevelInfo | null;
}) {

  return (
    <View style={styles.container}>
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>メモクラ</Text>
        <Text style={styles.logoSub}>スケジュール管理アプリ</Text>
      </View>

      {/* メンバー。色だけで判別させないため、下のカードで名前も出す（CLAUDE.md §3.4） */}
      {members.length > 0 && (
        <View style={styles.memberRow}>
          {members.map((m) => (
            <MemberAvatar key={m.id} member={m} size={LAYOUT.avatarSize} />
          ))}
        </View>
      )}

      <ScrollView style={styles.nav} contentContainerStyle={styles.navContent}>
        {NAV_ITEMS.map((item) => {
          const active = item.name === currentRouteName;
          return (
            <Pressable
              key={item.name}
              onPress={() => onNavigate(item.name)}
              style={[styles.navItem, active && styles.navItemActive]}
            >
              <PixelIcon
                name={item.icon}
                size={LAYOUT.iconSize}
                color={active ? COLORS.textOnDark : COLORS.parchmentMuted}
                secondaryColor={COLORS.sidebar}
              />
              <Text
                style={[styles.navLabel, active && styles.navLabelActive]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 自分のカード。**HPは置かない**（要件定義書 12.6 / CLAUDE.md §2）。
          レベルは完了したタスクだけで上がる加点型 */}
      {me && (
        <View style={styles.meCard}>
          <View style={styles.meTop}>
            <MemberAvatar member={me} size={LAYOUT.avatarSize} />
            <View style={styles.meNames}>
              <Text style={styles.meName} numberOfLines={1}>
                {me.name}
              </Text>
              {me.role.length > 0 && (
                <Text style={styles.meRole} numberOfLines={1}>
                  {me.role}
                </Text>
              )}
            </View>
          </View>

          {level && (
            <>
              <Text style={styles.levelLabel}>
                Lv.{level.level}　{level.expInLevel}/{level.expForNext} EXP
              </Text>
              <View style={styles.expTrack}>
                <View
                  style={[
                    styles.expFill,
                    { width: `${(level.expInLevel / level.expForNext) * 100}%` },
                  ]}
                />
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  container: {
    width: LAYOUT.sidebarWidth,
    height: '100%',
    backgroundColor: COLORS.sidebar,
    borderRightWidth: BORDER_WIDTH.thick,
    borderRightColor: COLORS.frameDark,
    paddingVertical: SPACING.md,
  },
  logoBlock: { alignItems: 'center', paddingHorizontal: SPACING.sm },
  logo: { fontSize: FONT_SIZE.title, color: COLORS.textOnDark },
  logoSub: { fontSize: FONT_SIZE.body, color: COLORS.parchmentMuted },

  memberRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },

  nav: { flex: 1, marginTop: SPACING.lg },
  navContent: { paddingHorizontal: SPACING.sm, gap: BORDER_WIDTH.normal },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    // 角丸なし。現在地は背景と左の縦線で示す
    borderLeftWidth: BORDER_WIDTH.thick,
    borderLeftColor: 'transparent',
  },
  navItemActive: {
    backgroundColor: COLORS.sidebarActive,
    borderLeftColor: COLORS.textOnDark,
  },
  navLabel: { fontSize: FONT_SIZE.body, color: COLORS.parchmentMuted, flexShrink: 1 },
  navLabelActive: { color: COLORS.textOnDark },

  meCard: {
    marginTop: SPACING.md,
    marginHorizontal: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.sidebarActive,
  },
  meTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  meNames: { flexShrink: 1 },
  meName: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  meRole: { fontSize: FONT_SIZE.body, color: COLORS.parchmentMuted },
  levelLabel: { fontSize: FONT_SIZE.body, color: COLORS.parchmentMuted, marginTop: SPACING.xs },
  expTrack: {
    height: SPACING.sm,
    backgroundColor: COLORS.sidebarActive,
    marginTop: BORDER_WIDTH.normal,
  },
  expFill: { height: '100%', backgroundColor: COLORS.exp },
});
