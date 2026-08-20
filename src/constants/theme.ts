/**
 * デザイントークン。色・余白・フォントサイズはすべてこのファイルに集約する。
 *
 * 【ルール】
 * - コンポーネント内にスタイル値をベタ書きしない。必ずここから読む（CLAUDE.md §4）。
 * - 角丸（borderRadius）は定義しない。使用禁止のため（CLAUDE.md §3.1）。
 * - メンバー識別色はここに置かない。`Member.color` から読む（CLAUDE.md §3.2）。
 *   ここに書くとメンバー名がコードに固定され、P8のマルチチーム対応で全画面の書き換えになる。
 */

/**
 * 生の色。**このモジュールの外には出さない（exportしない）。**
 *
 * 意図的に非公開にしている。予定種別色と出欠ステータス色を「色だけ」で取り出せる場所を
 * 作らないため（CLAUDE.md §3.4「色だけで意味を伝えない」）。
 * これらの色は SCHEDULE_KIND / ATTENDANCE_STATUS の中でのみ、記号とセットで使われる。
 */
const palette = {
  parchment: '#EDE0C8',
  parchmentLight: '#F5EBD8',
  parchmentDark: '#D8C6A8',
  woodDark: '#5C4433',
  woodLight: '#8B6A4A',
  ink: '#3A2A1C',
  inkMuted: '#6B5442',
  red: '#C7332B',
  purple: '#7B3FA0',
  green: '#3F8F45',
  blue: '#2F6FB5',
  yellow: '#D9A407',
  gray: '#7A7A7A',
  white: '#FFFFFF',
} as const;

// ---------------------------------------------------------------------------
// 色（意味づけ済み）
// ---------------------------------------------------------------------------

/**
 * 画面の地・枠・文字の色。
 * 予定種別と出欠ステータスの色はここには無い。下の SCHEDULE_KIND / ATTENDANCE_STATUS を使う。
 */
export const COLORS = {
  /** 画面全体の背景（羊皮紙色）。 */
  background: palette.parchment,
  /** カード・リスト行など、背景より一段明るい面。 */
  surface: palette.parchmentLight,
  /** 選択中のセルなど、背景より一段暗い面。 */
  surfaceSunken: palette.parchmentDark,

  /** 木枠の濃色。枠線の外側・下辺（影になる側）に使う。 */
  frameDark: palette.woodDark,
  /** 木枠の淡色。枠線の内側・上辺（光が当たる側）に使う。 */
  frameLight: palette.woodLight,
  /** 1〜2pxの硬い矩形の影（ぼかさない、CLAUDE.md §3.1）。 */
  shadow: palette.ink,

  /** 本文の文字色。 */
  text: palette.ink,
  /** 補足・キャプションの文字色。 */
  textMuted: palette.inkMuted,
  /** 濃色の面に乗せる文字色。 */
  textOnDark: palette.white,
} as const;

export type ColorToken = keyof typeof COLORS;

// ---------------------------------------------------------------------------
// 色 + 記号のセット
// ---------------------------------------------------------------------------

/**
 * 色と記号が必ずセットになったトークン。
 * UI部品はこのオブジェクトを丸ごと1つのpropとして受け取ること。
 * `色だけ` を渡す設計にすると、記号の併用ルール（CLAUDE.md §3.4）が破られる。
 */
export interface Badge {
  readonly color: string;
  readonly symbol: string;
  readonly label: string;
}

/**
 * カレンダーに出る予定の種別（要件定義書 F6）。
 *
 * `symbol` は暫定のテキスト記号。ドット絵アイコンができたら差し替えるが、
 * **アイコンが無い間も色だけで表示しないための最低限の担保**として今から持たせておく。
 * 配信のモチーフにクリーパー等のMinecraft意匠を使わないこと（CLAUDE.md §3.3）。
 */
