import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING, TEXT } from '@/constants/theme';

/**
 * リストの1行。**「左に印 → 本文2行 → 右にメタ」の形はこれ1つにする。**
 *
 * 【なぜ作ったか】ホーム画面の3種類の行（出欠・タスク・公開予定）と
 * 負荷ダッシュボードの `TaskLine` は、名前が違うだけで同じ骨格だった。
 * 上の罫線・余白・`flexGrow` の当て方まで同じものを4回書いていた。
 *
 * 【右端のメタ】締切の残り日数など。超過を示したいときは `metaAlert` を true に
 * すると赤字になる。**色だけでなく文言でも示すこと**（「3日超過」など。§3.4）。
 */
export function ListRow({
  leading,
  title,
  meta,
  right,
  rightAlert = false,
  trailing,
  onPress,
}: {
  /** 左端の印。アイコン・ステータスバッジ・アバターなど。 */
  leading?: ReactNode;
  title: string;
  /** タイトルの下の補足（企画名・日時など）。 */
  meta?: string;
  /** 右端の短いテキスト（締切・日付）。 */
  right?: string;
  rightAlert?: boolean;
  /** 右端に置く要素（アバター行・バッジなど）。`right` と併用できる。 */
  trailing?: ReactNode;
  onPress?: () => void;
}) {
  const content = (
    <>
      {leading}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {meta !== undefined && (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        )}
      </View>
      {right !== undefined && <Text style={[styles.right, rightAlert && styles.alert]}>{right}</Text>}
      {trailing}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={styles.row} onPress={onPress}>
        {content}
      </Pressable>
    );
  }
  return <View style={styles.row}>{content}</View>;
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  row: {
    minHeight: LAYOUT.minTapSize,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    // 行の区切りは上の細い罫線1本。カードで囲むと入れ子が深くなる
    borderTopWidth: BORDER_WIDTH.hairline,
    borderTopColor: COLORS.frameLight,
    paddingVertical: SPACING.xs,
    flexWrap: 'wrap',
  },
  body: { flexGrow: 1, flexShrink: 1, minWidth: SPACING.xxl * 3 },
  title: { fontSize: FONT_SIZE.body },
  /** 補足はゴシック。1行に情報を詰めても圧迫しない */
  meta: { ...TEXT.small, color: COLORS.textMuted },
  right: { ...TEXT.small, color: COLORS.textMuted },
  alert: { color: COLORS.danger },
});
