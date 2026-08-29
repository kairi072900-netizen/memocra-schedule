import { supabase } from '@/lib/supabase';
import type {
  Availability,
  AvailabilityAnswer,
  Member,
  Project,
  Stream,
  StreamPlatform,
} from '@/types';

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
