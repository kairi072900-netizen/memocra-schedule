// 専用AI。5つの用途を1つの関数にまとめ、`task` で分岐する。
//
// 【デプロイ】
//   supabase secrets set GEMINI_API_KEY=...
//   supabase functions deploy ai
//
// 【1関数にまとめた理由】5つデプロイすると、更新のたびに5回叩くことになる。
// 用途ごとの違いはプロンプトと出力スキーマだけなので、分ける実利が薄い。
//
// 【いちばん大事な約束: AIの出力でDBを書き換えない】
// この関数は**結果を返すだけ**で、`projects` / `tasks` / `streams` を更新しない
// （`meetings` の保存だけはクライアントが別途行う）。
// 担当と締切を人が確定させることがこのアプリの目的そのものなので（CLAUDE.md §1）、
// AI が勝手に埋めると目的が崩れる。画面側も「フォームを埋めるだけ」「差分を見せて
// 適用ボタンを押させる」という作りにしてある。

import { authenticate, CORS_HEADERS, errorResponse, jsonResponse } from '../_shared/auth.ts';
import { generate, type Part } from '../_shared/gemini.ts';

/** 音声の署名URLの有効時間。Gemini に渡して読ませるだけなので短くてよい。 */
const AUDIO_URL_TTL_SEC = 600;

/** 音声ファイルの上限。無料枠と関数のメモリを守るための歯止め。 */
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const COMMON_RULES = `あなたはYouTube制作チームのスケジュール管理を手伝うアシスタントです。
- 日本語で答えます。
- 日付は必ず YYYY-MM-DD、時刻は HH:MM（24時間）で書きます。
- 分からないことは推測せず、空欄または null にします。
- 担当者を勝手に決めません。決まっていないものは未定のままにします。`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  const caller = await authenticate(req);
  if (caller instanceof Response) return caller;
  const { client } = caller;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse('リクエストの形式が正しくありません');
  }

  const task = String(body.task ?? '');

  try {
    switch (task) {
      case 'parse_schedule':
        return jsonResponse(await parseSchedule(body));
      case 'summarize_progress':
        return jsonResponse(await summarizeProgress(body));
      case 'brainstorm':
        return jsonResponse(await brainstorm(body));
      case 'replan':
        return jsonResponse(await replan(body));
      case 'minutes':
        return jsonResponse(await minutes(body, client));
      default:
        return errorResponse(`知らない用途です: ${task}`);
    }
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'AIの処理に失敗しました', 500);
  }
});

// ---------------------------------------------------------------------------
// 1. 自然文で予定・企画を登録する（結果はフォームを埋めるだけ）
// ---------------------------------------------------------------------------

async function parseSchedule(body: Record<string, unknown>) {
  const text = String(body.text ?? '').trim();
  if (text.length === 0) throw new Error('文章を入れてください');
  // 「来週の土曜」を解決するために今日の日付が要る。クライアントの現地日付を使う
  const today = String(body.todayKey ?? '');

  const { json } = await generate({
    system: `${COMMON_RULES}

ユーザーの短い文章から、登録したい予定を読み取ってJSONにしてください。
今日は ${today}（日本時間）です。「来週の土曜」などはここを基準に解決します。

mode の決め方:
- 生配信・雑談配信など、その場でやるもの → "stream"
- 動画の企画・撮影・公開など、制作するもの → "project"

kind は mode が "project" のときだけ使います（long=ロング動画 / short=ショート動画 /
sns=SNS投稿 / other=その他）。判断できなければ "long" にします。

時刻が書かれていなければ time は null にします（勝手に決めない）。`,
    parts: [{ text }],
    schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['project', 'stream'] },
        kind: { type: 'string', enum: ['long', 'short', 'sns', 'other'] },
        title: { type: 'string' },
        date: { type: 'string', nullable: true },
        time: { type: 'string', nullable: true },
        note: { type: 'string', nullable: true },
      },
      required: ['mode', 'title'],
    },
  });

  if (!json) throw new Error('文章をうまく読み取れませんでした');
  return json;
}

// ---------------------------------------------------------------------------
// 2. 進捗の要約と催促の下書き
// ---------------------------------------------------------------------------

async function summarizeProgress(body: Record<string, unknown>) {
  // クライアントが「見せてよい形」に整えたものだけを渡す（丸ごとのDBは投げない）
  const summary = String(body.summary ?? '').trim();
  if (summary.length === 0) throw new Error('渡すデータがありません');

  const { json } = await generate({
    system: `${COMMON_RULES}

チームの今の状況を渡します。次の2つを作ってください。

1. overview: 3行以内の状況まとめ。数字を必ず含める。
2. nudges: 声をかけたほうがよい相手ごとの、短い依頼文の下書き。
   - 責める書き方にしない。事実と依頼だけを書く。
   - 相手が決まっていない工程は、担当を決める相談として書く。
   - 何も急ぐものが無ければ空の配列にする。`,
    parts: [{ text: summary }],
    schema: {
      type: 'object',
      properties: {
        overview: { type: 'string' },
        nudges: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              to: { type: 'string' },
              message: { type: 'string' },
            },
            required: ['to', 'message'],
          },
        },
      },
      required: ['overview', 'nudges'],
    },
  });

  if (!json) throw new Error('うまくまとめられませんでした');
  return json;
}

