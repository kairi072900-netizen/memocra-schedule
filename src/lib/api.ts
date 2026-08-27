import { supabase } from '@/lib/supabase';
import type { Availability, Member, Project, Stream } from '@/types';

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
