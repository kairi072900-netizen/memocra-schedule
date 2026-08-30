/**
 * 日付・時刻の入力まわりの純粋関数（CLAUDE.md §4「lib は UI に依存しない」）。
 *
 * `stream-form.tsx` と `project-form.tsx` が同じ正規表現と `isRealDate` を
 * それぞれ持っていた（コピーが2つあると片方だけ直す事故が起きる）。
 * ピッカー（`components/pixel/date-picker.tsx`）も同じ判定を使うので、ここに集約する。
 */

/** 'YYYY-MM-DD'。カレンダーの `CalendarCell.date` と同じ書式（`lib/calendar.ts`）。 */
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 'HH:MM'（24時間）。 */
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * 書式が合っているだけでなく、実在する日付かを見る。
 * '2026-02-30' は DATE_RE を通ってしまうため、Date に通して繰り上がりを検出する。
 */
export function isRealDate(s: string): boolean {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

/** 書式・実在の両方を満たすか。フォームの検証はこれ1つで足りる。 */
export function isValidDateKey(s: string): boolean {
  return DATE_RE.test(s) && isRealDate(s);
}

export function isValidTime(s: string): boolean {
  return TIME_RE.test(s);
}

/**
 * 日付と時刻を JST の ISO 8601 にする。
 *
 * オフセットを固定文字列で付けるのは、`Date` に通すと端末のタイムゾーンでずれるため
 * （`lib/schedule.ts` の dateOf / timeOf が文字列スライスで読む流儀と対になっている）。
 */
export function toIsoAt(dateKey: string, time: string): string {
  return `${dateKey}T${time}:00+09:00`;
}
