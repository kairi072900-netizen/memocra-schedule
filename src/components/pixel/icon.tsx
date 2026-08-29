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

const GRID = 8;
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
} as const satisfies Record<string, readonly string[]>;

export type PixelIconName = keyof typeof ICONS;

/**
 * ドットの集合を `<Rect>` で描く。
 * 隣り合うドットの継ぎ目に隙間が出ないよう、幅・高さを少しだけ重ねている。
 */
function DotGrid({
  rows,
  size,
  primary,
  secondary,
}: {
  rows: readonly string[];
  size: number;
  primary: string;
  secondary: string;
}) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${GRID} ${GRID}`}>
      {rows.map((row, y) =>
        [...row].map((ch, x) => {
          if (ch === TRANSPARENT) return null;
          return (
            <Rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1.02}
              height={1.02}
              fill={ch === SECONDARY ? secondary : primary}
            />
          );
        }),
      )}
    </Svg>
  );
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
  return <DotGrid rows={ICONS[name]} size={size} primary={color} secondary={secondaryColor} />;
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
  return <DotGrid rows={AVATAR} size={size} primary={member.color} secondary={COLORS.skin} />;
}
