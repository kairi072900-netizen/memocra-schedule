import { supabase } from '@/lib/supabase';
import type {
  Availability,
  AvailabilityAnswer,
  ExternalCalendar,
  ExternalEvent,
  Goal,
  Meeting,
  GoalHorizon,
  GoalScope,
  GoalStatus,
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

// ---------------------------------------------------------------------------
// 目標（goals）
//
// 要件定義書には無く、ユーザーの要望で足した機能。
// スコープ（team / member / project）と対象列の整合はDB側のCHECK制約が保証するので、
// ここでは組み立てだけ間違えないようにする（0004_goals.sql）。
// ---------------------------------------------------------------------------

/** 期限の近い順、期限なしは末尾。同じ画面で短期と中長期を並べるため状態順は付けない。 */
export async function getGoals(): Promise<Goal[]> {
  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .order('due_on', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`目標の取得に失敗しました: ${error.message}`);
  }
  return data;
}

export interface GoalInput {
  scope: GoalScope;
  horizon: GoalHorizon;
  /** `scope: 'member'` のときだけ入れる。他は null。 */
  member_id: string | null;
  /** `scope: 'project'` のときだけ入れる。他は null。 */
  project_id: string | null;
  title: string;
  metric: string | null;
  target_value: number | null;
  due_on: string | null;
}

export async function createGoal(input: GoalInput): Promise<Goal> {
  const { data, error } = await supabase.from('goals').insert(input).select().single();

  if (error) {
    throw new Error(`目標の登録に失敗しました: ${error.message}`);
  }
  return data;
}

export type GoalPatch = Partial<GoalInput & { current_value: number; status: GoalStatus }>;

export async function updateGoal(id: string, patch: GoalPatch): Promise<Goal> {
  const { data, error } = await supabase
    .from('goals')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`目標の更新に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * 目標を削除する。
 *
 * **達成できなかった目標は消さずに `status: 'dropped'` にするほうがよい**
 * （何を諦めたかが振り返れなくなるため）。削除は登録し間違えたときのためのもの。
 */
export async function deleteGoal(id: string): Promise<void> {
  const { error } = await supabase.from('goals').delete().eq('id', id);
  if (error) {
    throw new Error(`目標の削除に失敗しました: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// 外部カレンダー（Google / TimeTree の公開 ICS URL）
//
// **読み取り専用の連携。** 取り込みは Edge Function `sync-ics` が行う
// （ブラウザから ICS を直接 fetch すると CORS で弾かれるため）。
// 要件定義書には無く、ユーザーの要望で足した機能。
// ---------------------------------------------------------------------------

export async function getExternalCalendars(): Promise<ExternalCalendar[]> {
  const { data, error } = await supabase
    .from('external_calendars')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(`外部カレンダーの取得に失敗しました: ${error.message}`);
  }
  return data;
}

export async function getExternalEvents(): Promise<ExternalEvent[]> {
  const { data, error } = await supabase
    .from('external_events')
    .select('*')
    .order('starts_at', { ascending: true });

  if (error) {
    throw new Error(`外部カレンダーの予定の取得に失敗しました: ${error.message}`);
  }
  return data;
}

export async function createExternalCalendar(input: {
  label: string;
  ics_url: string;
}): Promise<ExternalCalendar> {
  const { data, error } = await supabase
    .from('external_calendars')
    .insert(input)
    .select()
    .single();

  if (error) {
    throw new Error(`外部カレンダーの登録に失敗しました: ${error.message}`);
  }
  return data;
}

export async function updateExternalCalendar(
  id: string,
  patch: Partial<Pick<ExternalCalendar, 'label' | 'ics_url' | 'enabled'>>,
): Promise<ExternalCalendar> {
  const { data, error } = await supabase
    .from('external_calendars')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`外部カレンダーの更新に失敗しました: ${error.message}`);
  }
  return data;
}