export const SCHEDULE_KIND = {
  /** ロング動画の公開予定。 */
  longPublish: { color: palette.red, symbol: '▶', label: 'ロング公開' },
  /** ショート動画の公開予定。 */
  shortPublish: { color: palette.purple, symbol: '▷', label: 'ショート公開' },
  /** 配信予定。 */
  stream: { color: palette.green, symbol: '◉', label: '配信' },
  /** 撮影予定。 */
  shoot: { color: palette.blue, symbol: '■', label: '撮影' },
} as const satisfies Record<string, Badge>;

export type ScheduleKindToken = keyof typeof SCHEDULE_KIND;

/**
 * 配信の出欠ステータス（要件定義書 12.2）。
 *
 * **4種類で固定。凡例を画面ごとに変えないこと。**
 * これは個々のメンバーの回答（`AvailabilityAnswer`）ではなく、
 * 配信1件について4人の回答を集約した結果を表す。集約ロジックは後で `src/lib/` に置く。
 */
export const ATTENDANCE_STATUS = {
  /** 全員が出席。 */
  allPresent: { color: palette.green, symbol: '○', label: '全員出席' },
  /** 未定（maybe）が含まれる。 */
  hasMaybe: { color: palette.yellow, symbol: '⚠', label: '未確定あり' },
  /** 欠席（no）が含まれる。 */
  hasAbsent: { color: palette.red, symbol: '✕', label: '欠席あり' },
  /** 未回答のメンバーがいる（レコードが存在しない）。 */
  hasNoAnswer: { color: palette.gray, symbol: '―', label: '未回答あり' },
} as const satisfies Record<string, Badge>;

export type AttendanceStatusToken = keyof typeof ATTENDANCE_STATUS;

// ---------------------------------------------------------------------------
// 余白・サイズ
// ---------------------------------------------------------------------------

/** 余白は4の倍数のみ。ここに無い値を使わない（1マス=1情報のグリッドを崩さないため）。 */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type SpacingToken = keyof typeof SPACING;

/**
 * フォントサイズは4つだけ。中途半端な倍率はドット絵フォントがにじむ（CLAUDE.md §3.1）。
 *
 * DotGothic16 は16px基準のフォントなので、**`body`(16) と `display`(32) が最も鮮明**。
 * `caption`(12) と `title`(24) は16の整数倍ではないため、実機で確認してから使うこと。
 */
export const FONT_SIZE = {
  caption: 12,
  body: 16,
  title: 24,
  display: 32,
} as const;

export type FontSizeToken = keyof typeof FONT_SIZE;

/**
 * 枠線の太さ。角丸なしの `borderWidth` ＋ 濃淡2色で立体枠を作る（CLAUDE.md §3.1）。
 * 硬い矩形の影のオフセットにも同じ値を使う。
 */
export const BORDER_WIDTH = {
  hairline: 1,
  normal: 2,
  thick: 4,
} as const;

export type BorderWidthToken = keyof typeof BORDER_WIDTH;

// ---------------------------------------------------------------------------
// フォント
// ---------------------------------------------------------------------------

/**
 * `pixel` がアプリ全体の既定。`src/components/app-text.tsx` が自動で適用する。
 *
 * メモ・議事録・ブロック理由など長文は可読性を優先し、
 * 呼び出し側で `gothic` に切り替えてよい（CLAUDE.md §3.1）。
 */
export const FONT_FAMILY = {
  /** ドット絵フォント。_layout.tsx で読み込むキー名と一致させること。 */
  pixel: 'DotGothic16_400Regular',
  /** 長文用。undefined = OS標準のゴシック（iOS: ヒラギノ / Android: Noto Sans JP）。 */
  gothic: undefined,
} as const;

export type FontFamilyToken = keyof typeof FONT_FAMILY;

// ---------------------------------------------------------------------------

/** まとめて渡したいときに使う。個別importでも同じものが取れる。 */
export const theme = {
  colors: COLORS,
  scheduleKind: SCHEDULE_KIND,
  attendanceStatus: ATTENDANCE_STATUS,
  spacing: SPACING,
  fontSize: FONT_SIZE,
  borderWidth: BORDER_WIDTH,
  fontFamily: FONT_FAMILY,
} as const;
