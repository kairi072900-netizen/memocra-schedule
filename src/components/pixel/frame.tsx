import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { BORDER_WIDTH, COLORS, LAYOUT } from '@/constants/theme';

/**
 * RPG風の木枠。
 *
 * 9-slice は使わない。**四隅に小さな金具を `position: absolute` で置き、
 * 辺は単色の `borderWidth` で済ませる**（CLAUDE.md §3.1）。
 * これで見た目の9割が再現でき、実装コストは1/5で済む。
 *
 * 角丸は使わない。影もぼかさず、1〜2pxの硬い矩形で表現する。
 */
export function PixelFrame({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[styles.frame, style]}>
      {children}
      {/* 四隅の金具。辺のborderWidthの上に重ねて、枠の角を締めて見せる */}
      <View style={[styles.corner, styles.topLeft]} />
      <View style={[styles.corner, styles.topRight]} />
      <View style={[styles.corner, styles.bottomLeft]} />
      <View style={[styles.corner, styles.bottomRight]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderWidth: BORDER_WIDTH.normal,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.surface,
    // 硬い矩形の影。shadowRadius によるぼかしは使わない
    borderBottomWidth: BORDER_WIDTH.thick,
    borderRightWidth: BORDER_WIDTH.thick,
  },
  corner: {
    position: 'absolute',
    width: LAYOUT.frameCornerSize,
    height: LAYOUT.frameCornerSize,
    backgroundColor: COLORS.frameDark,
  },
  topLeft: { top: 0, left: 0 },
  topRight: { top: 0, right: 0 },
  bottomLeft: { bottom: 0, left: 0 },
  bottomRight: { bottom: 0, right: 0 },
});
