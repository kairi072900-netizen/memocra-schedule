import type { ProjectStatus, Task } from '@/types';

/**
 * タスクの進捗からプロジェクトのステータスを導く（要件定義書 F3）。
 * UIに依存しない純粋関数だけを置く（CLAUDE.md §4）。
 *
 * `projects.status` 列にも値は入るが、**表示はこの導出値を優先する**。
 * タスクを進めれば勝手に追従し、ステータスの手動更新を忘れて実態とずれる、
 * という一番ありがちな失敗を避けられるため。
 */

/** 一覧のグルーピング順。企画中 → … → 振り返り済 の順で並べる。 */
export const PROJECT_STATUS_ORDER: ProjectStatus[] = [
  'planning',
  'awaiting_shoot',
  'shot',
  'editing',
  'awaiting_upload',
  'published',
  'reviewed',
];

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planning: '企画中',
  awaiting_shoot: '撮影待ち',
  shot: '撮影済',
  editing: '編集中',
  awaiting_upload: '投稿待ち',
  published: '公開済',
  reviewed: '振り返り済',
};

const isDone = (t: Task) => t.status === 'done';

/**
 * 工程の進み具合を見て、いま何段階目かを決める。
 *
 * 【公開日より後の工程を、手前の判定に混ぜない】
 * ロング動画のテンプレートには「ショート切り出し（公開+2日）」「投稿後分析（+3日）」の
 * ように**公開後にやる工程**が含まれる。これらを「編集がぜんぶ終わったか」の判定に
 * 混ぜると、動画を投稿し終えているのに「撮影済」に戻ってしまう。
 * そこで `due_at` を公開予定日と比べ、**公開日までの工程だけ**で手前の段階を判定する。
 *
 * @param publishAt プロジェクトの公開予定（ISO）。null なら全タスクを手前扱いにする。
 */
export function deriveProjectStatus(tasks: Task[], publishAt: string | null): ProjectStatus {
  if (tasks.length === 0) return 'planning';

  // 誰も何も手を付けていないうちは「企画中」。工程が並んでいるだけの状態
  if (tasks.every((t) => t.status === 'todo')) return 'planning';

  if (tasks.every(isDone)) {
    return tasks.some((t) => t.kind === 'analytics') ? 'reviewed' : 'published';
  }

  const publishDay = publishAt?.slice(0, 10) ?? null;
  const isBeforePublish = (t: Task) =>
    publishDay === null || t.due_at === null || t.due_at.slice(0, 10) <= publishDay;
  const pre = tasks.filter(isBeforePublish);
  const of = (...kinds: Task['kind'][]) => pre.filter((t) => kinds.includes(t.kind));

  // 投稿が済んでいれば公開済。SNS告知や分析が残っていても動画は世に出ている
  const upload = of('upload');
  if (upload.length > 0 && upload.every(isDone)) return 'published';

  const edits = of('edit_long', 'edit_short', 'thumbnail');
  if (edits.length > 0 && edits.every(isDone)) return 'awaiting_upload';
  if (edits.some((t) => t.status === 'doing')) return 'editing';

  const shoot = of('build', 'shoot');
  if (shoot.length > 0 && shoot.every(isDone)) return 'shot';
  if (shoot.length > 0) return 'awaiting_shoot';

  return 'planning';
}

/** 未完了（完了以外）のタスク。ブロック中も「まだ終わっていない」ので含む。 */
export function openTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status !== 'done');
}

/**
 * 担当が決まっていない未完了タスク。
 * これが放置されるのが課題A（要件定義書 F5・CLAUDE.md §1の成功指標）。
 */
export function unassignedTasks(tasks: Task[]): Task[] {
  return openTasks(tasks).filter((t) => t.assignee_id === null);
}

/**
 * 自分の未完了タスクを締切の近い順に返す（S1「ホーム（今週）」とモックアップの
 * 「締切タスク（自分）」）。締切が無いものは末尾。
 */
export function myOpenTasks(tasks: Task[], memberId: string | null): Task[] {
  if (!memberId) return [];
  return openTasks(tasks)
    .filter((t) => t.assignee_id === memberId)
    .sort((a, b) => {
      if (a.due_at === null) return 1;
      if (b.due_at === null) return -1;
      return a.due_at.localeCompare(b.due_at);
    });
}

/**
 * 締切まであと何日か。マイナスなら超過。
 * @param todayKey 'YYYY-MM-DD'。引数で受けて純粋関数に保つ。
 */
export function daysUntil(dueAt: string, todayKey: string): number {
  const toDate = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((toDate(dueAt.slice(0, 10)) - toDate(todayKey)) / MS_PER_DAY);
}
