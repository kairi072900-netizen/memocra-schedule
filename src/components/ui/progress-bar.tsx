import { StyleSheet, View } from 'react-native';

import { BORDER_WIDTH, COLORS, LAYOUT, SPACING } from '@/constants/theme';

/**
 * 硬い矩形の進捗バー。**アプリ内のゲージはこれ1つにする。**
 *
 * 【なぜ作ったか】`workload-summary.tsx` と `goal-card.tsx` に、
 * marginTop 以外は値まで同一の実装が2つあった。
 *
 * グラフのライブラリは使わない（§3.1）。角丸なし・グラデーションなしの矩形を
 * 並べるだけで、モックアップのゲージは再現できる。
 *
 * **色だけで意味を伝えないこと**（§3.4）。呼び出し側で必ず数値か記号を併記する。
 */
export function ProgressBar({
  /** 0〜1。範囲外は丸める。 */
  value,
  color,
  /** EXP バーのように少し高くしたいとき。 */
  size = 'md',
}: {
  value: number;
  color: string;
  size?: 'sm' | 'md';
}) {
  const ratio = Math.min(1, Math.max(0, value));
  return (
    <View style={[styles.track, { height: size === 'sm' ? SPACING.sm : SPACING.md }]}>
      <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。値はすべて theme.ts から読む。
const styles = StyleSheet.create({
  /** 地。枠線で「最大値まで」の目盛りを示す */
  track: {
    borderWidth: BORDER_WIDTH.hairline,
    borderColor: COLORS.frameDark,
    backgroundColor: COLORS.background,
    overflow: 'hidden',
  },
  fill: { height: '100%' },
});

/** ゲージの下限の高さ。呼び出し側が余白を計算するときに使う。 */
export const PROGRESS_BAR_HEIGHT = LAYOUT.chipHeight;
