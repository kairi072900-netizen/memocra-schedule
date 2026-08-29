import type { Task } from '@/types';

/**
 * 加点型のレベル（要件定義書 12.6）。UIに依存しない純粋関数だけを置く（CLAUDE.md §4）。
 *
 * 【なぜ加点だけなのか】
 * 要件定義書 12.6 は「タスクを抱えるとHPが減る」案を検討したうえで却下している。
 * **負荷の集中は本人の問題ではなく仕組みの問題**なので、それを個人のHP減少として
 * 表示すると減点評価のように受け取られかねない。負荷の可視化は負荷サマリー
 * （`src/lib/workload.ts`）が既に担っており、二重表現にもなる。
 *
 * そこで「採用するなら**加点方向に倒す**。減る指標は置かない」という結論に沿って、
 * **完了したタスクの数だけで決まる**ものにした。
 *
 * **ここに減る要素を足さないこと。** 未完了数・遅延・負荷の偏りをレベルに
 * 反映させてはいけない。それをやると却下したはずのHP案に戻る。
 */

/** タスク1件を完了したときのEXP。 */
export const EXP_PER_TASK = 10;

/** Lv1→2 に必要なEXP。以降はレベルが上がるほど必要量が増える。 */
const BASE_EXP_FOR_NEXT = 50;

/** Lv N → N+1 に必要なEXP。 */
function expForLevel(level: number): number {
  return BASE_EXP_FOR_NEXT * level;
}

export interface LevelInfo {
  level: number;
  /** 累計EXP。 */
  exp: number;
  /** 今のレベルに入ってから貯めたEXP。 */
  expInLevel: number;
  /** 次のレベルまでに必要なEXP。 */
  expForNext: number;
}

/**
 * 完了タスク数からレベルを求める。
 * 完了0件なら Lv1・EXP0（**0から始まる。マイナスにはならない**）。
 */
export function levelOf(doneCount: number): LevelInfo {
  const exp = Math.max(0, doneCount) * EXP_PER_TASK;

  let level = 1;
  let remaining = exp;
  while (remaining >= expForLevel(level)) {
    remaining -= expForLevel(level);
    level += 1;
  }

  return { level, exp, expInLevel: remaining, expForNext: expForLevel(level) };
}

/** そのメンバーが完了したタスクの数。 */
export function doneTaskCount(tasks: Task[], memberId: string | null): number {
  if (!memberId) return 0;
  return tasks.filter((t) => t.status === 'done' && t.assignee_id === memberId).length;
}