// ---------------------------------------------------------------------------
// 3. 企画・タイトル・サムネ案の壁打ち（対話）
// ---------------------------------------------------------------------------

async function brainstorm(body: Record<string, unknown>) {
  const history = Array.isArray(body.history) ? body.history : [];
  const parts: Part[] = history
    .map((h) => (typeof h === 'string' ? { text: h } : null))
    .filter((p): p is { text: string } => p !== null);

  if (parts.length === 0) throw new Error('相談したいことを書いてください');

  const { text } = await generate({
    system: `${COMMON_RULES}

マインクラフトを中心に活動する4人組YouTuberの相談相手です。
企画のネタ、動画タイトル、サムネイルの文言について、具体的な案を出します。

- 案は3〜5個、箇条書きで。長い説明より数と具体性を優先します。
- 過激な釣りタイトルや、事実でないことを書く案は出しません。
- 撮影や編集の手間が現実的かどうかにも一言触れます。`,
    parts,
  });

  return { text };
}

// ---------------------------------------------------------------------------
// 4. 工程の自動調整（案を出すだけ。適用は人が押す）
// ---------------------------------------------------------------------------

async function replan(body: Record<string, unknown>) {
  const context = String(body.context ?? '').trim();
  if (context.length === 0) throw new Error('渡すデータがありません');

  const { json } = await generate({
    system: `${COMMON_RULES}

企画の工程一覧と、変えたい条件（公開日の変更、負荷の偏りなど）を渡します。
**適用はしません。案を出すだけです。**

- changes: 変更したほうがよい工程の一覧。工程のIDと、新しい締切・担当を書く。
  変えなくてよい工程は含めない。
- reason: なぜその案になるのかを2〜3行で。
- 担当の振り直しを提案するときは、渡されたメンバーの役割と活動時間帯を踏まえる。
- 誰に振ればよいか分からない工程は assignee_id を null（未定）にする。`,
    parts: [{ text: context }],
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string' },
        changes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              task_id: { type: 'string' },
              title: { type: 'string' },
              due_at: { type: 'string', nullable: true },
              assignee_id: { type: 'string', nullable: true },
              assignee_name: { type: 'string', nullable: true },
            },
            required: ['task_id', 'title'],
          },
        },
      },
      required: ['reason', 'changes'],
    },
  });

  if (!json) throw new Error('調整案を作れませんでした');
  return json;
}

// ---------------------------------------------------------------------------
// 5. 議事録（録音ファイル → 文字起こし・要約・決定事項・ToDo）
// ---------------------------------------------------------------------------

async function minutes(
  body: Record<string, unknown>,
  client: { storage: { from: (b: string) => { download: (p: string) => Promise<{ data: Blob | null; error: unknown }> } } },
) {
  const audioPath = typeof body.audioPath === 'string' ? body.audioPath : null;
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';

  const parts: Part[] = [];

  if (audioPath) {
    // Storage は private。呼び出した人の権限でダウンロードする（service_role は使わない）
    const { data, error } = await client.storage.from('meeting-audio').download(audioPath);
    if (error || !data) throw new Error('音声ファイルを読めませんでした');
    const bytes = new Uint8Array(await data.arrayBuffer());
    if (bytes.byteLength > MAX_AUDIO_BYTES) {
      throw new Error(
        `音声が大きすぎます（${Math.round(bytes.byteLength / 1024 / 1024)}MB）。20MB以内にしてください`,
      );
    }
    parts.push({
      inlineData: {
        mimeType: data.type && data.type.length > 0 ? data.type : 'audio/m4a',
        data: base64Of(bytes),
      },
    });
    parts.push({ text: 'この録音から議事録を作ってください。' });
  } else if (transcript.length > 0) {
    parts.push({ text: transcript });
  } else {
    throw new Error('音声ファイルか、文字起こしのテキストが要ります');
  }

  const { json } = await generate({
    system: `${COMMON_RULES}

会議の記録から議事録を作ります。

- transcript: 音声を渡された場合は、話した内容の書き起こし。テキストを渡された場合はそのまま返す。
- minutes: 何が話し合われたかの要約。5行以内。
- decisions: **決まったこと**だけ。決まらなかった話題は入れない。
- todos: 誰かがやると言ったこと。「誰が」が分かるなら文頭に書く。分からなければ書かない。
  **担当を推測して埋めないこと。**

聞き取れなかった部分は無理に補わず、その旨を書きます。`,
    parts,
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        transcript: { type: 'string' },
        minutes: { type: 'string' },
        decisions: { type: 'array', items: { type: 'string' } },
        todos: { type: 'array', items: { type: 'string' } },
      },
      required: ['minutes', 'decisions', 'todos'],
    },
  });

  if (!json) throw new Error('議事録を作れませんでした');
  return json;
}

/** バイト列を base64 に。大きめのファイルでスタックを溢れさせないよう分割して変換する。 */
function base64Of(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}
