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
  brown: '#8A5A2B',
  white: '#FFFFFF',
  skin: '#E8B88A',
  woodDeep: '#3B2A1E',
  woodMid: '#4E3A2A',
  cyan: '#3AA6A6',
  /** モーダルの背後を覆う色。ぼかしではなく単純な半透明の板（§3.1）。 */
  scrim: 'rgba(58, 42, 28, 0.6)',

  // 背景の風景ドット絵（`components/pixel/scenery.tsx`）。
  // **Minecraft の草ブロック・土・木材のテクスチャは使わない**（§3.3）。
  // 羊皮紙色の地に馴染むよう、彩度を落としたRPG風の配色にしてある。
  sky: '#A8C4D8',
  skyDeep: '#87A8C4',
  cloud: '#F0F4F7',
  grass: '#7FA05A',
  grassDark: '#5F7D42',
  stone: '#9A9086',
  stoneDark: '#6F675E',
  flag: '#B0453D',
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
  /**
   * 曜日ヘッダーの「日」「土」だけに使う。
   *
   * 一般的な日曜赤・土曜青は、予定種別の赤（ロング公開）・青（撮影）と意味が衝突するため使わない
   * （CLAUDE.md §3.4）。木枠と同じ茶系にして、予定の4色（赤/紫/緑/青）と色相が被らないようにしている。
   * **セルの背景には色を敷かないこと。** 文字色だけに留める。
   */
  textWeekend: palette.brown,

  /**
   * 注意を引く文字色。**締切超過・担当未定**のように「対応が要る」状態に使う。
   *
   * 予定種別の赤（ロング公開）と同じ色だが、**こちらは文字色でしか使わない**。
   * 併せて必ず言葉（「3日超過」「担当が未定」）を出すので、
   * 色だけで意味を伝えることにはならない（CLAUDE.md §3.4）。
   * **背景色やバッジには使わないこと**（種別の赤と紛れるため）。
   */
  danger: palette.red,

  /** 濃色の面に乗せる、控えめな文字色（サイドバーの非選択ラベルなど）。 */
  parchmentMuted: palette.parchmentDark,

  /** PC用サイドバーの地。モックアップの濃い木目。 */
  sidebar: palette.woodDeep,
  /** サイドバーで現在地を示す面。 */
  sidebarActive: palette.woodMid,

  /**
   * レベルのEXPバー。**加点の色**（要件定義書 12.6）。
   * 負荷の警告色（`WORKLOAD.overloaded` の黄）と別にして、
   * 「貯まると良いもの」と「対応が要るもの」を混同させない。
   */
  exp: palette.cyan,

  /**
   * ドット絵アバターの肌色。**全員共通**。
   * メンバーごとの識別色は `Member.color` から読む（CLAUDE.md §3.2）。
   * ここに置いてよいのは「誰であっても同じ」色だけ。
   */
  skin: palette.skin,

  /**
   * モーダルの背後を覆う色。日付ピッカーなど。
   * 影と同じくぼかしは使わず、単色の板で覆うだけにする（§3.1）。
   */
  backdrop: palette.scrim,

  /**
   * 背景の風景ドット絵の配色。
   *
   * 【使い所を広げないこと】§3.1 の明示ルール:
   * 「背景の風景画像は**ヘッダー帯と空状態の画面だけに限定**し、
   *   リスト領域は無地の羊皮紙色にする」。
   * 縦スクロールする領域に敷くと破綻する（要件定義書 12.6 #6）。
   */
  sky: palette.sky,
  skyDeep: palette.skyDeep,
  cloud: palette.cloud,
  grass: palette.grass,
  grassDark: palette.grassDark,
  stone: palette.stone,
  stoneDark: palette.stoneDark,
  flag: palette.flag,
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

