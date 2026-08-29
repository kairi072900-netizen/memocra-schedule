import { daysUntil, openTasks, unassignedTasks } from '@/lib/project-status';
import type { Member, Task } from '@/types';

/**
 * メンバー別の負荷集計（要件定義書 F4 / S5）。
 * UIに依存しない純粋関数だけを置く（CLAUDE.md §4）。
 *
 * **CLAUDE.md §1 の成功指標を測るための計算。**
 * 「リーダーの担当タスク比率 60%以下」「担当者未定のまま24時間以上放置 0件/週」が
 * 守れているかを、リーダー自身が気づけるようにするのが目的。
 *
 * 【誰がリーダーかはコードに書かない】CLAUDE.md §3.2。
 * F4 の条件は「**誰であれ**全体の50%以上を持っていたら警告」なので、
 * 実名も役割も要らない。モックアップの「けん（リーダー）」は表示例であって条件ではない。
 */

/** F4「1人に全体の50%以上が集中している場合は色で警告」。 */
export const OVERLOAD_THRESHOLD = 0.5;

/** F4「直近7日の締切数」。 */
export const DUE_SOON_DAYS = 7;

export interface MemberWorkload {
  member: Member;
  /** 未完了（完了以外）で、この人が担当のタスク数。 */
  openCount: number;
  /**
   * そのうち締切が**今日から7日以内**のもの。
   * **締切超過も含む。** 過ぎたものこそ真っ先に手を打つ対象なので、除くと意味が逆になる。
   */
  dueSoonCount: number;
  /** 担当が決まっている未完了タスク全体に対する割合（0〜1）。 */
  share: number;
}

/**
 * メンバーごとの負荷を、未完了タスクの多い順に返す。
 *
 * 【分母に未割当を入れない】
 * 割合の分母は「**担当が決まっている**未完了タスク」にする。
 * 未割当を分母に含めると、未割当が増えるほど各人の割合が下がって警告が出にくくなる。
 * 未割当が増えている状況こそ危ないので、それで警告が消えるのは逆効果になる。
 * （未割当の件数は `unassignedCount` で別に出し、画面でも別枠で見せる）
 *
 * @param todayKey 'YYYY-MM-DD'。引数で受け取って純粋関数に保つ（テストしやすい）。
 */
export function buildWorkloads(
  tasks: Task[],
  members: Member[],
  todayKey: string,
): MemberWorkload[] {
  const open = openTasks(tasks);
  const assigned = open.filter((t) => t.assignee_id !== null);

  return members
    .map((member) => {
      const mine = assigned.filter((t) => t.assignee_id === member.id);
      const dueSoonCount = mine.filter(
        (t) => t.due_at !== null && daysUntil(t.due_at, todayKey) <= DUE_SOON_DAYS,
      ).length;
      return {
        member,
        openCount: mine.length,
        dueSoonCount,
        share: assigned.length === 0 ? 0 : mine.length / assigned.length,
      };
    })
    .sort((a, b) => b.openCount - a.openCount);
}

/**
 * 負荷が集中しているメンバー（F4 の警告対象）。
 *
 * 1人しか担当者がいない場合は share が 1.0 になるが、それは「集中」ではなく
 * 「まだその人しか割り当てられていない」だけなので、**2人以上に割り当てがあるときだけ**
 * 警告する。作り始めの企画でいきなり警告が出ると、警告そのものが無視されるようになる。
 */
export function overloadedMembers(workloads: MemberWorkload[]): MemberWorkload[] {
  const withTasks = workloads.filter((w) => w.openCount > 0);
  if (withTasks.length < 2) return [];
  return withTasks.filter((w) => w.share >= OVERLOAD_THRESHOLD);
}

/**
 * 担当が決まっていない未完了タスクの件数。
 * **誰の負荷でもないが、いちばん大きな問題**（成功指標「未割当0件/週」）。
 */
export function unassignedCount(tasks: Task[]): number {
  return unassignedTasks(tasks).length;
}

/** 割合を「57%」の形にする。四捨五入。 */
export function formatShare(share: number): string {
  return `${Math.round(share * 100)}%`;
}
