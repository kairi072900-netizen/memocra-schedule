import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Text } from '@/components/app-text';
import { COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';

/**
 * 画面の外枠。**すべての画面はこれで始める。**
 *
 * 【なぜ作ったか】刷新前は `safeArea` が13ファイルで同一定義、`body` が3系統、
 * ヘッダーが4系統あった。特にヘッダーは `margin: SPACING.sm` の有無で
 * **画面をまたぐと左右の余白が8pxずれる**状態だった。
 * さらにヘッダーが `ScrollView` の内か外かも画面ごとにバラバラで、
 * スクロールしたときの挙動が揃っていなかった。
 *
 * 【背景は透明】画面の地の風景（`app-background.tsx`）を透かすため、
 * ここでは背景色を塗らない。従来 `COLORS.background` を塗っていた13箇所は
 * すべてこれに置き換わる。
 */
export function Screen({
  children,
  /** 中身をスクロールさせる。1画面に収める画面（カレンダー）は false。 */
  scroll = true,
}: {
  children: ReactNode;
  scroll?: boolean;
}) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
      ) : (
        <View style={[styles.body, styles.fit]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

/**
 * 画面の見出し。タイトルと、左の戻る・右の操作。
 *
 * 【戻る導線】`backTo` を渡すと「◀ もどる」が出る。履歴が無ければそこへ飛ぶ
 * （`router.replace` で直接来たときスタックが空になるため）。
 * 刷新前は同じ実装がコメントごと3ファイルにコピーされていた。
 */
export function ScreenHeader({
  title,
  subtitle,
  /** 履歴が無いときの戻り先。渡すと「◀ もどる」が出る。 */
  backTo,
  /** 右端に置く操作（ボタンなど）。 */
  actions,
}: {
  title: string;
  subtitle?: string;
  backTo?: Parameters<typeof router.replace>[0];
  actions?: ReactNode;
}) {
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else if (backTo) router.replace(backTo);
  };

  return (
    <View style={styles.header}>
      {backTo !== undefined && (
        <Text style={styles.back} onPress={goBack}>
          ◀ もどる
        </Text>
      )}
      <View style={styles.titleRow}>
        <View style={styles.titleBody}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle !== undefined && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {actions}
      </View>
    </View>
  );
}

/** 画面内の小見出し。セクションを分けるとき。 */
export function SectionHeading({
  children,
  actionLabel,
  onPressAction,
}: {
  children: string;
  actionLabel?: string;
  onPressAction?: () => void;
}) {
  if (onPressAction) {
    return (
      <Pressable style={styles.sectionRow} onPress={onPressAction}>
        <Text style={styles.section}>{children}</Text>
        {actionLabel !== undefined && <Text style={styles.sectionAction}>{actionLabel}</Text>}
      </Pressable>
    );
  }
  return <Text style={styles.section}>{children}</Text>;
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  /** 背景は塗らない。画面の地の風景を透かす */
  safeArea: { flex: 1 },
  body: { padding: SPACING.sm, paddingBottom: SPACING.xxl, gap: SPACING.sm },
  /** スクロールしない画面。残りの高さを中身が分け合う */
  fit: { flex: 1 },

  header: { paddingHorizontal: SPACING.xs },
  back: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textMuted,
    // 文字の高さしか当たり判定が無いので、上下に余白を足して 44px 相当にする
    paddingVertical: SPACING.md,
    alignSelf: 'flex-start',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    minHeight: LAYOUT.minTapSize,
  },
  titleBody: { flexShrink: 1 },
  title: { fontSize: FONT_SIZE.title },
  subtitle: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  section: { fontSize: FONT_SIZE.body, marginTop: SPACING.sm, marginBottom: SPACING.xs },
  sectionRow: {
    minHeight: LAYOUT.minTapSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  sectionAction: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },
});
