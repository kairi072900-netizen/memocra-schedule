import { StyleSheet, View } from 'react-native';

import { DotGrid } from '@/components/pixel/icon';
import { COLORS } from '@/constants/theme';

/**
 * 背景の風景ドット絵（空・雲・丘・木・村・城・草原）。
 *
 * 【置き方】2026-08-31 に方針を変更（CLAUDE.md §3.1）。
 * 以前は「ヘッダー帯と空状態だけ」に限定していた。要件定義書 12.6 #6 が
 * 「縦スクロールする画面に敷くと破綻する」と警告していたためだが、
 * **`AppBackground` はスクロールしない固定の地**なので破綻しない。
 * コンテンツは不透明な羊皮紙のパネルで覆うので、可読性も落ちない。
 * **リスト領域そのものに敷いてはいけない**という約束は維持する。
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
  F: COLORS.grassFar,
  t: COLORS.stone,
  T: COLORS.stoneDark,
  f: COLORS.flag,
  w: COLORS.trunk,
  r: COLORS.roof,
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

/**
 * 繰り返す地面（`components/app-background.tsx` が使う）。
 *
 * **ランドマーク（城・村）はここに入れない。** 入れると横に並べたときに
 * 城が何個も出て騒がしくなる（実際に踏んだ）。ここは丘・木・草原だけにして、
 * 城と村は下の `SceneryCastleScene` / `SceneryVillage` で**画面に1回だけ**置く。
 *
 * 左端と右端の地形を揃えてあるので、繰り返しても継ぎ目が出ない。
 * 上部の `.` は透明で、空が透ける。
 */
const GROUND = [
  '........................',
  '........................',
  '........................',
  '........................',
  '...GGG..........GGG.....',
  '..GGGGG....F...GGGGG....',
  '..GGGGG..FFFF..GGGGG....',
  '.FGGGGG.FFFFFF.GGGGGFF..',
  'FFFFwFFFFFFFFFFFFwFFFFFF',
  'FFFFwFFFFFFFFFFFFwFFFFFF',
  'FFFFwFFFFFFFFFFFFwFFFFFF',
  'FFFFFFFFFFFFFFFFFFFFFFFF',
  'gggggggggggggggggggggggg',
  'gggggggggggggggggggggggg',
  'gggggggggggggggggggggggg',
  'gggggggggggggggggggggggg',
  'GGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGGGGGG',
] as const;

/** 右端に1回だけ置く城。RPG風の塔と旗（§3.3。Minecraft の意匠は使わない）。 */
const CASTLE_SCENE = [
  '.....ff......ff.....',
  '.....T.......T......',
  '....t.t.....t.t.....',
  '....ttt.....ttt.....',
  '....ttt.....ttt.....',
  '....tTt.....tTt.....',
  '....tttt.t.tttt.....',
  '....ttttttttttt.....',
  '....ttttttttttt.....',
  '....tttttTttttt.....',
  '....ttttttttttt.....',
  '....ttttttttttt.....',
  '....tttttTttttt.....',
  '....ttttTTTtttt.....',
  '....ttttTTTtttt.....',
  '....ttttTTTtttt.....',
  'GGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGG',
] as const;

/** 左端に1回だけ置く村。 */
const VILLAGE_SCENE = [
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '....................',
  '.....rrr............',
  '....rrrrr...........',
  '...rrrrrrr..........',
  '....ttttt........GGG',
  '....ttttt...rrrr.GGG',
  '....ttTtt..rrrrrrGGG',
  '....ttttt...tttt..w.',
  '....ttTtt...ttTt..w.',
  '....ttTtt...tttt..w.',
  '....ttTtt...tttt..w.',
  'GGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGG',
  'GGGGGGGGGGGGGGGGGGGG',
] as const;

const GROUND_COLS = GROUND[0].length;
const GROUND_ROWS = GROUND.length;
const LANDMARK_COLS = CASTLE_SCENE[0].length;

function Scene({ rows, dot }: { rows: readonly string[]; dot: number }) {
  return (
    <DotGrid
      rows={rows}
      width={dot * rows[0].length}
      height={dot * rows.length}
      palette={SCENERY_PALETTE}
      fallback={COLORS.grass}
    />
  );
}

/**
 * 地面の風景。丘・木・草原を横に繰り返し、**村を左端・城を右端に1回ずつ**置く。
 *
 * `SceneryBand` と同じく**引き伸ばさない**（ドットが長方形になるため）。
 * 高さから1ドットの大きさを決め、そのぶん横に何枚必要かを数える。
 */
export function SceneryGround({ width, height }: { width: number; height: number }) {
  if (width <= 0 || height <= 0) return null;

  // 1ドットを整数pxに丸める。半端な倍率はにじむ（§3.1）
  const dot = Math.max(1, Math.floor(height / GROUND_ROWS));
  const tileWidth = dot * GROUND_COLS;
  const count = Math.ceil(width / tileWidth);
  const landmarkWidth = dot * LANDMARK_COLS;
  // 狭い画面では地面が低く、城と村が幅の大半を占めてしまうので出さない
  const showLandmarks = width > landmarkWidth * 3;

  return (
    <View style={[styles.groundWrap, { width, height: dot * GROUND_ROWS }]} pointerEvents="none">
      <View style={styles.ground}>
        {Array.from({ length: count }, (_, i) => (
          <Scene key={i} rows={GROUND} dot={dot} />
        ))}
      </View>
      {showLandmarks && (
        <>
          {/* 地面と同じ行数なので、下端を揃えれば草の高さが自然に合う */}
          <View style={[styles.landmark, { left: dot * 2 }]}>
            <Scene rows={VILLAGE_SCENE} dot={dot} />
          </View>
          <View style={[styles.landmark, { right: dot * 2 }]}>
            <Scene rows={CASTLE_SCENE} dot={dot} />
          </View>
        </>
      )}
    </View>
  );
}

// borderRadius は使わない（CLAUDE.md §3.1）。
const styles = StyleSheet.create({
  band: { flexDirection: 'row', overflow: 'hidden' },
  groundWrap: { justifyContent: 'flex-end', overflow: 'hidden' },
  ground: { flexDirection: 'row' },
  landmark: { position: 'absolute', bottom: 0 },
  castle: { alignItems: 'center' },
});
