// Supabase Edge Function（Deno）で共有する土台。
//
// 【service_role キーを使わない】CLAUDE.md §3.5。
// クライアントから届いた**ユーザーの JWT** でクライアントを作れば、
// RLS（0003_rls.sql の current_team_id()）がそのまま効く。
// service_role を使うと RLS を無視できてしまい、チーム分離が壊れる。
//
// 【この2ファイルは Deno で動く】プロジェクト本体（Expo/React Native）とは
// 別のランタイム。`tsconfig.json` の exclude で本体の型チェックから外してある。

import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';

/** ブラウザ（web版）から呼ぶので CORS が要る。 */
export const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

export interface Caller {
  client: SupabaseClient;
  userId: string;
  teamId: string;
}

/**
 * 呼び出し元を確かめて、その人の権限で動くクライアントを返す。
 *
 * `members` 行が無い人（合言葉が済んでいない）は `current_team_id()` が NULL に
 * なるので、ここで弾く。以降のクエリはすべて RLS 経由で team_id 一致のものだけを触る。
 */
export async function authenticate(req: Request): Promise<Caller | Response> {
  const authorization = req.headers.get('Authorization');
  if (!authorization) return errorResponse('ログインが必要です', 401);

  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // anon キー。RLS を効かせるためであって、秘密ではない（CLAUDE.md §3.5）
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) return errorResponse('ログインが必要です', 401);

  const { data: member, error: memberError } = await client
    .from('members')
    .select('team_id')
    .eq('id', userData.user.id)
    .maybeSingle();

  if (memberError) return errorResponse(`メンバー情報を読めませんでした: ${memberError.message}`, 500);
  if (!member) return errorResponse('合言葉の入力がまだです', 403);

  return { client, userId: userData.user.id, teamId: member.team_id };
}