/**
 * **メンバー個人**の出欠回答（要件定義書 F7）。上の ATTENDANCE_STATUS とは別物。
 *
 * ATTENDANCE_STATUS は「配信1件を4人ぶん集約した結果」、こちらは「1人の回答そのもの」。
 *
 * 【なぜ maybe だけ記号を変えるのか】
 * 集約側の `⚠` は「対応が必要」という警告の意味を持たせている。
 * 個人の回答は選択肢のひとつでしかないので、警告のニュアンスを持つ `⚠` を流用すると
 * 「この人の回答自体が問題」という誤読を招く。`△` なら「未定」という状態を表すだけで済む。
 *
 * 欠席（✕）と未回答（―）は集約と同じ記号でよい。
 * 「個人の状態＝集約の材料」という関係がそのまま成り立ち、記号を変える理由がないため。
 */
export const ANSWER_BADGE = {
  yes: { color: palette.green, symbol: '○', label: '出れる' },
  maybe: { color: palette.yellow, symbol: '△', label: '未定' },
  no: { color: palette.red, symbol: '✕', label: '無理' },
  /** 回答レコードが存在しないメンバー。 */
  noAnswer: { color: palette.gray, symbol: '―', label: '未回答' },
} as const satisfies Record<string, Badge>;

export type AnswerBadgeToken = keyof typeof ANSWER_BADGE;

/**
 * 工程タスクのステータス（要件定義書 F3）。
 *
 * **予定種別の4色と衝突させないこと**（CLAUDE.md §3.4）。
 * ブロック中は注意を引きたいので赤系だが、「ロング公開の赤」と紛れないよう
 * 記号（■）を必ず併記する。完了の緑も「配信の緑」と同じ理由で記号（✓）とセットで使う。
 */
export const TASK_STATUS = {
  todo: { color: palette.gray, symbol: '□', label: '未着手' },
  doing: { color: palette.blue, symbol: '▶', label: '作業中' },
  done: { color: palette.green, symbol: '✓', label: '完了' },
  /** 理由の入力が必須。これが会議の議題になる（要件定義書 F3）。 */
  blocked: { color: palette.red, symbol: '■', label: 'ブロック中' },
} as const satisfies Record<string, Badge>;

export type TaskStatusToken = keyof typeof TASK_STATUS;

/**
 * 負荷の状態（要件定義書 F4 / S5）。
 *
 * **色だけで警告しない**（CLAUDE.md §3.4）。`overloaded` を使うときは
 * 記号（⚠）と「全体の57%」のような数値の言葉を必ず添えること。
 * バーの色を変えるだけでは、色覚特性や白黒印刷で意味が失われる。
 */
export const WORKLOAD = {
  normal: { color: palette.blue, symbol: '▬', label: '通常' },
  /** 1人に全体の50%以上が集中している状態（課題Aの再発）。 */
  overloaded: { color: palette.yellow, symbol: '⚠', label: '負荷が集中' },
} as const satisfies Record<string, Badge>;

export type WorkloadToken = keyof typeof WORKLOAD;

/**
 * 配信プラットフォームの表示名。
 * **色は持たせない。** 予定種別色（赤/紫/緑/青）や出欠色と衝突させないため、
 * プラットフォームはテキストのみで示す。
 */
export const STREAM_PLATFORM = {
  youtube: 'YouTube',
  twitch: 'Twitch',
  other: 'その他',
} as const;

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

/**
 * ドット絵フォントのサイズは3つだけ。**基準17pxとその整数倍（17 / 34 / 51）。**
 *
 * 【なぜ16の倍数ではないのか】
 * DotGothic16 は名前に反して16pxグリッドにきれいに乗っていない。
 * `unitsPerEm` が 1000 で、1グリッド = 62.5 units が整数に丸められているため、
 * グリフの輪郭が正確なピクセル境界に揃っていない（座標のGCDは1 units）。
 * そのため「16の倍数なら鮮明」という前提が成立しない。
 *
 * 実測（4種類の日本語サンプル × デバイスピクセル比1/2/3で、
 * アンチエイリアス画素の比率をサイズ由来のトレンド除去後に比較）した結果:
 *
 *   17 / 34 / 51 … 最も鮮明（最悪ケースの残差 +0.2〜+2.2%）
 *   16 / 24 / 32 / 48 … 明確に劣る（同 +7〜+8%）。特に24pxが最悪
 *
 * サイズを増やすときも17の整数倍から選ぶこと。中途半端な倍率はにじむ（CLAUDE.md §3.1）。
 */
