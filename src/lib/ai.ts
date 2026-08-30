import { supabase } from '@/lib/supabase';
import type { Member, Project, Task } from '@/types';

/**
 * 専用AI（Gemini）の呼び出し口。
 *
 * 実際にAIを叩くのは Edge Function `ai`（`supabase/functions/ai/index.ts`）。
 * **APIキーをアプリに埋め込めない**ので、必ずサーバー経由になる（CLAUDE.md §3.5）。
 *
 * 【いちばん大事な約束: AIの出力でDBを書き換えない】
 * ここの関数は**提案を返すだけ**。`tasks` や `projects` を更新するのは、
 * 画面で人がボタンを押したときだけにする。担当と締切を人が確定させることが
 * このアプリの目的そのものなので（§1）、自動で埋めると目的が崩れる。
 *
 * 【未デプロイのときの振る舞い】関数が無ければ invoke が失敗する。
 * 呼び出し側は必ずエラーを画面に出し、**AI以外の機能は止めないこと。**
 */

/** Edge Function が落ちている／未デプロイのときに出す共通の言い回し。 */
function aiError(e: unknown): Error {
  const detail = e instanceof Error ? e.message : 'AIの呼び出しに失敗しました';
  return new Error(`${detail}\n（AI機能には Edge Function「ai」のデプロイが必要です）`);
}

async function callAi<T>(payload: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('ai', { body: payload });
  if (error) throw aiError(error);
  if (!data) throw new Error('AIが空の応答を返しました');
  // 関数側は失敗時に { error } を返すので、それも拾う
  const maybeError = (data as { error?: string }).error;
  if (typeof maybeError === 'string') throw new Error(maybeError);
  return data;
}

// ---------------------------------------------------------------------------
// 1. 自然文で予定・企画を登録する
// ---------------------------------------------------------------------------

export interface ParsedSchedule {
  mode: 'project' | 'stream';
  kind?: 'long' | 'short' | 'sns' | 'other';
  title: string;
  /** 'YYYY-MM-DD'。読み取れなければ null。 */
  date?: string | null;
  /** 'HH:MM'。書かれていなければ null（勝手に決めさせない）。 */
  time?: string | null;
  note?: string | null;
}

/**
 * 「来週の土曜20時から雑談配信」のような文章を、フォームの初期値に変える。
 *
 * **結果でフォームを埋めるだけ。登録は人がボタンを押す。**
 * @param todayKey 'YYYY-MM-DD'。「来週」を解決する基準日。
 */
export function parseScheduleText(text: string, todayKey: string): Promise<ParsedSchedule> {
  return callAi<ParsedSchedule>({ task: 'parse_schedule', text, todayKey });
}

// ---------------------------------------------------------------------------
// 2. 進捗の要約と催促の下書き
// ---------------------------------------------------------------------------

export interface ProgressSummary {
  overview: string;
  nudges: { to: string; message: string }[];
}

/**
 * 今の状況をAIに渡してまとめてもらう。
 *
 * **DBを丸ごと投げない。** 未割当・遅延・締切間近だけを人が読める形に整えて渡す。
 * 送る量が減るぶん無料枠にも収まりやすく、余計な情報を外に出さずに済む。
 */
export function summarizeProgress(input: {
  tasks: Task[];
  members: Member[];
  projects: Project[];
  todayKey: string;
}): Promise<ProgressSummary> {
  return callAi<ProgressSummary>({
    task: 'summarize_progress',
    summary: buildProgressText(input),
  });
}

