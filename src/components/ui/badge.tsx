import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { type Badge, BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';

/**
 * 色地に記号1文字のステータスバッジ。**アプリ内のバッジはこれ1つにする。**
 *
 * 【なぜ作ったか】刷新前は同じ見た目が5箇所で別々に定義され、
 * **16px と 20px が混在**していた（home・workload は16、availability・
 * task-row・stream は20）。
 *
 * 【色だけで意味を伝えない】§3.4。`Badge` は色と記号をセットで持つ型なので、
 * これを丸ごと受ければ記号が必ず付く。**色だけを取り出して使わないこと。**
 * ラベルの併記が要る場所では `showLabel` を渡す。
 */
export function StatusBadge({
  badge,
  size = 'md',
  showLabel = false,
}: {
  badge: Badge;
  /** sm=16px（行の中に混ぜる） / md=20px（単体で置く）。 */
  size?: 'sm' | 'md';
  showLabel?: boolean;
}) {
  const box = size === 'sm' ? LAYOUT.iconSize : LAYOUT.badgeSize;
  return (
    <View style={styles.row}>
      <View style={[styles.badge, { width: box, height: box, backgroundColor: badge.color }]}>
        <Text style={styles.symbol}>{badge.symbol}</Text>
      </View>
      {showLabel && <Text style={styles.label}>{badge.label}</Text>}
    </View>
  );
}

/**
 * 未読件数の赤い丸バッジ（モックアップのベルの右上）。
 *
 * 0件のときは**何も描かない**。「0」を出すと、対応が要らないのに
 * 目を引いてしまう。
 */
export function NotifyBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.notify} pointerEvents="none">
      <Text style={styles.notifyText}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  badge: { alignItems: 'center', justifyContent: 'center' },
  symbol: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
  label: { fontSize: FONT_SIZE.body, color: COLORS.textMuted },

  /** ベルなどの右上に重ねる。親側で `position: relative` にすること */
  notify: {
    position: 'absolute',
    top: -SPACING.xs,
    right: -SPACING.xs,
    minWidth: LAYOUT.notifyBadgeSize,
    height: LAYOUT.notifyBadgeSize,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.danger,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    paddingHorizontal: BORDER_WIDTH.normal,
  },
  notifyText: { fontSize: FONT_SIZE.body, color: COLORS.textOnDark },
});
