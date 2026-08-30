// Gemini（Google の生成AI）を呼ぶところ。
//
// 【1ファイルに閉じ込めている理由】
// ユーザーの指定で Gemini を使う（無料枠があるため）が、日本語の要約の質や
// 料金の条件は変わりうる。**プロバイダ依存をこのファイルだけに閉じ込めておけば、
// 差し替えるときに触るのはここ1枚で済む**（`ai/index.ts` は素の関数を呼ぶだけ）。
//
// 【キー】`GEMINI_API_KEY` は Supabase のシークレット。
//   supabase secrets set GEMINI_API_KEY=...
// **アプリのバンドルには絶対に置かない**（CLAUDE.md §3.5）。

/**
 * 使うモデル。**ここ1か所だけ変えれば全用途が切り替わる。**
 * 無料枠の対象モデルと上限は変わるので、使う前に Google AI Studio の
 * 料金ページで確認すること（私には確認できない）。
 */
const MODEL = 'gemini-2.0-flash';

const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/** Gemini に渡す中身。テキストか、インラインの音声/データ。 */
export type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

export interface GenerateOptions {
  /** モデルへの指示。役割と守ってほしい制約を書く。 */
  system: string;
  parts: Part[];
  /**
   * JSON で返してほしいときのスキーマ（Gemini の responseSchema）。
   * 渡すと出力が必ずこの形になり、パース失敗をほぼ無くせる。
   */
  schema?: Record<string, unknown>;
}

export interface GenerateResult {
  text: string;
  /** `schema` を渡したときだけ入る。パースに失敗したら null。 */
  json: unknown | null;
}

export async function generate({ system, parts, schema }: GenerateOptions): Promise<GenerateResult> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY が設定されていません（supabase secrets set GEMINI_API_KEY=... が必要です）',
    );
  }

  const body: Record<string, unknown> = {
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: 'user', parts }],
    generationConfig: schema
      ? { responseMimeType: 'application/json', responseSchema: schema }
      : {},
  };

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    // 上限に当たったときに何が起きたか分かるよう、本文をそのまま返す
    throw new Error(`AIの呼び出しに失敗しました（${res.status}）: ${detail.slice(0, 500)}`);
  }

  const data = await res.json();
  const text: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';

  let json: unknown | null = null;
  if (schema) {
    try {
      json = JSON.parse(text);
    } catch {
      // responseSchema を付けても稀に壊れる。呼び出し側が null を見て諦められるようにする
      json = null;
    }
  }
  return { text, json };
}