export const FONT_SIZE = {
  /** 基準サイズ。UIラベル・カレンダーの日付・ボタンなど大半はこれ。 */
  body: 17,
  /** 画面見出し・年月表示。 */
  title: 34,
  /** 空状態やロゴ脇など、大きく見せたいときだけ。 */
  display: 51,
} as const;

export type FontSizeToken = keyof typeof FONT_SIZE;

/**
 * 長文用の補助スタイル（要件定義書 12.4 / CLAUDE.md §3.1）。
 *
 * メモ・議事録・ブロック理由など、読ませる必要がある箇所はゴシックに切り替える。
 * ゴシックはドット絵フォントと違いグリッドの制約が無いので、17の倍数に縛られない。
 *
 * **fontFamily とセットで持つのは意図的。** サイズだけを取り出して
 * ドット絵フォントに15pxを指定されると、まさに避けたいにじみが起きる
 * （SCHEDULE_KIND / ATTENDANCE_STATUS が色と記号をセットで持つのと同じ考え方）。
 */
/**
 * 下部タブバーのラベル**だけ**に使うゴシック。
 *
 * ドット絵フォント17pxだと「プロジェクト」（全角6文字＝102px）が
 * タブ1つぶんの幅（375pt端末で375/5＝75px）に収まらず「プロ…」と省略される。
 * ラベル文言は変えたくないので、ここだけゴシックに落として可読性を優先する
 * （要件定義書 12.4「可読性が必要な箇所は通常のゴシックに切り替えてよい」）。
 *
 * LONG_TEXT と同じく **fontFamily とセットで持つ。**
 * サイズだけ取り出してドット絵フォントに12pxを当てると、にじみが起きる。
 *
 * サイズが10pxなのは、React Navigation がタブボタン内側に5pxのパディングを持っており
 * （`tabBarItemStyle` では上書きできない）、375pt端末で使える幅が65pxしかないため。
 * 全角6文字を収めるには10pxが要る。iOSの標準タブラベルも10ptなので、慣習からも外れない。
 *
 * ドット絵アイコンができてラベルを短くできたら、17pxのドット絵フォントに戻すことを検討する。
 */
export const TAB_LABEL = {
  fontFamily: FONT_FAMILY.gothic,
  fontSize: 10,
} as const;

export const LONG_TEXT = {
  fontFamily: FONT_FAMILY.gothic,
  fontSize: 15,
  lineHeight: 24,
} as const;

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

/**
 * レイアウトの分岐点とサイズ。画面側に数値をベタ書きしないためにここへ集約する。
 */
