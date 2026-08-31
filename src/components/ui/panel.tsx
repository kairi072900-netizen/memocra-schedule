import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/components/app-text';
import { PixelFrame } from '@/components/pixel/frame';
import { BORDER_WIDTH, COLORS, FONT_SIZE, LAYOUT, SPACING } from '@/constants/theme';

/**
 * ゲームのウィンドウ。**アプリ内の「枠付きの面」はすべてこれ1つにする。**
 *
 * 【なぜ作ったか】刷新前は「枠付きの面」が4系統あった:
 *   `PixelFrame` + padding sm / `PixelFrame` + padding md / `panel`（名前だけ別）/
 *   素の View に手書きの枠（projects・availability・goal-card）。
 * 最後のは borderWidth の当て方が違って**見た目が別物のカード**になっていた。
 *
 * 【二重線】モックアップの特徴。外側は `PixelFrame` の木枠（濃茶＋四隅の金具）、
 * 内側に `panelEdge` の細い線を1本入れて「ゲームのウィンドウ」に見せる。
 * 角丸は使わない（§3.1）。
 */
export function Panel({
  children,
  title,
  /** 見出しの右端に出す操作。渡すと見出し行全体がタップ領域になる。 */
  actionLabel,
  onPressAction,
  /** 中身の余白。`none` は中身が自分で余白を持つとき（リストなど）。 */
  padding = 'md',
  /** 二重線の内枠を出すか。パネルの中に入れ子にするときは false にして線を減らす。 */
  inset = true,
  style,
}: {
  children: ReactNode;
  title?: string;
  actionLabel?: string;
  onPressAction?: () => void;
  padding?: 'none' | 'sm' | 'md';
  inset?: boolean;
  style?: ViewStyle;
}) {
  const pad = padding === 'none' ? 0 : padding === 'sm' ? SPACING.sm : SPACING.md;

  return (
    <PixelFrame style={StyleSheet.flatten([styles.frame, style])}>
      <View style={[inset && styles.inset, { padding: pad }]}>
        {title !== undefined &&
          (onPressAction ? (
            <Pressable style={styles.titleRow} onPress={onPressAction}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {actionLabel !== undefined && (
                <Text style={styles.action} numberOfLines={1}>
                  {actionLabel}
                </Text>
              )}
            </Pressable>
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
          ))}
        {children}
      </View>
    </PixelFrame>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  frame: { backgroundColor: COLORS.surface },
  /** 二重線の内側。木枠のすぐ内に細い線を1本置く */
  inset: {
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.panelEdge,
  },
  titleRow: {
    minHeight: LAYOUT.minTapSize,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  title: { fontSize: FONT_SIZE.body, flexShrink: 1, marginBottom: SPACING.xs },
  /** 右端のラベルは縮めない。縮むのは見出しのほう */
  action: { fontSize: FONT_SIZE.body, color: COLORS.textMuted, flexShrink: 0, marginBottom: SPACING.xs },
});
