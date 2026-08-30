// 外部カレンダー（Google / TimeTree の公開 ICS URL）を取り込む Edge Function。
//
// 【デプロイ】
//   supabase functions deploy sync-ics
//
// 【呼び方】クライアントから `supabase.functions.invoke('sync-ics')`。
// ユーザーの JWT が自動で乗るので、`authenticate` がそれを使って RLS を効かせる。
//
// 【なぜサーバーが要るか】ブラウザから ICS の URL を直接 fetch すると CORS で弾かれる。
// **AI を使わなくてもこの関数は要る**（外部カレンダー連携の必須の土台）。
//
// 【書き戻さない】読み取り専用。アプリの予定を Google に送ることはしない。

import { authenticate, CORS_HEADERS, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { parseIcs } from '../_shared/ics.ts';

/** 取りに行くのは1カレンダーあたり最大この件数。壊れたURLでDBを埋めないための歯止め。 */
const MAX_EVENTS_PER_CALENDAR = 500;

/** ICS の取得に時間をかけすぎない。落ちているURLで関数全体を止めないため。 */
const FETCH_TIMEOUT_MS = 15_000;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const caller = await authenticate(req);
  if (caller instanceof Response) return caller;
  const { client } = caller;

  const { data: calendars, error } = await client
    .from('external_calendars')
    .select('*')
    .eq('enabled', true);

  if (error) return errorResponse(`カレンダーの一覧を読めませんでした: ${error.message}`, 500);
  if (!calendars || calendars.length === 0) return jsonResponse({ synced: 0, results: [] });

  const results: { id: string; label: string; count: number; error: string | null }[] = [];

  for (const cal of calendars) {
    let count = 0;
    let failure: string | null = null;

    try {
      const res = await fetch(cal.ics_url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: 'text/calendar, text/plain' },
      });
      if (!res.ok) throw new Error(`URLの取得に失敗しました（${res.status}）`);

      const events = parseIcs(await res.text(), MAX_EVENTS_PER_CALENDAR);

      // 消された予定を残さないよう、そのカレンダーぶんを入れ替える。
      // 4人ぶんのカレンダーで数百件なので、差分を取るより入れ替えのほうが単純で安全
      const { error: deleteError } = await client
        .from('external_events')
        .delete()
        .eq('calendar_id', cal.id);
      if (deleteError) throw new Error(deleteError.message);

      if (events.length > 0) {
        const rows = events.map((e) => ({
          calendar_id: cal.id,
          uid: e.uid,
          title: e.title,
          starts_at: e.starts_at,
          ends_at: e.ends_at,
          all_day: e.all_day,
        }));
        // 同じ UID・開始時刻が2回出てくる ICS があるので upsert にする
        const { error: insertError } = await client
          .from('external_events')
          .upsert(rows, { onConflict: 'calendar_id,uid,starts_at' });
        if (insertError) throw new Error(insertError.message);
      }
      count = events.length;
    } catch (e) {
      failure = e instanceof Error ? e.message : '取り込みに失敗しました';
    }

    // 成否にかかわらず結果を残す。URLの打ち間違いに気づけるよう画面に出す
    await client
      .from('external_calendars')
      .update({ last_synced_at: new Date().toISOString(), last_error: failure })
      .eq('id', cal.id);

    results.push({ id: cal.id, label: cal.label, count, error: failure });
  }

  return jsonResponse({
    synced: results.filter((r) => r.error === null).length,
    results,
  });
});
