import { supabase } from '@/lib/supabase';
import type { Project } from '@/types';

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
