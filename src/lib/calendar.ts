/**
 * 月カレンダーのグリッド計算。UIに依存しない純粋関数だけを置く（CLAUDE.md §4）。
 *
 * 既製のカレンダーライブラリは使わない（CLAUDE.md §3.1）。
 * ここで42セルの配列を組み立て、画面側はそれを7列で並べるだけにする。
 */

/** 週の開始は日曜。日本の一般的なカレンダーに合わせる。 */
export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

export const DAYS_IN_WEEK = 7;

/**
 * 常に6行で組む。月によって5行と6行が入れ替わると、月送りのたびに
 * カレンダーの高さが変わり、下のコンテンツが飛ぶため。
 */
export const WEEKS_IN_GRID = 6;

export const CELLS_IN_GRID = DAYS_IN_WEEK * WEEKS_IN_GRID;

export interface CalendarCell {
  /** 'YYYY-MM-DD'。予定データとの突き合わせキー。 */
  date: string;
  day: number;
  /** false なら前月末・翌月頭のセル。グレーアウトして予定は出さない。 */
  isCurrentMonth: boolean;
  isToday: boolean;
  /** 0=日 … 6=土 */
  weekday: number;
}

/** 年月日から 'YYYY-MM-DD' を作る。`toISOString()` はUTCへずれるので使わない。 */
export function toDateKey(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  return `${year}-${mm}-${dd}`;
}

/** Date から 'YYYY-MM-DD'（ローカル時刻basis）。 */
export function dateToKey(d: Date): string {
  return toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

export interface YearMonth {
  year: number;
  /** 1-12。JSのDateと違い1始まりにする。off-by-oneの事故を避けるため。 */
  month: number;
}

/** 月を delta ヶ月ずらす。年またぎも処理する。 */
export function addMonths({ year, month }: YearMonth, delta: number): YearMonth {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

/** 'YYYY-MM-DD' が属する年月を取り出す。隣接月のセルをタップしたときの移動先に使う。 */
export function yearMonthOf(dateKey: string): YearMonth {
  return { year: Number(dateKey.slice(0, 4)), month: Number(dateKey.slice(5, 7)) };
}

export function formatMonthLabel({ year, month }: YearMonth): string {
  return `${year}年${month}月`;
}

export function daysInMonth({ year, month }: YearMonth): number {
  // 翌月の0日 = 当月の末日
  return new Date(year, month, 0).getDate();
}

/**
 * 42セルの配列を組み立てる。
 *
 * 1. 1日の曜日を求め、週の開始（日曜）からのオフセット分だけ前月末を詰める
 * 2. 当月の日数を並べる
 * 3. 42セルに満たない残りを翌月頭で埋める
 *
 * @param todayKey 'YYYY-MM-DD'。引数で受け取ることで、この関数を純粋に保つ（テスト可能にする）。
 */
export function buildMonthGrid(target: YearMonth, todayKey: string): CalendarCell[] {
  const { year, month } = target;
  const leadingCount = new Date(year, month - 1, 1).getDay();

  const prev = addMonths(target, -1);
  const prevDays = daysInMonth(prev);
  const currentDays = daysInMonth(target);
  const next = addMonths(target, 1);

  const cells: CalendarCell[] = [];

  const push = (ym: YearMonth, day: number, isCurrentMonth: boolean) => {
    const date = toDateKey(ym.year, ym.month, day);
    cells.push({
      date,
      day,
      isCurrentMonth,
      isToday: date === todayKey,
      weekday: cells.length % DAYS_IN_WEEK,
    });
  };

  for (let i = leadingCount; i > 0; i--) push(prev, prevDays - i + 1, false);
  for (let d = 1; d <= currentDays; d++) push(target, d, true);
  for (let d = 1; cells.length < CELLS_IN_GRID; d++) push(next, d, false);

  return cells;
}