export const LAYOUT = {
  /**
   * カレンダーのセル幅がこれ未満なら、文字を捨ててドット表示に切り替える。
   * モバイルでセルに文字を入れようとしないこと（要件定義書 12.3）。
   *
   * 72px なのは、チップに「20:00」（17pxのドット絵フォントで約43px）と
   * 種別アイコン・色帯・余白を足した実測の下限がこの辺りのため。
   * これ未満だと時刻すら省略され、チップにする意味が無くなる。
   */
  compactCellWidth: 72,
  /**
   * カレンダーのセルの高さ。**6行固定なので月が変わっても高さは動かない**（§3.1）。
   *
   * これは**狭い画面（スクロールする前提）で使う値**。
   * 広い画面では「残りの高さ ÷ 6行」で動的に決めるので、この値は下限としてだけ効く
   * （`calendarCellMinHeight`）。チップが潰れないよう最低限は確保する。
   */
  calendarCellHeight: SPACING.xxl * 2,
  calendarCellMinHeight: SPACING.xxl * 2,
  /** 広い画面で、カレンダーの下に置くパネル行の高さ。 */
  panelRowHeight: SPACING.xxl * 7,
  /** 予定チップ1つぶんの高さ。アイコン＋17pxの文字が収まる大きさ。 */
  chipHeight: SPACING.xl,
  /** 予定種別・タブバーのドット絵アイコン。8×8グリッドなので8の倍数にすると1ドットが整数px。 */
  iconSize: SPACING.lg,
  /** タブバーのアイコン。ラベルと合わせて tabBarHeight に収まる大きさ。 */
  tabIconSize: SPACING.lg + SPACING.xs,
  /** ヘッダーのメンバーアバター。 */
  avatarSize: SPACING.xl,
  /** チップの中に並べるミニアバター。 */
  avatarSizeSmall: SPACING.md,
  /** 予定ドット1つぶんの大きさ。1マス=1情報の正方形（要件定義書 12.1）。 */
  dotSize: SPACING.sm,
  /** 出欠バッジ。記号を FONT_SIZE.body で描くので、それが収まる大きさにする。 */
  badgeSize: SPACING.lg + SPACING.xs,
  /** 木枠の四隅に置く金具の大きさ。 */
  frameCornerSize: SPACING.sm,
  /**
   * PC用サイドバーの幅。ナビのラベル（全角6文字＝ドット絵17pxで102px）と
   * アイコン・余白が収まる最小限。
   */
  sidebarWidth: SPACING.xxl * 8,
  /**
   * この幅**以上**でサイドバーを出す。
   * サイドバー256px を引いた残りでカレンダー（7列）がチップ表示のままでいられる幅
   * （`compactCellWidth` 72px × 7列 + 余白）を下回らないように決めた。
   * これ未満では下タブに戻す。
   */
  sidebarMinWidth: 900,
  /**
   * 下部タブバーの高さ。
   * React Navigation は `tabBarIcon` が null を返してもアイコン枠を確保するため、
   * 「アイコン枠 + ラベル」が収まる高さが要る。低すぎるとラベルが潰れて読めなくなる。
   */
  tabBarHeight: SPACING.xxl * 2,
  /**
   * タップできるものの最小の大きさ。iOS ヒューマンインターフェイスガイドラインの 44pt。
   *
   * **ドット絵フォントのサイズは上げられない**（17 の整数倍のみ。次は34pxで大きすぎる。§3.1）ので、
   * 「押しにくい」は文字を大きくするのではなく、**当たり判定と余白で解決する**。
   * 見た目の枠がこれより小さくてよい場合は `hitSlop` で補う。
   */
  minTapSize: 44,
  /**
   * 日付ピッカー（`components/pixel/date-picker.tsx`）のセル。
   * 7列 × このサイズがシートの幅になる。44pt には届かないが、
   * 7列 × 44 = 308px だと狭い端末でシートが画面幅を超えるため、ここだけ40pxにしている。
   */
  pickerCellSize: 40,
  /**
   * 空状態に置く風景ドット絵（`components/pixel/scenery.tsx`）の目安の幅。
   * 32ドット幅なので、1ドット=8pxちょうどになる 256 にしてある（にじみ防止。§3.1）。
   */
  sceneryWidth: SPACING.xxl * 8,
  /** ヘッダーに敷く風景の帯の高さ。8行なので1ドット=4pxちょうど。 */
  sceneryBandHeight: SPACING.xxl,
  /**
   * カレンダーを**スクロールなしで1画面に収められる**画面の高さ。これ未満なら
   * スクロールに落とす（6行目が切れるのを防ぐ）。
   *
   * 内訳: ヘッダー2行 120 + 曜日行 33 + 凡例 33 + 下部パネル 224 +
   * グリッド 6行 × 64 = 384 → 794。余白ぶんを見て 800 にしてある。
   * **ヘッダーの行数やパネルの高さを変えたら、この値も見直すこと。**
   */
  calendarFitMinHeight: 800,
} as const;

// ---------------------------------------------------------------------------

/** まとめて渡したいときに使う。個別importでも同じものが取れる。 */
export const theme = {
  colors: COLORS,
  scheduleKind: SCHEDULE_KIND,
  attendanceStatus: ATTENDANCE_STATUS,
  answerBadge: ANSWER_BADGE,
  spacing: SPACING,
  fontSize: FONT_SIZE,
  longText: LONG_TEXT,
  borderWidth: BORDER_WIDTH,
  fontFamily: FONT_FAMILY,
  layout: LAYOUT,
} as const;