/** 取り込んだ予定は FK の `on delete cascade` で一緒に消える。 */
export async function deleteExternalCalendar(id: string): Promise<void> {
  const { error } = await supabase.from('external_calendars').delete().eq('id', id);
  if (error) {
    throw new Error(`外部カレンダーの削除に失敗しました: ${error.message}`);
  }
}

export interface SyncIcsResult {
  synced: number;
  results: { id: string; label: string; count: number; error: string | null }[];
}

/**
 * 登録済みの外部カレンダーをまとめて取り込み直す。
 *
 * Edge Function `sync-ics` を呼ぶ。`functions.invoke` はログイン中のユーザーの
 * JWT を自動で載せるので、関数側は RLS 越しにしかデータを触れない（§3.5）。
 *
 * **関数が未デプロイのうちは失敗する。** 呼び出し側でエラーを画面に出し、
 * カレンダー本体の表示は止めないこと。
 */
export async function syncExternalCalendars(): Promise<SyncIcsResult> {
  const { data, error } = await supabase.functions.invoke<SyncIcsResult>('sync-ics', {
    body: {},
  });

  if (error) {
    throw new Error(`外部カレンダーの取り込みに失敗しました: ${error.message}`);
  }
  if (!data) {
    throw new Error('外部カレンダーの取り込みが空の応答を返しました');
  }
  return data;
}

// ---------------------------------------------------------------------------
// 議事録（meetings）と会議の音声
//
// 録音そのものはアプリの外（iPhone のボイスメモ等）で行う。ここは
// 「ファイルを置く」「AIが作った議事録を保存する」だけ。
// 文字起こしと要約は Edge Function `ai`（`src/lib/ai.ts` 経由）。
// ---------------------------------------------------------------------------

export async function getMeetings(): Promise<Meeting[]> {
  const { data, error } = await supabase
    .from('meetings')
    .select('*')
    .order('held_on', { ascending: false });

  if (error) {
    throw new Error(`議事録の取得に失敗しました: ${error.message}`);
  }
  return data;
}

export type MeetingInput = Partial<
  Pick<Meeting, 'title' | 'held_on' | 'agenda' | 'transcript' | 'minutes' | 'decisions' | 'todos' | 'audio_path'>
>;

export async function createMeeting(input: MeetingInput): Promise<Meeting> {
  const created_by = await getCurrentUserId();
  const { data, error } = await supabase
    .from('meetings')
    .insert({ ...input, created_by })
    .select()
    .single();

  if (error) {
    throw new Error(`議事録の保存に失敗しました: ${error.message}`);
  }
  return data;
}

export async function updateMeeting(id: string, patch: MeetingInput): Promise<Meeting> {
  const { data, error } = await supabase
    .from('meetings')
    .update(patch)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    throw new Error(`議事録の更新に失敗しました: ${error.message}`);
  }
  return data;
}

/**
 * 議事録を削除する。**Storage の音声ファイルは消えない**
 * （消したい場合は Supabase の管理画面から。誤操作で音源を失わないための判断）。
 */
export async function deleteMeeting(id: string): Promise<void> {
  const { error } = await supabase.from('meetings').delete().eq('id', id);
  if (error) {
    throw new Error(`議事録の削除に失敗しました: ${error.message}`);
  }
}

/**
 * 会議の録音をアップロードして、Storage 上のパスを返す。
 *
 * バケットは **private**（`0006_meetings.sql`）。会議の録音は私的な会話を含みうるので、
 * 公開バケットにはしない。Edge Function が呼び出した人の権限で読みに行く。
 */
export async function uploadMeetingAudio(file: File): Promise<string> {
  const userId = await getCurrentUserId();
  // 名前の衝突を避けつつ、誰がいつ上げたかが分かるパスにする
  const safeName = file.name.replace(/[^\w.-]/g, '_');
  const path = `${userId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from('meeting-audio').upload(path, file, {
    contentType: file.type || 'audio/m4a',
    upsert: false,
  });

  if (error) {
    throw new Error(`音声のアップロードに失敗しました: ${error.message}`);
  }
  return path;
}
