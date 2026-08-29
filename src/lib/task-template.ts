import type { Member, ProjectKind, Task, TaskKind } from '@/types';

/**
 * 工程テンプレートと締切の逆算。UIに依存しない純粋関数だけを置く（CLAUDE.md §4）。
 *
 * 要件定義書が「本アプリの中核機能」と呼んでいる部分。
 * 撮影が終わったその場でボタンを押すと、工程が担当と締切つきで並ぶ（要件定義書 F2）。
 *
 * 【メンバー名を書かないこと】CLAUDE.md §3.2。
 * 要件定義書 第5章の表は標準担当を実名（けん／南場テル等）で書いているが、
 * **コードには書かない。** ここでは `Member.role` の文字列で参照し、
 * 一致するメンバーが居なければ未割当（null）にする。
 * 未割当は24時間放置でリーダーに通知する対象（要件定義書 F5）なので、
 * 「決まっていない」ことが見えるほうが正しい。
 *
 * 【工程名について】「建築・コマンド準備」のようなメモクラ固有の用語は
 * **テンプレートのデータとして**持つ。`TaskKind` の enum 側は汎用のままにして、
 * P8のマルチチーム対応でテンプレートを差し替えるだけで済むようにする（§3.2）。
 *
 * 【DB化について】MVPではこのファイルの定数。ただし
 * **「テンプレートIDと工程の配列」という形**にしてあるので、後からDBへ移しやすい。
 */

export interface TaskTemplateStep {
  kind: TaskKind;
  /** 工程名。チーム固有の言い回しはここに置く（コードのロジックに入れない）。 */
  title: string;
  /** 公開予定日を0とした日数。-14 なら公開の14日前が締切。 */
  offsetDays: number;
  /**
   * 標準担当のロール。`Member.role` と突き合わせる。
   * null は「全員」または「その場で決める」工程。
   * **あくまで初期値。** 画面上でいつでも変更できる（要件定義書 第5章の注記）。
   */
  defaultRole: string | null;
}

export interface TaskTemplate {
  id: string;
  name: string;
  steps: TaskTemplateStep[];
}

/**
 * 種別ごとのテンプレート。**すべての `ProjectKind` に定義を持たせる**
 * （未定義があると、その種別を選んだときにタスクが1件も作られず無言で失敗する）。
 */
export const TASK_TEMPLATES: Record<ProjectKind, TaskTemplate> = {
  // 要件定義書 第5章「工程テンプレート例（ロング動画）」の11工程
  long: {
    id: 'long-v1',
    name: 'ロング動画（11工程）',
    steps: [
      { kind: 'planning', title: '企画確定', offsetDays: -14, defaultRole: '企画' },
      { kind: 'build', title: '建築・コマンド準備', offsetDays: -10, defaultRole: '建築' },
      { kind: 'shoot', title: '撮影', offsetDays: -7, defaultRole: null },
      { kind: 'shoot', title: '素材整理・共有', offsetDays: -6, defaultRole: null },
      { kind: 'edit_long', title: 'ロング編集', offsetDays: -3, defaultRole: '企画' },
      { kind: 'thumbnail', title: 'サムネ作成', offsetDays: -3, defaultRole: 'サムネ' },
      { kind: 'upload', title: 'タイトル・概要欄', offsetDays: -2, defaultRole: '企画' },
      { kind: 'upload', title: '投稿予約', offsetDays: -1, defaultRole: '企画' },
      { kind: 'edit_short', title: 'ショート切り出し', offsetDays: 2, defaultRole: 'ショート編集' },
      { kind: 'sns', title: 'SNS告知', offsetDays: 0, defaultRole: '企画' },
      { kind: 'analytics', title: '投稿後分析', offsetDays: 3, defaultRole: '建築' },
    ],
  },
  // 同章「工程テンプレート例（ショート単体）」の4工程
  short: {
    id: 'short-v1',
    name: 'ショート単体（4工程）',
    steps: [
      { kind: 'planning', title: '企画', offsetDays: -5, defaultRole: '企画' },
      { kind: 'shoot', title: '撮影・素材選定', offsetDays: -3, defaultRole: null },
      { kind: 'edit_short', title: 'ショート編集', offsetDays: -1, defaultRole: 'ショート編集' },
      { kind: 'upload', title: '投稿', offsetDays: 0, defaultRole: '企画' },
    ],
  },
  // 要件定義書に例が無いので最小構成。空にすると無言で0件生成になるため必ず持たせる
  sns: {
    id: 'sns-v1',
    name: 'SNS投稿（2工程）',
    steps: [
      { kind: 'planning', title: '内容を決める', offsetDays: -1, defaultRole: '企画' },
      { kind: 'sns', title: '投稿', offsetDays: 0, defaultRole: '企画' },
    ],
  },
  other: {
    id: 'other-v1',
    name: 'その他（2工程）',
    steps: [
      { kind: 'planning', title: '企画', offsetDays: -3, defaultRole: null },
      { kind: 'upload', title: '完了', offsetDays: 0, defaultRole: null },
    ],
  },
};

