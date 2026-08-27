import { supabase } from '@/lib/supabase';
import type { Availability, Project, Stream } from '@/types';

/**
 * Supabase から読む取得関数。**P1で `src/data/dummy.ts` を置き換えていく先。**
 *
 * `src/data/` と違い、ここの関数はすべて非同期。呼び出し側は
 * loading / error を自分で持つ必要がある（CLAUDE.md §5.2）。
 *
 * 段階移行中: projects → streams → availabilities → members の順に切り替える。
 * 切り替えていないデータは引き続き `src/data/dummy.ts` から読む。
 * 全テーブルの移行が終わったら `src/data/` ごと削除する。
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