/** AIに渡す文面を組み立てる。純粋関数なので中身を目で確かめられる。 */
export function buildProgressText({
  tasks,
  members,
  projects,
  todayKey,
}: {
  tasks: Task[];
  members: Member[];
  projects: Project[];
  todayKey: string;
}): string {
  const nameOf = (id: string | null) =>
    id === null ? '未割当' : (members.find((m) => m.id === id)?.name ?? '不明');
  const titleOf = (id: string) => projects.find((p) => p.id === id)?.title ?? '不明な企画';

  const open = tasks.filter((t) => t.status !== 'done');
  const overdue = open.filter((t) => t.due_at !== null && t.due_at.slice(0, 10) < todayKey);
  const unassigned = open.filter((t) => t.assignee_id === null);
  const blocked = open.filter((t) => t.status === 'blocked');

  const line = (t: Task) =>
    `- ${titleOf(t.project_id)} / ${t.title} / 担当: ${nameOf(t.assignee_id)} / 締切: ${
      t.due_at?.slice(0, 10) ?? 'なし'
    }${t.blocked_reason ? ` / ブロック理由: ${t.blocked_reason}` : ''}`;

  const perMember = members
    .map((m) => `- ${m.name}（${m.role || '役割未設定'}）: 未完了 ${
      open.filter((t) => t.assignee_id === m.id).length
    }件`)
    .join('\n');

  return [
    `今日: ${todayKey}`,
    `未完了の工程: ${open.length}件`,
    '',
    `## 締切を過ぎている工程（${overdue.length}件）`,
    overdue.map(line).join('\n') || '- なし',
    '',
    `## 担当が未定の工程（${unassigned.length}件）`,
    unassigned.map(line).join('\n') || '- なし',
    '',
    `## ブロック中の工程（${blocked.length}件）`,
    blocked.map(line).join('\n') || '- なし',
    '',
    '## メンバー別の未完了数',
    perMember || '- なし',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// 3. 企画・タイトル・サムネ案の壁打ち
// ---------------------------------------------------------------------------

/** 対話。`history` は発言を古い順に並べたもの（役割は付けず、素の文字列で渡す）。 */
export function brainstorm(history: string[]): Promise<{ text: string }> {
  return callAi<{ text: string }>({ task: 'brainstorm', history });
}

// ---------------------------------------------------------------------------
// 4. 工程の自動調整
// ---------------------------------------------------------------------------

export interface ReplanChange {
  task_id: string;
  title: string;
  due_at?: string | null;
  assignee_id?: string | null;
  assignee_name?: string | null;
}

export interface ReplanResult {
  reason: string;
  changes: ReplanChange[];
}

/**
 * 工程の締切・担当の調整案をもらう。**適用はしない。**
 * 画面で差分を見せ、人が「適用」を押したときにだけ `updateTask` を呼ぶこと。
 */
export function replanProject(input: {
  project: Project;
  tasks: Task[];
  members: Member[];
  todayKey: string;
  /** 「公開日を9/20に動かしたい」「けんに寄りすぎている」など。 */
  request: string;
}): Promise<ReplanResult> {
  const { project, tasks, members, todayKey, request } = input;
  const context = [
    `今日: ${todayKey}`,
    `企画: ${project.title}（種別: ${project.kind}）`,
    `公開予定: ${project.publish_at?.slice(0, 10) ?? '未定'}`,
    `撮影予定: ${project.shoot_at?.slice(0, 10) ?? '未定'}`,
    '',
    '## メンバー',
    members
      .map(
        (m) =>
          `- id=${m.id} / ${m.name} / 役割: ${m.role || '未設定'} / 活動時間: ${
            m.active_hours ?? '未登録'
          }`,
      )
      .join('\n'),
    '',
    '## 工程',
    tasks
      .map(
        (t) =>
          `- id=${t.id} / ${t.title} / 状態: ${t.status} / 担当: ${
            t.assignee_id ?? '未定'
          } / 締切: ${t.due_at?.slice(0, 10) ?? 'なし'}`,
      )
      .join('\n'),
    '',
    '## 変えたいこと',
    request,
  ].join('\n');

  return callAi<ReplanResult>({ task: 'replan', context });
}

// ---------------------------------------------------------------------------
// 5. 議事録
// ---------------------------------------------------------------------------

export interface MinutesResult {
  title?: string;
  transcript?: string;
  minutes: string;
  decisions: string[];
  todos: string[];
}

/**
 * 録音（Storage にアップロード済み）か、文字起こし済みテキストから議事録を作る。
 * どちらか一方を渡す。
 */
export function buildMinutes(input: {
  audioPath?: string;
  transcript?: string;
}): Promise<MinutesResult> {
  return callAi<MinutesResult>({ task: 'minutes', ...input });
}
