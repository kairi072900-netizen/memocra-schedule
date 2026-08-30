import Svg, { Rect } from 'react-native-svg';

import { COLORS } from '@/constants/theme';
import type { Member } from '@/types';

/**
 * ドット絵アイコン。**画像ファイルを持たず、コードで矩形として描く。**
 *
 * RNの `Image` は拡大時に平滑化されてしまうため、ドット絵は
 * 「表示サイズちょうどの画像」か「矩形での描画」のどちらかにする（CLAUDE.md §3.1）。
 * ここは後者。どのサイズでも1ドットが正確な正方形になり、にじまない。
 *
 * **Mojang / Microsoft の意匠は使わない**（CLAUDE.md §3.3）。
 * 配信のモチーフはクリーパーではなく**マイク**にしている。
 *
 * パターンは1文字=1ドットの文字列配列。**8文字×8行ちょうど**にすること。
 *   '.' = 透明 / 'X' = 主色 / 'o' = 副色
 * 半角スペースなど他の文字を混ぜないこと（主色で塗られてしまう）。
 */

/** アイコンのグリッド。**アイコンだけの約束**で、`DotGrid` 自体は任意の縦横を描ける。 */
export const ICON_GRID = 8;
const TRANSPARENT = '.';
const SECONDARY = 'o';

const ICONS = {
  /** ロング動画の公開。横に広い画面＋再生の三角。 */
  longPublish: [
    'XXXXXXXX',
    'XXXXXXXX',
    'XXoXXXXX',
    'XXooXXXX',
    'XXoooXXX',
    'XXooXXXX',
    'XXoXXXXX',
    'XXXXXXXX',
  ],
  /** ショート動画の公開。縦長の画面＋再生の三角（ロングとの違いは横幅）。 */
  shortPublish: [
    '.XXXXXX.',
    '.XXXXXX.',
    '.XXoXXX.',
    '.XXooXX.',
    '.XXoooX.',
    '.XXooXX.',
    '.XXoXXX.',
    '.XXXXXX.',
  ],
  /** 配信。マイク。 */
  stream: [
    '..XXXX..',
    '..XooX..',
    '..XooX..',
    '..XooX..',
    'X.XXXX.X',
    'X..XX..X',
    '.XXXXXX.',
    '...XX...',
  ],
  /** 撮影。カメラ。 */
  shoot: [
    '...XX...',
    'XXXXXXXX',
    'XXXXXXXX',
    'XXXooXXX',
    'XXooooXX',
    'XXooooXX',
    'XXXooXXX',
    'XXXXXXXX',
  ],

  /** ホーム。家。 */
  home: [
    '...XX...',
    '..XXXX..',
    '.XXXXXX.',
    'XXXXXXXX',
    '.XXXXXX.',
    '.XXooXX.',
    '.XXooXX.',
    '.XXXXXX.',
  ],
  /** プロジェクト。本（左に背表紙）。 */
  projects: [
    'XXXXXXXX',
    'XooooooX',
    'XoXXXXoX',
    'XooooooX',
    'XoXXXXoX',
    'XooooooX',
    'XoXXXXoX',
    'XXXXXXXX',
  ],
  /** 新規登録。＋。 */
  plus: [
    '..XXXX..',
    '..XXXX..',
    '..XXXX..',
    'XXXXXXXX',
    'XXXXXXXX',
    '..XXXX..',
    '..XXXX..',
    '..XXXX..',
  ],
  /** 出欠。チェック。 */
  availability: [
    '......XX',
    '.....XXX',
    'X...XXX.',
    'XX.XXX..',
    'XXXXX...',
    '.XXX....',
    '..X.....',
    '........',
  ],
  /** カレンダー。月表示のグリッド。 */
  calendar: [
    'XXXXXXXX',
    'XooooooX',
    'XXXXXXXX',
    'XoXoXoXX',
    'XXXXXXXX',
    'XoXoXoXX',
    'XXXXXXXX',
    'XXXXXXXX',
  ],
  /** タスク一覧。チェックリスト。 */
  tasks: [
    'XX.ooooo',
    'XXX.....',
    'XX.ooooo',
    'XXX.....',
    'XX.ooooo',
    'XXX.....',
    'XX.ooooo',
    '........',
  ],
  /** 負荷ダッシュボード。横棒グラフ。 */
  workload: [
    'XXXXXXXX',
    'XXXXXX..',
    '........',
    'XXXX....',
    'XXX.....',
    '........',
    'XX......',
    'X.......',
  ],
  /** メンバー。人が2人。 */
  members: [
    '.XX..XX.',
    '.XX..XX.',
    'XooXXooX',
    'XooXXooX',
    '........',
    'XXXXXXXX',
    'XooXXooX',
    'XooXXooX',
  ],
  /** 設定。歯車。 */
  settings: [
    '..X..X..',
    '.XXXXXX.',
    'XXXooXXX',
    '.Xo..oX.',
    '.Xo..oX.',
    'XXXooXXX',
    '.XXXXXX.',
    '..X..X..',
  ],
  /** お知らせ。ベル。 */
  notifications: [
    '...XX...',
    '..XooX..',
    '..XooX..',
    '.XooooX.',
    '.XooooX.',
    'XXXXXXXX',
    '........',
    '...XX...',
  ],
  /** 目標。旗（RPG風。到達点の意）。 */
  goals: [
    '.XX.....',
    '.XXXXXX.',
    '.XXooXX.',
    '.XXXXXX.',
    '.XX.....',
    '.XX.....',
    '.XX.....',
    'XXXX....',
  ],
} as const satisfies Record<string, readonly string[]>;

