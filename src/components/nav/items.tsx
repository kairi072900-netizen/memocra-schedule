import type { PixelIconName } from '@/components/pixel/icon';

/**
 * ナビゲーションの項目定義。サイドバー（PC）と下タブ（モバイル）で共有する。
 *
 * **画面が9つあるのに、モバイルの下タブには5つしか置けない。**
 * 375pt端末でタブ1つに使えるのは65pxしかなく（CLAUDE.md §3.1 の経緯）、
 * 9つ並べるとラベルが読めなくなる。そこで
 *
 *   - **PC（広い画面）**: サイドバーに9項目すべて
 *   - **モバイル**: 下タブは `inBottomBar: true` の5つだけ
 *
 * とする。モックアップのモバイル版も5タブなので、見た目もそれに沿う。
 *
 * **下タブに出ない4画面（今週・タスク一覧・負荷・メンバー・設定）へは、
 * 画面内のリンクから辿れるようにすること。** 辿れない画面を作らないための約束:
 *   - 負荷ダッシュボード → カレンダーの「負荷サマリー」パネルの「すべて見る ›」
 *   - タスク一覧       → カレンダーの「締切タスク（自分）」パネルの「すべて見る ›」
 *   - ホーム（今週）   → カレンダーの「今日の予定」パネルの「すべて見る ›」
 *   - メンバー・設定   → カレンダーのヘッダーの歯車アイコン
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
  { name: 'notifications', label: 'お知らせ', icon: 'notifications', inBottomBar: true },
  { name: 'settings', label: '設定', icon: 'settings', inBottomBar: false },
];

export const BOTTOM_BAR_ITEMS = NAV_ITEMS.filter((i) => i.inBottomBar);
