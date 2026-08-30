import type { Goal, GoalHorizon } from '@/types';

/**
 * 目標の集計。UIに依存しない純粋関数だけを置く（CLAUDE.md §4）。
 *
 * 【`level.ts` と混ぜないこと】レベルは完了タスク数だけで決まる加点型で、
 * 減る要素を持たない（CLAUDE.md §2）。目標は「達成できなかった」があり得るので、
 * ここの結果をレベルに流し込んではいけない。却下したHP案に戻る。
 */

/** 表示順。短期 → 中長期。手前の期間から見るほうが行動に繋がる。 */
export const GOAL_HORIZON_ORDER: GoalHorizon[] = ['short', 'long'];

export const GOAL_HORIZON_LABEL: Record<GoalHorizon, string> = {
  short: '短期',
  long: '中長期',
};

/** 期間の目安。入力の助けにするだけで、DBには保存しない。 */
export const GOAL_HORIZON_HINT: Record<GoalHorizon, string> = {
  short: '今月・今四半期',
  long: '半年・1年',
};

export const GOAL_SCOPE_LABEL = {
  team: 'チーム',
  member: '個人',
  project: '企画',
} as const;

export const GOAL_STATUS_LABEL = {
  active: '進行中',
  achieved: '達成',
  dropped: 'やめた',
} as const;

/**
 * 進捗（0〜1）。目標値が無い／0以下なら null を返す。
 *
 * **null を 0 で代用しない。** 「数値で測らない目標」と「まだ0件の目標」は違う。
 * バーを出すかどうかの判断を呼び出し側に委ねるため、区別できる形で返す。
 */
export function progressOf(goal: Goal): number | null {
  if (goal.target_value === null || goal.target_value <= 0) return null;
  return Math.min(1, Math.max(0, goal.current_value / goal.target_value));
}

/** 目標値に届いているか。数値で測らない目標は常に false（人が「達成」に変える）。 */
export function isReached(goal: Goal): boolean {
  if (goal.target_value === null) return false;
  return goal.current_value >= goal.target_value;
}

/** 進行中のものだけ。達成済み・やめたものは一覧の下にまとめる。 */
export function activeGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => g.status === 'active');
}

export function goalsOfMember(goals: Goal[], memberId: string): Goal[] {
  return goals.filter((g) => g.scope === 'member' && g.member_id === memberId);
}

export function goalsOfProject(goals: Goal[], projectId: string): Goal[] {
  return goals.filter((g) => g.scope === 'project' && g.project_id === projectId);
}

export function teamGoals(goals: Goal[]): Goal[] {
  return goals.filter((g) => g.scope === 'team');
}

/**
 * 期限まであと何日か。マイナスなら超過。期限が無ければ null。
 * @param todayKey 'YYYY-MM-DD'。引数で受けて純粋関数に保つ（`project-status.ts` と同じ流儀）。
 */
export function daysUntilDue(goal: Goal, todayKey: string): number | null {
  if (goal.due_on === null) return null;
  const toTime = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((toTime(goal.due_on) - toTime(todayKey)) / MS_PER_DAY);
}