/** DBに入れる直前のタスク。`id` と `team_id` はDB側が決める（team_id はトリガー）。 */
export type NewTask = Omit<Task, 'id' | 'team_id'>;

/**
 * ISO日時に日数を足して ISO日時で返す。
 *
 * 時刻とタイムゾーンは基点のものをそのまま保つ（'2026-08-20T19:00:00+09:00' の
 * -14日は '2026-08-06T19:00:00+09:00'）。日付部分だけを動かすので、
 * `Date` に通してもタイムゾーンでずれない。
 */
function addDaysToIso(isoAt: string, days: number): string {
  const [y, m, d] = isoAt.slice(0, 10).split('-').map(Number);
  const shifted = new Date(y, m - 1, d + days);
  const yy = shifted.getFullYear();
  const mm = String(shifted.getMonth() + 1).padStart(2, '0');
  const dd = String(shifted.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}${isoAt.slice(10)}`;
}

export interface BuildTasksInput {
  projectId: string;
  kind: ProjectKind;
  /** 公開予定日時（ISO）。逆算の基点。 */
  publishAt: string;
  /** 標準担当を解決するために使う。`role` が一致した人が初期担当になる。 */
  members: Member[];
}

/**
 * テンプレートから工程タスクを組み立てる。**DBには触らない。**
 *
 * 担当が決まらない工程は `assignee_id: null`（未割当）のままにする。
 * 埋めてしまうと「誰も決めていない」ことが見えなくなり、
 * 成功指標（担当者未定の放置0件）を測れなくなる。
 */
export function buildTasksFromTemplate({
  projectId,
  kind,
  publishAt,
  members,
}: BuildTasksInput): NewTask[] {
  const template = TASK_TEMPLATES[kind];
  return template.steps.map((step, index) => ({
    project_id: projectId,
    kind: step.kind,
    title: step.title,
    assignee_id: step.defaultRole
      ? (members.find((m) => m.role === step.defaultRole)?.id ?? null)
      : null,
    due_at: addDaysToIso(publishAt, step.offsetDays),
    status: 'todo' as const,
    blocked_reason: null,
    sort_order: index,
    done_at: null,
  }));
}

/**
 * 締切が既に過ぎている工程を返す（要件定義書 F2「締切が過去日になる場合は警告」）。
 *
 * 例: 公開まで3日しかないのに -14日の工程がある、というケースを作成時に知らせる。
 * **作成を止めるためではなく、気づかせるため**の情報。
 *
 * @param todayKey 'YYYY-MM-DD'。引数で受け取ることで純粋関数に保つ（テストしやすい）。
 */
export function pastDueTasks(tasks: NewTask[], todayKey: string): NewTask[] {
  return tasks.filter((t) => t.due_at !== null && t.due_at.slice(0, 10) < todayKey);
}
