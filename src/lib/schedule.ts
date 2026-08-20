/**
 * 予定のマージと出欠の集約。UIに依存しない純粋関数だけを置く（CLAUDE.md §4）。
 *
 * カレンダー専用テーブルは作らず、`projects.publish_at` / `projects.shoot_at` /
 * `streams.starts_at` の3つを日付でマージして1本の配列にする（要件定義書 第7章）。
 */

// 型のみのimport。実行時にはtheme.tsへ依存しないので lib の純粋性は保たれる。
// トークン名を再定義せずに済み、theme.ts とのズレも起きない。
import type { AttendanceStatusToken, ScheduleKindToken } from '@/constants/theme';
import type { Availability, Project, Stream } from '@/types';

export interface ScheduleEvent {
  id: string;
  /** 'YYYY-MM-DD'。CalendarCell.date と突き合わせる。 */
  date: string;
  kind: ScheduleKindToken;
  title: string;
  /** 配信予定のみ。出欠の集約結果。 */
  attendance?: AttendanceStatusToken;
}

/** ISO日時から日付部分だけ取り出す。'2026-08-07T19:00:00+09:00' → '2026-08-07' */
function dateOf(isoAt: string): string {
  return isoAt.slice(0, 10);
}

/**
 * 配信1件の出欠を集約する。
 *
 * 優先順位は **欠席あり > 未回答あり > 未確定あり > 全員出席**。対応が必要な順に並べている。
 * 未回答は要件定義書 F7 でリマインド再送の対象なので、maybe より優先度を上げている。
 *
 * 未回答はレコードが存在しないことで表現されるため、`memberCount` との差で判定する。
 */
export function aggregateAttendance(
  answers: Availability[],
  memberCount: number,
): AttendanceStatusToken {
  if (answers.some((a) => a.answer === 'no')) return 'hasAbsent';
  if (answers.length < memberCount) return 'hasNoAnswer';
  if (answers.some((a) => a.answer === 'maybe')) return 'hasMaybe';
  return 'allPresent';
}

export interface BuildScheduleInput {
  projects: Project[];
  streams: Stream[];
  availabilities: Availability[];
  memberCount: number;
}

/** 3つのソースを1本の予定配列にまとめる。日付順にソート済みで返す。 */
export function buildScheduleEvents({
  projects,
  streams,
  availabilities,
  memberCount,
}: BuildScheduleInput): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];

  for (const p of projects) {
    if (p.publish_at) {
      events.push({
        id: `${p.id}-publish`,
        date: dateOf(p.publish_at),
        // sns / other は今のところカレンダーの色を持たない。ショート扱いで出す。
        kind: p.kind === 'long' ? 'longPublish' : 'shortPublish',
        title: p.title,
      });
    }
    if (p.shoot_at) {
      events.push({
        id: `${p.id}-shoot`,
        date: dateOf(p.shoot_at),
        kind: 'shoot',
        title: p.title,
      });
    }
  }

  for (const s of streams) {
    const answers = availabilities.filter((a) => a.stream_id === s.id);
    events.push({
      id: s.id,
      date: dateOf(s.starts_at),
      kind: 'stream',
      title: s.title,
      attendance: aggregateAttendance(answers, memberCount),
    });
  }

  events.sort((a, b) => a.date.localeCompare(b.date));
  return events;
}

/** 日付キーで引ける形にする。カレンダーの各セルはこれを1回参照するだけで済む。 */
export function groupEventsByDate(events: ScheduleEvent[]): Record<string, ScheduleEvent[]> {
  const byDate: Record<string, ScheduleEvent[]> = {};
  for (const e of events) {
    (byDate[e.date] ??= []).push(e);
  }
  return byDate;
}
