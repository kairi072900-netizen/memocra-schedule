import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelIcon, type PixelIconName } from '@/components/pixel/icon';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';

/**
 * 絞り込み・選択肢のチップ。**アプリ内のチップはこれ1つにする。**
 *
 * 【なぜ作ったか】刷新前はチップのスタイルが6箇所で別々に定義され、
 * `chipActive`（`{ backgroundColor: surfaceSunken, borderColor: text }`）が
 * **5ファイルで一字一句同じ**だった。さらに `FilterChip` / `Chip` /
 * `StatusButton` / `AdjustButton` という同型のローカル部品が4つあった。
 *
 * 【選択中は色だけで示さない】§3.4。地を沈めるのに加えて**枠を濃く太く**する。
 * 色が見えづらい環境でも、枠の太さで選択が分かる。
 *
 * 【ボタンとの使い分け】
 *   Chip   … 「複数の中から選ぶ」「絞り込む」。並べて使う
 *   Button … 「実行する」。立体で、押すと沈む
 */
export function Chip({
  label,
  onPress,
  active = false,
  icon,
  /** アバターなど、ラベルの前に置く要素。担当の絞り込みで使う。 */
  leading,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  icon?: PixelIconName;
  leading?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.chip, active && styles.active, disabled && styles.disabled]}
    >
      {leading}
      {icon && (
        <PixelIcon name={icon} size={LAYOUT.iconSize} color={active ? COLORS.text : COLORS.textMuted} />
      )}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

/** チップを並べる行。`flexWrap` の指定を毎回書かずに済ませる。 */
export function ChipRow({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  chip: {
    minHeight: LAYOUT.minTapSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.sm,
    // ラベルが長い選択肢（企画名など）でも1行に収める
    maxWidth: LAYOUT.sidebarWidth,
  },
  /** 選択中。地の沈みと**枠の太さ**の両方で示す（色だけに頼らない。§3.4） */
  active: {
    backgroundColor: COLORS.surfaceSunken,
    borderColor: COLORS.text,
    borderWidth: BORDER_WIDTH.thick,
  },
  label: { fontSize: FONT_SIZE.body, flexShrink: 1 },
  disabled: { opacity: 0.5 },
  row: { flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' },
});
