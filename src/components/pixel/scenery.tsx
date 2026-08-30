import { StyleSheet, View } from 'react-native';

import { DotGrid } from '@/components/pixel/icon';
import { COLORS } from '@/constants/theme';

/**
 * 背景の風景ドット絵（空・草原・城）。
 *
 * 【置いてよい場所は3つだけ】CLAUDE.md §3.1 / 要件定義書 12.6 #6:
 * 「背景の風景画像は**ヘッダー帯と空状態の画面だけに限定**し、
 *   リスト領域は無地の羊皮紙色にする」。
 * 縦スクロールする領域に敷くと破綻する。**この約束を広げないこと。**
 *
 * 【画像を持たない】`DotGrid`（`pixel/icon.tsx`）に文字列パターンを渡して
 * SVG の矩形で描く。どの大きさでも1ドットが正方形になり、にじまない（§3.1）。
 *
 * 【Minecraft の意匠を使わない】§3.3。草ブロック・土・木材のテクスチャは描かない。
 * 城はRPG風の塔と旗。
 */

/**
 * 文字 → 色。**ここに無い文字をパターンに混ぜないこと**
 * （過去に半角スペースが主色で塗られる事故が起きた。§3.1）。
 */
const SCENERY_PALETTE: Record<string, string> = {
  s: COLORS.sky,
  d: COLORS.skyDeep,
  c: COLORS.cloud,
  g: COLORS.grass,
  G: COLORS.grassDark,
  t: COLORS.stone,
  T: COLORS.stoneDark,
  f: COLORS.flag,
};

/**
 * ヘッダーの帯。**左右に繰り返して**幅いっぱいに敷く。
 *
 * 引き伸ばし（`preserveAspectRatio="none"`）はドットが長方形になるので使わない。
 * 端の列が繋がるよう、雲は左右の縁に触れさせていない。
 */
const BAND = [
  'dddddddddddddddd',
  'ssssssssssssssss',
  'sssccsssssssssss',
  'sccccccsssscccss',
  'ssssssssssssssss',
  'ssssssssssssssss',
  'gggggggggggggggg',
  'GGGGGGGGGGGGGGGG',
] as const;

const BAND_COLS = BAND[0].length;
const BAND_ROWS = BAND.length;

export function SceneryBand({
  width,
  height,
}: {
  /** 敷きたい幅（実測値）。これを覆うまでパターンを繰り返す。 */
  width: number;
  height: number;
}) {
  if (width <= 0) return null;

  // 1ドットの大きさを高さから決め、そのぶん横に何枚必要かを数える
  const dot = height / BAND_ROWS;
  const tileWidth = dot * BAND_COLS;
  const count = Math.ceil(width / tileWidth);

  return (
    <View style={[styles.band, { width, height }]} pointerEvents="none">
      {Array.from({ length: count }, (_, i) => (
        <DotGrid
          key={i}
          rows={BAND}
          width={tileWidth}
          height={height}
          palette={SCENERY_PALETTE}
          fallback={COLORS.sky}
        />
      ))}
    </View>
  );
}

/**
 * 空状態に置く1枚絵（空・雲・城・草原）。
 * 「まだ何も無い」画面が寂しくならないようにするためのもので、情報は持たない。
 */
const CASTLE = [
  'dddddddddddddddddddddddddddddddd',
  'dddddddddddddddddddddddddddddddd',
  'sscccccsssssssssssssssssssssssss',
  'scccccccsssssssssssssssscccccsss',
  'ssssssssssssffsssssffsssscccccss',
  'ssssssssssssTssssssTssssssssssss',
  'ssssssssssststsssststsssssssssss',
  'ssssssssssstttsssstttsssssssssss',
  'ssssssssssstTtsssstTtsssssssssss',
  'sssssssssssttttttttttsssssssssss',
  'sssssssssssttttttttttsssssssssss',
  'sssssssssssttttTTttttsssssssssss',
  'sssssssssssttttTTttttsssssssssss',
  'gggggggggggggggggggggggggggggggg',
  'gggggggggggggggggggggggggggggggg',
  'GGGGGGGGGGGGGGGGGGGGGGGGGGGGGGGG',
] as const;

const CASTLE_COLS = CASTLE[0].length;
const CASTLE_ROWS = CASTLE.length;

export function SceneryCastle({ width }: { width: number }) {
  if (width <= 0) return null;
  // ドットを整数pxに丸める。半端な倍率はにじむ（§3.1 と同じ理由）
  const dot = Math.max(1, Math.floor(width / CASTLE_COLS));
  return (
    <View style={styles.castle} pointerEvents="none">
      <DotGrid
        rows={CASTLE}
        width={dot * CASTLE_COLS}
        height={dot * CASTLE_ROWS}
        palette={SCENERY_PALETTE}
        fallback={COLORS.sky}
      />
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。
const styles = StyleSheet.create({
  band: { flexDirection: 'row', overflow: 'hidden' },
  castle: { alignItems: 'center' },
});