export type PixelIconName = keyof typeof ICONS;

/**
 * ドットの集合を `<Rect>` で描く。
 * 隣り合うドットの継ぎ目に隙間が出ないよう、幅・高さを少しだけ重ねている。
 *
 * **アイコン（8×8・2色）にも風景（横長・多色）にも使う。**
 * `viewBox` は行数と1行目の文字数から求めるので、正方形でなくてもよい。
 * 色は文字→色のマップで受け取る。マップに無い文字は `fallback` で塗る
 * （`.` だけは常に透明。§3.1「パターンに `.` `X` `o` 以外を混ぜないこと」の
 *  「以外」を増やすときは、必ずマップにその文字を足すこと）。
 */
export function DotGrid({
  rows,
  width,
  height,
  palette,
  fallback,
}: {
  rows: readonly string[];
  width: number;
  height: number;
  /** 文字 → 色。例 `{ X: '#000', o: '#fff' }` */
  palette: Record<string, string>;
  /** マップに無い文字を塗る色。 */
  fallback: string;
}) {
  const cols = rows[0]?.length ?? 0;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${cols} ${rows.length}`}>
      {rectsOf(rows).map(({ ch, x, y, w, h }) => (
        <Rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          // 同色の塊はまとめてあるので、重ねるのは隣の色との境目だけ
          width={w + 0.02}
          height={h + 0.02}
          fill={palette[ch] ?? fallback}
        />
      ))}
    </Svg>
  );
}

interface DotRect {
  ch: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * パターンを「同じ文字の長方形」の集合に畳む。透明（`.`）は落とす。
 *
 * 1ドット=1矩形で描くと、大きく塗る面（風景の空や草原）で
 * **矩形の境目に筋が出る**（重なり分がアンチエイリアスされるため）。
 * 横に繋げてから縦に繋げると、内側の境目そのものが無くなり、
 * 描く矩形の数も大きく減る（32×16の風景で512個 → 数十個）。
 *
 * 貪欲法で足りる。パターンは高々32×16で、最適な分割を探す必要はない。
 */
function rectsOf(rows: readonly string[]): DotRect[] {
  // 1. 各行を横方向の連続に切る
  const runs = rows.map((row) => {
    const out: { ch: string; x: number; w: number }[] = [];
    let i = 0;
    while (i < row.length) {
      const ch = row[i];
      let j = i + 1;
      while (j < row.length && row[j] === ch) j++;
      if (ch !== TRANSPARENT) out.push({ ch, x: i, w: j - i });
      i = j;
    }
    return out;
  });

  // 2. 真下にまったく同じ連続があれば縦に伸ばす
  const used = runs.map((r) => r.map(() => false));
  const rects: DotRect[] = [];
  for (let y = 0; y < runs.length; y++) {
    for (let k = 0; k < runs[y].length; k++) {
      if (used[y][k]) continue;
      const { ch, x, w } = runs[y][k];
      let h = 1;
      for (let y2 = y + 1; y2 < runs.length; y2++) {
        const k2 = runs[y2].findIndex((r, i) => !used[y2][i] && r.ch === ch && r.x === x && r.w === w);
        if (k2 === -1) break;
        used[y2][k2] = true;
        h++;
      }
      rects.push({ ch, x, y, w, h });
    }
  }
  return rects;
}

export function PixelIcon({
  name,
  size,
  color = COLORS.text,
  secondaryColor = COLORS.surface,
}: {
  name: PixelIconName;
  size: number;
  /** 主色（'X'）。予定種別なら `SCHEDULE_KIND[...].color` を渡す。 */
  color?: string;
  /** 副色（'o'）。既定はカード地の明るい色＝アイコンの「中身」が抜けて見える。 */
  secondaryColor?: string;
}) {
  return (
    <DotGrid
      rows={ICONS[name]}
      width={size}
      height={size}
      palette={{ [SECONDARY]: secondaryColor }}
      fallback={color}
    />
  );
}

/**
 * メンバーのドット絵アバター。
 *
 * **メンバー名や個人ごとの色をコードに書かない**（CLAUDE.md §3.2）。
 * 髪と服の色は `Member.color` から取り、顔の形は全員共通にする。
 * 個人ごとのドット絵ができたら、この関数の中だけを差し替えればよい。
 *
 * **色だけで判別させない**（§3.4）。呼び出し側で必ず名前を併記すること。
 */
const AVATAR = [
  '..XXXX..',
  '.XXXXXX.',
  'XXooooXX',
  'XoXooXoX',
  'XooooooX',
  '.XooooX.',
  '.XXXXXX.',
  'XXX..XXX',
] as const;

export function MemberAvatar({ member, size }: { member: Member; size: number }) {
  // 'X' = 髪・服（識別色） / 'o' = 肌（全員共通）
  return (
    <DotGrid
      rows={AVATAR}
      width={size}
      height={size}
      palette={{ [SECONDARY]: COLORS.skin }}
      fallback={member.color}
    />
  );
}
