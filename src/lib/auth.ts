import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';

/**
 * ログイン状態と「メンバー登録済みか」を1箇所にまとめるフック。
 *
 * `_layout.tsx`（画面の出し分け）と `claim.tsx`（合言葉入力後にタブ画面へ
 * 進めるようにする）の2箇所が同じ状態を参照する必要があるため、ここに切り出した。
 *
 * ログインはできても、合言葉（`claim_membership`）を通るまでは
 * `members` 行が無い状態がありうる。その間は「ログイン済みだがメンバーではない」
 * という第3の状態になる（`supabase/migrations/0002_auth.sql` §「合言葉」参照）。
 */

export interface AuthState {
  /** undefined = 未確認。null = 未ログイン。 */
  session: Session | null | undefined;
  /** undefined = 未確認（session確定後に確認する）。 */
  hasMembership: boolean | undefined;
  /** 合言葉が通った直後などに呼び、メンバー登録状態を再確認する。 */
  refreshMembership: () => void;
}

export function useSession(): AuthState {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [hasMembership, setHasMembership] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => subscription.subscription.unsubscribe();
  }, []);

  const checkMembership = useCallback((userId: string) => {
    setHasMembership(undefined);
    supabase
      .from('members')
      .select('id')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setHasMembership(data !== null));
  }, []);

  useEffect(() => {
    if (session === undefined) return; // まだ確認中
    if (session === null) {
      setHasMembership(undefined); // 未ログインでは無関係な値
      return;
    }
    checkMembership(session.user.id);
  }, [session, checkMembership]);

  const refreshMembership = useCallback(() => {
    if (session) checkMembership(session.user.id);
  }, [session, checkMembership]);

  return { session, hasMembership, refreshMembership };
}
