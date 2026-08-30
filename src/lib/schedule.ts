/**
 * 予定のマージと出欠の集約。UIに依存しない純粋関数だけを置く（CLAUDE.md §4）。
 *
 * カレンダー専用テーブルは作らず、`projects.publish_at` / `projects.shoot_at` /
 * `streams.starts_at` の3つを日付でマージして1本の配列にする（要件定義書 第7章）。
 */

// 型のみのimport。実行時にはtheme.tsへ依存しないので lib の純粋性は保たれる。
// トークン名を再定義せずに済み、theme.ts とのズレも起きない。
import type { AnswerBadgeToken, AttendanceStatusToken, ScheduleKindToken } from '@/constants/theme';
import type { Availability, ExternalEvent, Member, Project, Stream } from '@/types';

export interface ScheduleEvent {
  id: string;
  /** 'YYYY-MM-DD'。CalendarCell.date と突き合わせる。 */
  date: string;
  kind: ScheduleKindToken;
  title: string;
  /** 'HH:MM'。予定カードに出す。終日の外部予定は空文字。 */
  time: string;
  /** 配信予定のみ。出欠の集約結果。 */
  attendance?: AttendanceStatusToken;
  /** 配信予定のみ。個人の回答を引くためのキー。 */
  stream_id?: string;
  /**
   * この予定がどこから来たか。
   *
   * 'external' は Google カレンダー / TimeTree から取り込んだもの。
   * **`SCHEDULE_KIND` の4種類は増やさない**（増やすと凡例が4→5になり、
   * 「凡例を画面ごとに変えない」§3.4 の約束と1画面に収める制約の両方に響く）。
   * 代わりにこのフラグで、チップ側が灰色の別スタイルで描く。
   * 既定は 'internal'（省略時は自前の予定）。
   */
  source?: 'internal' | 'external';
}

/** ISO日時から日付部分だけ取り出す。'2026-08-07T19:00:00+09:00' → '2026-08-07' */
function dateOf(isoAt: string): string {
  return isoAt.slice(0, 10);
}

/**
 * ISO日時から時刻だけ取り出す。'2026-08-07T19:00:00+09:00' → '19:00'
 * 文字列に含まれるオフセットをそのまま採用する（Dateに通すと端末のタイムゾーンでずれるため）。
 */
function timeOf(isoAt: string): string {
  return isoAt.slice(11, 16);
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
  /** 取り込んだ外部カレンダーの予定。未取得なら省略できる。 */
  externalEvents?: ExternalEvent[];
}

/** 3つのソースを1本の予定配列にまとめる。日付順にソート済みで返す。 */
export function buildScheduleEvents({
  projects,
  streams,
  availabilities,
  memberCount,
  externalEvents = [],
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
        time: timeOf(p.publish_at),
      });
    }
    if (p.shoot_at) {
      events.push({
        id: `${p.id}-shoot`,
        date: dateOf(p.shoot_at),
        kind: 'shoot',
        title: p.title,
        time: timeOf(p.shoot_at),
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
      time: timeOf(s.starts_at),
      attendance: aggregateAttendance(answers, memberCount),
      stream_id: s.id,
    });
  }

  // 外部カレンダーの予定。**種別の色は持たせない**（'shoot' を借りているだけで、
  // 描画側は `source === 'external'` を見て灰色で出す）
  for (const e of externalEvents) {
    events.push({
      id: `ext-${e.id}`,
      date: dateOf(e.starts_at),
      kind: 'shoot',
      title: e.title,
      time: e.all_day ? '' : timeOf(e.starts_at),
      source: 'external',
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

export interface MemberAnswer {
  member: Member;
  answer: AnswerBadgeToken;
}

/**
 * 配信1件について、メンバー4人ぶんの回答を `members` の並び順で返す。
 *
 * 回答レコードが無いメンバーは 'noAnswer' になる（未回答はレコードを作らない、要件定義書 第7章）。
 * **常に全員ぶんを返す**ので、カード側は「誰が答えていないか」を欠落ではなく明示として描ける。
 */
export function resolveMemberAnswers(
  members: Member[],
  availabilities: Availability[],
  streamId: string,
): MemberAnswer[] {
  return members.map((member) => {
    const found = availabilities.find(
      (a) => a.stream_id === streamId && a.member_id === member.id,
    );
    return { member, answer: found ? found.answer : 'noAnswer' };
  });
}
