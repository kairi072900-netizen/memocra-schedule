import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { NAV_ITEMS } from '@/components/nav/items';
import { PixelIcon } from '@/components/pixel/icon';
import { Avatar } from '@/components/ui/avatar';
import { NotifyBadge } from '@/components/ui/badge';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  BORDER_WIDTH,
  COLORS,
  FONT_SIZE,
  LAYOUT,
  SPACING,
  TEXT,
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
  unreadCount = 0,
}: {
  /** いま開いているルート名（`(tabs)` 配下のファイル名）。 */
  currentRouteName: string | undefined;
  onNavigate: (routeName: string) => void;
  members: Member[];
  /** ログイン中のメンバー。まだ取得できていなければ null。 */
  me: Member | null;
  level: LevelInfo | null;
  /** お知らせの未読件数。0なら何も出ない。 */
  unreadCount?: number;
}) {

  return (
    <View style={styles.container}>
      <View style={styles.logoBlock}>
        <Text style={styles.logo}>メモクラ</Text>
        <Text style={styles.logoSub}>スケジュール管理アプリ</Text>
      </View>

      {/* パーティー。4人が「この世界の仲間」であることを最初に見せる。
          **色だけで人を判別させない**ので、名前は下の自分のカードとメンバー画面に出す
          （ここは顔ぶれの確認であって、個人を特定させる場所ではない。§3.4） */}
      {members.length > 0 && (
        <View style={styles.party}>
          <Text style={styles.partyLabel}>パーティー</Text>
          <View style={styles.memberRow}>
            {members.map((m) => (
              <Avatar key={m.id} member={m} size="md" />
            ))}
          </View>
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
              {item.name === 'notifications' && (
                <View style={styles.navBadge}>
                  <NotifyBadge count={unreadCount} />
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* 自分のカード。**HPは置かない**（要件定義書 12.6 / CLAUDE.md §2）。
          レベルは完了したタスクだけで上がる加点型 */}
      {me && (
        <View style={styles.meCard}>
          <View style={styles.meTop}>
            <Avatar member={me} size="lg" />
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
              {/* 加点型。**HPは置かない**（要件定義書 12.6 / CLAUDE.md §2）。
                  減る指標を個人に紐づけると、負荷集中が個人の問題に見えてしまう */}
              <ProgressBar value={level.expInLevel / level.expForNext} color={COLORS.exp} size="sm" />
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

  party: { marginTop: SPACING.md, paddingHorizontal: SPACING.sm },
  partyLabel: { ...TEXT.small, color: COLORS.parchmentMuted, textAlign: 'center' },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
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
  /** 現在地。地の明るさ**と**左の太い縦線（色だけに頼らない。§3.4） */
  navItemActive: {
    backgroundColor: COLORS.sidebarActive,
    borderLeftColor: COLORS.primary,
  },
  navLabel: { fontSize: FONT_SIZE.body, color: COLORS.parchmentMuted, flexGrow: 1, flexShrink: 1 },
  /** 未読バッジは項目の右端に。絶対配置なので親に幅を食わせない */
  navBadge: { width: LAYOUT.notifyBadgeSize, height: LAYOUT.notifyBadgeSize },
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
  meLevelGap: { height: BORDER_WIDTH.normal },
});
