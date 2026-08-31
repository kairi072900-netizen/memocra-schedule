import type { PixelIconName } from '@/components/pixel/icon';

/**
 * ナビゲーションの項目定義。サイドバー（PC）と下タブ（モバイル）で共有する。
 *
 * **画面が13あるのに、モバイルの下タブには5つしか置けない。**
 * 375pt端末でタブ1つに使えるのは65pxしかなく（CLAUDE.md §3.1 の経緯）、
 * 9つ並べるとラベルが読めなくなる。そこで
 *
 *   - **PC（広い画面）**: サイドバーに13項目すべて
 *   - **モバイル**: 下タブは `inBottomBar: true` の5つだけ
 *
 * とする。モックアップのモバイル版も5タブなので、見た目もそれに沿う。
 *
 * **下タブに出ない8画面へは、下タブの「その他」から辿れる**（2026-08-31）。
 * 以前は画面内リンクだけが入口で、目標・AI・議事録は設定画面からの一方通行だった
 * （戻る導線も無かった）。「その他」を置いたことでどの画面にも2手で行ける。
 *
 * 画面内の近道は引き続き残す（使う流れの中にあるほうが手数が少ないため）:
 *   - 負荷ダッシュボード → カレンダーの「負荷サマリー」パネルの「すべて見る ›」
 *   - タスク一覧       → カレンダーの「締切タスク（自分）」パネルの「すべて見る ›」
 *   - メンバー・設定   → カレンダーのヘッダーの歯車アイコン
 *   - AI               → 新規登録の「文章から作る」／企画詳細の「締切・担当の調整」
 *
 * 【「ホーム」の重複を整理した】カレンダーの下部には既に「今日の予定 / 今週の公開予定 /
 * 負荷サマリー / 締切タスク」の4パネルがあり、`home`（今週）と役割が重なっていた。
 * **カレンダーをホームとする**（下タブの先頭・ラベルも「ホーム」）。
 * `home` は「その他」に置き、今週の一覧を見たいときだけ開く画面にする。
 */
export interface NavItem {
  /** `(tabs)` 配下のファイル名（= ルート名）。 */
  name: string;
  label: string;
  icon: PixelIconName;
  /** モバイルの下タブに出すか。 */
  inBottomBar: boolean;
  /** 下タブでのラベル（幅が狭いので短くする）。 */
  shortLabel?: string;
}

/** 下タブの「その他」に出す項目（＝下タブに直接は出ない項目）。 */
export const MORE_ITEMS_LABEL = 'その他';

/** 表示順はモックアップのサイドバーに合わせる。 */
export const NAV_ITEMS: NavItem[] = [
  { name: 'calendar', label: 'カレンダー', icon: 'calendar', inBottomBar: true, shortLabel: 'ホーム' },
  { name: 'home', label: 'ホーム（今週）', icon: 'home', inBottomBar: false },
  { name: 'projects', label: 'プロジェクト', icon: 'projects', inBottomBar: true },
  { name: 'tasks', label: 'タスク一覧', icon: 'tasks', inBottomBar: false },
  { name: 'new', label: '新規登録', icon: 'plus', inBottomBar: true, shortLabel: '新規' },
  { name: 'availability', label: '配信・出欠', icon: 'availability', inBottomBar: true, shortLabel: '出欠' },
  { name: 'workload', label: '負荷ダッシュボード', icon: 'workload', inBottomBar: false },
  { name: 'members', label: 'メンバー', icon: 'members', inBottomBar: false },
  { name: 'goals', label: '目標', icon: 'goals', inBottomBar: false },
  { name: 'ai', label: 'AI', icon: 'ai', inBottomBar: false },
  { name: 'meetings', label: '議事録', icon: 'meetings', inBottomBar: false },
  { name: 'notifications', label: 'お知らせ', icon: 'notifications', inBottomBar: true },
  { name: 'settings', label: '設定', icon: 'settings', inBottomBar: false },
];

export const BOTTOM_BAR_ITEMS = NAV_ITEMS.filter((i) => i.inBottomBar);

/** 下タブの「その他」シートに並べる残りの項目。 */
export const MORE_ITEMS = NAV_ITEMS.filter((i) => !i.inBottomBar);
