import { supabase } from '@/lib/supabase';
import type {
  Availability,
  AvailabilityAnswer,
  Member,
  Notification,
  Project,
  ProjectKind,
  Stream,
  StreamPlatform,
  Task,
} from '@/types';
import type { NewTask } from '@/lib/task-template';

/**
 * Supabase から読む取得関数。
 *
 * すべて非同期。呼び出し側は loading / error を自分で持つ必要がある（CLAUDE.md §5.2）。
 *
 * P0時代の `src/data/dummy.ts`（ダミーデータを同期で返す形）は、
 * projects → streams → availabilities → members の順に全関数をここへ移し終えたため削除済み。
 */

/**
 * プロジェクト一覧を取得する。
 *
 * `Project` の全列が `projects` テーブルの列と1対1で対応しているため、
 * 変換層を挟まない（CLAUDE.md §4「日時のフィールドは `_at` 接尾辞。DB列名とアプリ側の型を一致させる」）。
 */
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('publish_at', { ascending: true });

  if (error) {
    throw new Error(`プロジェクトの取得に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * 配信予定一覧を取得する。
 *
 * `Stream` の全列が `streams` テーブルの列と1対1で対応しているため、
 * 変換層は挟まない（`getProjects()` と同じ考え方）。
 */
export async function getStreams(): Promise<Stream[]> {
  const { data, error } = await supabase
    .from('streams')
    .select('*')
    .order('starts_at', { ascending: true });

  if (error) {
    throw new Error(`配信予定の取得に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * 出欠回答一覧を取得する。
 *
 * `Availability` の全列が `availabilities` テーブルの列と1対1で対応しているため、
 * 変換層は挟まない（`getProjects()` と同じ考え方）。
 * 未回答のメンバーはレコードが存在しないので、この結果には含まれない
 * （要件定義書 第7章）。集約や個人回答の解決は `src/lib/schedule.ts` 側で行う。
 */
export async function getAvailabilities(): Promise<Availability[]> {
  const { data, error } = await supabase
    .from('availabilities')
    .select('*')
    .order('answered_at', { ascending: true });

  if (error) {
    throw new Error(`出欠の取得に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * メンバー一覧を取得する。
 *
 * `Member` の全列が `members` テーブルの列と1対1で対応しているため、
 * 変換層は挟まない（`getProjects()` と同じ考え方）。
 * 日時のような自然な並び順の列が無いため、`order()` は指定しない。
 */
export async function getMembers(): Promise<Member[]> {
  const { data, error } = await supabase.from('members').select('*');

  if (error) {
    throw new Error(`メンバーの取得に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * 工程タスク一覧を取得する。
 *
 * プロジェクトごとに絞らず全件取る。4人ぶんの制作なので件数はたかが知れており、
 * カレンダー・一覧・詳細が同じ配列を使い回せるほうが単純（`getProjects()` と同じ考え方）。
 * 並びは画面側で `sort_order` を使う前提で、まず締切順に取っておく。
 */
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('due_at', { ascending: true });

  if (error) {
    throw new Error(`タスクの取得に失敗しました: ${error.message}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// 書き込み（P2〜）
//
// RLS（0003_rls.sql）で streams は同一チーム全許可、availabilities は
// member_id = auth.uid() の本人スコープ。availabilities.team_id は
// set_team_id_from_parent トリガーが親の streams から自動セットするので送らない。
// ---------------------------------------------------------------------------

/**
 * ログイン中のユーザーID（= members.id = auth.users.id）。
 * `getSession()` はローカルストレージから読むだけでネットワークに出ない。
 */
async function getCurrentUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(`ログイン状態の確認に失敗しました: ${error.message}`);
  }
  const id = data.session?.user.id;
  if (!id) {
    throw new Error('ログインしていません');
  }
  return id;
}

export interface StreamInput {
  title: string;
  /** ISO 8601（JST +09:00 前提）。schedule.ts が先頭スライスで日付・時刻を見る。 */
  starts_at: string;
  duration_min: number;
  platform: StreamPlatform;
  memo: string | null;
}

/** 配信予定を登録する。`created_by` はログイン中のユーザーで固定する。 */
export async function createStream(input: StreamInput): Promise<Stream> {
  const created_by = await getCurrentUserId();
  const { data, error } = await supabase
    .from('streams')
    .insert({ ...input, created_by })
    .select()
    .single();

  if (error) {
    throw new Error(`配信予定の登録に失敗しました: ${error.message}`);
  }
  return data;
}

/** 配信予定を部分更新する。 */
export async function updateStream(id: string, patch: Partial<StreamInput>): Promise<Stream> {
  const { data, error } = await supabase
    .from('streams')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`配信予定の更新に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * 配信予定を削除する。
 * `availabilities` は FK の `on delete cascade` で連鎖削除される（CLAUDE.md §5.5）。
 * 呼び出し側で「回答も消える」ことを確認ダイアログで伝えること。
 */
export async function deleteStream(id: string): Promise<void> {
  const { error } = await supabase.from('streams').delete().eq('id', id);
  if (error) {
    throw new Error(`配信予定の削除に失敗しました: ${error.message}`);
  }
}

/**
 * 自分の出欠回答を登録／更新する（UNIQUE(stream_id, member_id) に upsert）。
 * 「未回答」に戻すときは `clearAvailability` を使う（要件定義書「未回答はレコードなし」）。
 */
export async function setAvailability(
  streamId: string,
  answer: AvailabilityAnswer,
  comment: string | null,
): Promise<void> {
  const member_id = await getCurrentUserId();
  const { error } = await supabase
    .from('availabilities')
    .upsert(
      { stream_id: streamId, member_id, answer, comment, answered_at: new Date().toISOString() },
      { onConflict: 'stream_id,member_id' },
    );

  if (error) {
    throw new Error(`出欠の回答に失敗しました: ${error.message}`);
  }
}

/** 自分の出欠回答を取り消す（＝未回答に戻す）。 */
export async function clearAvailability(streamId: string): Promise<void> {
  const member_id = await getCurrentUserId();
  const { error } = await supabase
    .from('availabilities')
    .delete()
    .eq('stream_id', streamId)
    .eq('member_id', member_id);

  if (error) {
    throw new Error(`出欠の取り消しに失敗しました: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// projects / tasks の書き込み（P5）
//
// tasks.team_id は set_team_id_from_parent トリガーが projects から自動セットするので
// 送らない（CLAUDE.md §5.1）。RLS は 0003_rls.sql の tasks_team_all で同一チーム全許可。
// ---------------------------------------------------------------------------

export interface ProjectInput {
  title: string;
  kind: ProjectKind;
  /** 公開予定（ISO）。工程の締切逆算の基点になる。 */
  publish_at: string | null;
  shoot_at: string | null;
  memo: string | null;
}

/** 企画（動画1本）を登録する。`owner_id` は登録した人を初期値にする。 */
export async function createProject(input: ProjectInput): Promise<Project> {
  const owner_id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('projects')
    .insert({ ...input, owner_id })
    .select()
    .single();

  if (error) {
    throw new Error(`企画の登録に失敗しました: ${error.message}`);
  }
  return data;
}

export async function updateProject(id: string, patch: Partial<ProjectInput>): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`企画の更新に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * 企画を削除する。`tasks` は FK の `on delete cascade` で連鎖削除される。
 * 呼び出し側で「工程も消える」ことを件数付きで伝えること（CLAUDE.md §5.5 と同じ作法）。
 */
export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) {
    throw new Error(`企画の削除に失敗しました: ${error.message}`);
  }
}

/**
 * 工程タスクをまとめて登録する（テンプレート適用。11件を1回のリクエストで入れる）。
 * 途中で失敗したときに半端な状態を残さないよう、1回の insert にしている。
 */
export async function createTasks(rows: NewTask[]): Promise<Task[]> {
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from('tasks').insert(rows).select();

  if (error) {
    throw new Error(`工程の生成に失敗しました: ${error.message}`);
  }
  return data;
}

export type TaskPatch = Partial<
  Pick<Task, 'title' | 'assignee_id' | 'due_at' | 'status' | 'blocked_reason' | 'done_at'>
>;

export async function updateTask(id: string, patch: TaskPatch): Promise<Task> {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`タスクの更新に失敗しました: ${error.message}`);
  }
  return data;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) {
    throw new Error(`タスクの削除に失敗しました: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// メンバー自身の情報 / お知らせ
// ---------------------------------------------------------------------------

export type MyMemberPatch = Partial<Pick<Member, 'name' | 'role' | 'color' | 'active_hours'>>;

/**
 * ログイン中の自分の `members` 行を更新する。
 *
 * **他人の行は更新できない。** RLS の `members_update_self`（0003_rls.sql）が
 * `id = auth.uid()` で縛っているため。他のメンバーの役割はその本人が入れる。
 * これは制限というより、各自が自分の情報に責任を持つという設計。
 */
export async function updateMyMember(patch: MyMemberPatch): Promise<Member> {
  const id = await getCurrentUserId();
  const { data, error } = await supabase
    .from('members')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`プロフィールの更新に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * 自分宛てのお知らせを新しい順に取得する。
 *
 * **通知を発行する仕組みはまだ無い（P4）**ので、今は常に空になる。
 * ベルのバッジと一覧を先に用意しておき、P4 で発行側を足せば動くようにしている。
 * RLS の `notifications_select_own` により、他人宛ては最初から返らない。
 */
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`お知らせの取得に失敗しました: ${error.message}`);
  }
  return data;
}

/** お知らせを既読にする（`read_at` を今の時刻で埋める）。 */
export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    throw new Error(`既読にできませんでした: ${error.message}`);
  }
}
