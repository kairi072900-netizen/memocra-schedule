// iCalendar（ICS）の最小パーサ。
//
// 【ライブラリを入れない理由】必要なのは VEVENT の SUMMARY / DTSTART / DTEND / UID
// の4つだけで、それなら数十行で足りる。Deno の依存を増やすとデプロイのたびに
// 取りに行くものが増える。
//
// 【RRULE（繰り返し予定）は展開しない】毎週の配信のような予定は「最初の1回」しか
// 出ない。ここを正しくやるには RRULE / EXDATE / RECURRENCE-ID の解釈と
// タイムゾーンデータベースが要り、規模が一段変わる。
// **必要になったら次の段階で足す**（それまでは繰り返し予定が1回しか出ないことを
// 設定画面に明記しておく）。

export interface IcsEvent {
  uid: string;
  title: string;
  /** ISO 8601。 */
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
}

/**
 * 折り返された行を戻す（RFC 5545 の folding: 続きの行は空白かタブで始まる）。
 * これをやらないと、長いタイトルが途中で切れる。
 */
function unfold(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

/** `SUMMARY;LANGUAGE=ja:打ち合わせ` を `{ name, params, value }` に割る。 */
function splitLine(line: string): { name: string; params: string[]; value: string } | null {
  const colon = line.indexOf(':');
  if (colon === -1) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const [name, ...params] = head.split(';');
  return { name: name.toUpperCase(), params, value };
}

/** ICS のエスケープを戻す（`\,` `\;` `\n` `\\`）。 */
function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/**
 * DTSTART / DTEND の値を ISO 8601 にする。
 *
 * 扱う形は3つ:
 *   20260830T110000Z   … UTC。そのまま
 *   20260830T200000    … タイムゾーン指定つき、または現地時刻。**JST とみなす**
 *   20260830           … 終日（VALUE=DATE）
 *
 * TZID の中身は解釈しない。メモクラは全員日本にいるので、
 * 素の日時は JST と決め打ちにする（VTIMEZONE を読むのは規模が一段変わる）。
 */
function parseDateValue(
  value: string,
  params: string[],
): { iso: string; allDay: boolean } | null {
  const isDateOnly = params.some((p) => p.toUpperCase() === 'VALUE=DATE');
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;

  const [, y, mo, d, hh, mm, ss, z] = m;
  if (isDateOnly || hh === undefined) {
    // 終日。JST の0時として持つ（アプリ側は日付部分しか見ない）
    return { iso: `${y}-${mo}-${d}T00:00:00+09:00`, allDay: true };
  }
  const offset = z === 'Z' ? 'Z' : '+09:00';
  return { iso: `${y}-${mo}-${d}T${hh}:${mm}:${ss}${offset}`, allDay: false };
}

/**
 * ICS 本文から VEVENT を取り出す。
 *
 * @param limit 取り込む上限。壊れた/巨大なカレンダーで DB を埋めないための歯止め。
 */
export function parseIcs(text: string, limit = 500): IcsEvent[] {
  const events: IcsEvent[] = [];
  let current: Partial<IcsEvent> | null = null;

  for (const line of unfold(text)) {
    if (line.trim() === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line.trim() === 'END:VEVENT') {
      if (current && current.uid && current.starts_at && events.length < limit) {
        events.push({
          uid: current.uid,
          // タイトルが空の予定もあるので既定を用意する
          title: current.title && current.title.length > 0 ? current.title : '(無題)',
          starts_at: current.starts_at,
          ends_at: current.ends_at ?? null,
          all_day: current.all_day ?? false,
        });
      }
      current = null;
      continue;
    }
    if (!current) continue;

    const parsed = splitLine(line);
    if (!parsed) continue;
    const { name, params, value } = parsed;

    if (name === 'UID') current.uid = value;
    else if (name === 'SUMMARY') current.title = unescapeText(value);
    else if (name === 'DTSTART') {
      const d = parseDateValue(value, params);
      if (d) {
        current.starts_at = d.iso;
        current.all_day = d.allDay;
      }
    } else if (name === 'DTEND') {
      const d = parseDateValue(value, params);
      if (d) current.ends_at = d.iso;
    }
  }

  return events;
}
